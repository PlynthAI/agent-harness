#!/usr/bin/env python3
"""Backup-first Codex local-state maintenance.

Default mode is a read-only, privacy-safe report. Use --apply to archive
sessions, rotate logs and normalize local state. Worktree retirement is
report-only and routes to the shared delivery reference; this tool never moves
or deletes a worktree.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import re
import shutil
import sqlite3
import stat
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


THREAD_ID_RE = re.compile(
    r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})",
    re.I,
)
PROJECT_HEADER_RE = re.compile(r"^\[projects\.([\"'])(.+)\1\]\s*$")
TEMP_PROJECT_RE = re.compile(
    r"(\\AppData\\Local\\Temp\\|/AppData/Local/Temp/|\\Temp\\codex-|/Temp/codex-|\\Temp\\spark-|/Temp/spark-)",
    re.I,
)
WORKTREE_RETIREMENT_REFERENCE = "../delivery/references/worktree-retirement.md"


@dataclass
class SessionCandidate:
    size: int
    thread_id: str
    title: str
    source: Path
    relative: Path
    updated_at: int | None
    db_rollout_path: str


class MaintenanceSafetyError(RuntimeError):
    """Raised when maintenance cannot prove a required safety condition."""


def now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def utc_now_epoch() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def codex_home_from_args(value: str | None) -> Path:
    if value:
        return Path(value).expanduser().resolve()
    override = os.environ.get("CODEX_HOME")
    if override:
        return Path(override).expanduser().resolve()
    return Path.home() / ".codex"


def documents_backup_root() -> Path:
    docs = Path.home() / "Documents" / "Codex" / "codex-backups"
    if docs.parent.exists() or platform.system() == "Windows":
        return docs
    return Path.home() / ".codex" / "backups"


def is_link_like(path: Path) -> bool:
    """True for a symlink or Windows reparse point, without following it."""
    try:
        entry_stat = path.lstat()
    except OSError:
        return False
    if stat.S_ISLNK(entry_stat.st_mode):
        return True
    attributes = getattr(entry_stat, "st_file_attributes", 0)
    return bool(attributes & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0))


def scan_entry_kind(entry: os.DirEntry) -> str:
    """Classify a directory entry as link, dir, file or other without following links."""
    if entry.is_symlink():
        return "link"
    try:
        entry_stat = entry.stat(follow_symlinks=False)
    except OSError:
        return "unreadable"
    attributes = getattr(entry_stat, "st_file_attributes", 0)
    if attributes & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0):
        return "link"
    if stat.S_ISDIR(entry_stat.st_mode):
        return "dir"
    if stat.S_ISREG(entry_stat.st_mode):
        return "file"
    return "other"


def size_bytes(path: Path) -> int:
    """Apparent size of real files under *path*, never following links.

    A symlink or junction - including *path* itself - is skipped rather than
    traversed, so a shared data or cache root reached through a link is not
    read or measured.
    """
    if is_link_like(path):
        return 0
    try:
        path_stat = path.lstat()
    except OSError:
        return 0
    if stat.S_ISREG(path_stat.st_mode):
        return path_stat.st_size
    total = 0
    stack = [path]
    while stack:
        current = stack.pop()
        try:
            entries = list(os.scandir(current))
        except OSError:
            continue
        for entry in entries:
            kind = scan_entry_kind(entry)
            if kind == "dir":
                stack.append(Path(entry.path))
            elif kind == "file":
                try:
                    total += entry.stat(follow_symlinks=False).st_size
                except OSError:
                    pass
    return total


def gb(value: int) -> str:
    return f"{value / 1024 / 1024 / 1024:.3f}"


def mb(value: int) -> str:
    return f"{value / 1024 / 1024:.1f}"


def report(line: str) -> None:
    print(line)


def sqlite_connect(path: Path, *, readonly: bool) -> sqlite3.Connection:
    if readonly:
        return sqlite3.connect(f"{canonical_path(path).as_uri()}?mode=ro", uri=True)
    return sqlite3.connect(path)


def canonical_path(path: Path) -> Path:
    try:
        return path.resolve(strict=False)
    except OSError:
        return path.absolute()


def codex_processes_running() -> list[str]:
    system = platform.system()
    if system == "Windows":
        output = subprocess.check_output(
            ["powershell", "-NoProfile", "-Command", "Get-CimInstance Win32_Process | Select-Object Name,ProcessId,CommandLine | ConvertTo-Json -Compress"],
            text=True,
            stderr=subprocess.PIPE,
        )
        if not output.strip():
            return []
        data = json.loads(output)
        rows = data if isinstance(data, list) else [data]
        hits = []
        for row in rows:
            if not isinstance(row, dict):
                raise MaintenanceSafetyError("process detection returned an invalid row")
            name = str(row.get("Name") or "")
            cmd = str(row.get("CommandLine") or "")
            pid = row.get("ProcessId")
            if name == "Codex.exe" or (name == "codex.exe" and ("app-server" in cmd or "OpenAI.Codex" in cmd)):
                hits.append(f"{pid} {name}")
        return hits
    output = subprocess.check_output(["ps", "-axo", "pid=,comm=,args="], text=True, stderr=subprocess.PIPE)
    hits = []
    for line in output.splitlines():
        lower = line.lower()
        if "codex" in lower and ("app-server" in lower or "openai.codex" in lower or "codex desktop" in lower):
            hits.append(line.strip())
    return hits


def wait_for_codex_exit() -> None:
    while codex_processes_running():
        time.sleep(2)


def sqlite_backup(src: Path, dst: Path) -> None:
    if not src.exists():
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    source = sqlite_connect(src, readonly=True)
    target = sqlite3.connect(dst)
    source.backup(target)
    target.close()
    source.close()


def copy_if_exists(src: Path, dst: Path) -> None:
    if not src.exists():
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    if src.is_dir():
        shutil.copytree(
            src,
            dst,
            ignore=shutil.ignore_patterns(
                "node_modules",
                ".git",
                ".next",
                "dist",
                "build",
                ".venv",
                "__pycache__",
                ".pytest_cache",
            ),
            dirs_exist_ok=True,
        )
    else:
        shutil.copy2(src, dst)
    report(f"backed_up {src.name}")


def backup_metadata(codex_home: Path, backup_root: Path) -> None:
    backup_root.mkdir(parents=True, exist_ok=True)
    for name in [
        ".codex-global-state.json",
        "config.toml",
        "history.jsonl",
        "installation_id",
        "models_cache.json",
        "session_index.jsonl",
        "version.json",
        "memories",
        "skills",
        "rules",
        "plugins",
        "automations",
    ]:
        copy_if_exists(codex_home / name, backup_root / name)
    sqlite_backup(codex_home / "state_5.sqlite", backup_root / "state_5.sqlite")


def backup_session_metadata(codex_home: Path, backup_root: Path) -> None:
    """Back up only metadata needed to recover session archival changes."""
    backup_root.mkdir(parents=True, exist_ok=True)
    for name in [
        ".codex-global-state.json",
        "history.jsonl",
        "session_index.jsonl",
    ]:
        copy_verified_file(codex_home / name, backup_root / name)
    for name in ["state_5.sqlite", "state_5.sqlite-wal", "state_5.sqlite-shm"]:
        copy_verified_file(codex_home / name, backup_root / name)


def copy_verified_file(src: Path, dst: Path) -> None:
    if not src.exists():
        return
    if not src.is_file():
        raise MaintenanceSafetyError("session metadata backup source is not a regular file")
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    if sha256_file(src) != sha256_file(dst):
        raise MaintenanceSafetyError("session metadata backup identity verification failed")
    report(f"backed_up {src.name}")


def load_pinned_snapshot(codex_home: Path) -> tuple[set[str], str]:
    path = codex_home / ".codex-global-state.json"
    try:
        raw = path.read_bytes()
        data = json.loads(raw.decode("utf-8"))
    except Exception as exc:
        raise MaintenanceSafetyError("pinned state is missing or invalid") from exc
    if not isinstance(data, dict) or "pinned-thread-ids" not in data:
        raise MaintenanceSafetyError("pinned state schema is invalid")
    pinned = data["pinned-thread-ids"]
    if not isinstance(pinned, list) or any(not isinstance(item, str) or not item for item in pinned):
        raise MaintenanceSafetyError("pinned state schema is invalid")
    return set(pinned), hashlib.sha256(raw).hexdigest()


def load_pinned(codex_home: Path) -> set[str]:
    return load_pinned_snapshot(codex_home)[0]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalize_extended_path(value: str) -> str:
    if value.startswith("\\\\?\\UNC\\"):
        return "\\\\" + value[8:]
    if value.startswith("\\\\?\\"):
        return value[4:]
    return value


def normalize_sqlite_paths(conn: sqlite3.Connection, apply: bool) -> int:
    cur = conn.cursor()
    total = 0
    tables = [
        row[0]
        for row in cur.execute(
            "select name from sqlite_master where type='table' and name not like 'sqlite_%'"
        )
    ]
    for table in tables:
        cols = cur.execute(f'pragma table_info("{table}")').fetchall()
        text_cols = [col[1] for col in cols if "TEXT" in (col[2] or "").upper() or col[2] == ""]
        for col in text_cols:
            rows = cur.execute(
                f'select rowid, "{col}" from "{table}" where "{col}" like ?',
                ("\\\\?\\%",),
            ).fetchall()
            changed = 0
            for rowid, value in rows:
                if isinstance(value, str) and value.startswith("\\\\?\\"):
                    changed += 1
                    if apply:
                        cur.execute(
                            f'update "{table}" set "{col}"=? where rowid=?',
                            (normalize_extended_path(value), rowid),
                        )
            if changed:
                report(f"extended_paths {table}.{col} {changed}")
                total += changed
    if total == 0:
        report("extended_paths 0")
    return total


def active_session_candidates(
    conn: sqlite3.Connection,
    codex_home: Path,
    cutoff_epoch: int,
    *,
    pinned: set[str] | None = None,
    strict: bool = False,
) -> list[SessionCandidate]:
    sessions_root = codex_home / "sessions"
    sessions_root_canonical = canonical_path(sessions_root)
    if pinned is None:
        pinned = load_pinned(codex_home)
    rows = conn.execute(
        "select id, title, rollout_path, updated_at, archived_at, archived from threads"
    ).fetchall()
    candidates: list[SessionCandidate] = []
    anomalies = 0
    active_rows: list[tuple[object, ...]] = []
    active_source_counts: dict[Path, int] = {}
    for thread_id, title, rollout_path, updated_at, archived_at, archived in rows:
        active = archived_at is None and archived in (None, 0)
        archived_consistent = archived_at is not None and bool(archived)
        if not active and not archived_consistent:
            anomalies += 1
            continue
        if not active:
            continue
        active_rows.append((thread_id, title, rollout_path, updated_at))
        if isinstance(rollout_path, str) and rollout_path.strip():
            source_canonical = canonical_path(Path(rollout_path))
            active_source_counts[source_canonical] = active_source_counts.get(source_canonical, 0) + 1

    duplicate_sources = {
        source for source, count in active_source_counts.items() if count > 1
    }
    anomalies += len(duplicate_sources)

    for thread_id, title, rollout_path, updated_at in active_rows:
        if thread_id in pinned:
            continue
        if updated_at is None:
            anomalies += 1
            continue
        if int(updated_at) >= cutoff_epoch:
            continue
        if not isinstance(rollout_path, str) or not rollout_path.strip():
            anomalies += 1
            continue
        source = Path(rollout_path)
        if not source.exists() or not source.is_file():
            anomalies += 1
            continue
        source_canonical = canonical_path(source)
        try:
            relative = source_canonical.relative_to(sessions_root_canonical)
        except ValueError:
            anomalies += 1
            continue
        if source_canonical in duplicate_sources:
            continue
        candidates.append(
            SessionCandidate(
                source.stat().st_size,
                thread_id,
                title or "",
                source,
                relative,
                int(updated_at),
                rollout_path,
            )
        )
    if anomalies:
        report(f"session_candidate_anomalies {anomalies}")
        if strict:
            raise MaintenanceSafetyError("session candidate state is unsafe")
    candidates.sort(key=lambda item: item.size, reverse=True)
    return candidates


def archive_sessions(
    conn: sqlite3.Connection,
    candidates: list[SessionCandidate],
    codex_home: Path,
    backup_root: Path,
    stamp: str,
    apply: bool,
    details: bool,
    cutoff_epoch: int,
    operation_epoch: int,
    pinned: set[str],
    pinned_digest: str,
    privacy_safe: bool = False,
    backup_payloads: bool = False,
) -> None:
    total = sum(item.size for item in candidates)
    report(f"old_session_candidates {len(candidates)}")
    report(f"old_session_candidate_gb {gb(total)}")
    for index, item in enumerate(candidates[:10], start=1):
        label = f"session_{index:03d}"
        if details:
            report(f"large_session_mb {mb(item.size)} {label} thread_id={item.thread_id} title={item.title[:70]}")
        else:
            report(f"large_session_mb {mb(item.size)} {label}")
    if not apply or not candidates:
        return

    archive_root = codex_home / "archived_sessions" / f"keep-codex-fast-{stamp}"
    manifest = backup_root / "moved-sessions.jsonl"
    payload_root = backup_root / "session-payloads"
    plan: list[dict[str, object]] = []
    for item in candidates:
        source = canonical_path(item.source)
        dest = archive_root / item.relative
        payload_backup = payload_root / item.relative if backup_payloads else None
        if dest.exists() or (payload_backup is not None and payload_backup.exists()):
            raise MaintenanceSafetyError("session archive or payload backup destination already exists")
        before = source.stat()
        digest = sha256_file(source)
        after = source.stat()
        if before.st_size != after.st_size or before.st_mtime_ns != after.st_mtime_ns:
            raise MaintenanceSafetyError("session changed while candidate identity was frozen")
        plan.append(
            {
                "event": "planned",
                "thread_id": item.thread_id,
                "bytes": after.st_size,
                "sha256": digest,
                "relative": item.relative.as_posix(),
                "from": str(source),
                "db_rollout_path": item.db_rollout_path,
                "to": str(dest),
                "backup": str(payload_backup) if payload_backup is not None else None,
                "updated_at": item.updated_at,
                "cutoff_utc_epoch": cutoff_epoch,
            }
        )

    if backup_payloads:
        required = sum(int(record["bytes"]) for record in plan)
        if shutil.disk_usage(backup_root).free < required:
            raise MaintenanceSafetyError("insufficient free space for candidate rollout backup")

    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest_tmp = manifest.with_suffix(".jsonl.tmp")
    if manifest.exists() or manifest_tmp.exists():
        raise MaintenanceSafetyError("session manifest destination already exists")
    with manifest_tmp.open("x", encoding="utf-8") as handle:
        for record in plan:
            handle.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(manifest_tmp, manifest)

    if backup_payloads:
        for record in plan:
            source = Path(str(record["from"]))
            payload_backup = Path(str(record["backup"]))
            payload_backup.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, payload_backup)
            if sha256_file(source) != record["sha256"] or sha256_file(payload_backup) != record["sha256"]:
                raise MaintenanceSafetyError("candidate rollout backup identity verification failed")

    write_session_restore_script(
        manifest,
        codex_home / "state_5.sqlite",
        backup_root,
        privacy_safe=privacy_safe,
    )
    if backup_payloads:
        _verify_session_apply_admission(
            conn,
            codex_home,
            candidates,
            plan,
            cutoff_epoch,
            pinned,
            pinned_digest,
        )
    archived_at = operation_epoch
    cur = conn.cursor()
    moved = False
    try:
        if not conn.in_transaction:
            conn.execute("begin immediate")
        archive_root.mkdir(parents=True, exist_ok=True)
        for record in plan:
            source = Path(str(record["from"]))
            dest = Path(str(record["to"]))
            if not source.exists() or dest.exists() or sha256_file(source) != record["sha256"]:
                raise MaintenanceSafetyError("candidate changed before archive move")
            _append_manifest_event(manifest, {"event": "move_started", "thread_id": record["thread_id"]})
            dest.parent.mkdir(parents=True, exist_ok=True)
            moved = True
            shutil.move(str(source), str(dest))
            if source.exists() or not dest.exists() or sha256_file(dest) != record["sha256"]:
                raise MaintenanceSafetyError("archived rollout identity verification failed")
            _append_manifest_event(manifest, {"event": "move_completed", "thread_id": record["thread_id"]})
            cur.execute(
                "update threads set rollout_path=?, archived=1, archived_at=? "
                "where id=? and rollout_path=? and archived_at is null",
                (str(dest), archived_at, record["thread_id"], str(source)),
            )
            if cur.rowcount != 1:
                raise MaintenanceSafetyError("session database row changed during archive")
        conn.commit()
    except BaseException as exc:
        conn.rollback()
        rollback_errors = _rollback_archived_files(plan, manifest) if moved else []
        if rollback_errors:
            raise MaintenanceSafetyError("archive failed and file rollback was incomplete") from exc
        raise
    if privacy_safe and not details:
        report("archived_sessions_root created")
        report("archived_sessions_manifest created")
    else:
        report(f"archived_sessions_root {archive_root}")
        report(f"archived_sessions_manifest {manifest}")


def _append_manifest_event(manifest: Path, event: dict[str, object]) -> None:
    with manifest.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, ensure_ascii=False, sort_keys=True) + "\n")
        handle.flush()
        os.fsync(handle.fileno())


def _rollback_archived_files(plan: list[dict[str, object]], manifest: Path) -> list[str]:
    errors: list[str] = []
    for record in reversed(plan):
        source = Path(str(record["from"]))
        dest = Path(str(record["to"]))
        try:
            if source.exists() and dest.exists():
                raise MaintenanceSafetyError("rollback collision")
            if dest.exists():
                if sha256_file(dest) != record["sha256"]:
                    raise MaintenanceSafetyError("rollback source identity mismatch")
                source.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(dest), str(source))
            if not source.exists() or sha256_file(source) != record["sha256"]:
                raise MaintenanceSafetyError("rollback destination identity mismatch")
            _append_manifest_event(manifest, {"event": "rollback_completed", "thread_id": record["thread_id"]})
        except Exception as exc:
            errors.append(str(exc))
    return errors


def _verify_session_apply_admission(
    conn: sqlite3.Connection,
    codex_home: Path,
    frozen_candidates: list[SessionCandidate],
    plan: list[dict[str, object]],
    cutoff_epoch: int,
    pinned: set[str],
    pinned_digest: str,
) -> None:
    if codex_processes_running():
        raise MaintenanceSafetyError("Codex reopened before session archive")
    current_pinned, current_digest = load_pinned_snapshot(codex_home)
    if current_digest != pinned_digest or current_pinned != pinned:
        raise MaintenanceSafetyError("pinned session state changed before archive")

    current_candidates = active_session_candidates(
        conn,
        codex_home,
        cutoff_epoch,
        pinned=current_pinned,
        strict=True,
    )
    frozen_identity = [
        (item.thread_id, item.db_rollout_path, item.updated_at) for item in frozen_candidates
    ]
    current_identity = [
        (item.thread_id, item.db_rollout_path, item.updated_at) for item in current_candidates
    ]
    if current_identity != frozen_identity:
        raise MaintenanceSafetyError("session candidate set changed before archive")

    for record in plan:
        rows = conn.execute(
            "select rollout_path, updated_at, archived_at, archived from threads where id=?",
            (record["thread_id"],),
        ).fetchall()
        if len(rows) != 1:
            raise MaintenanceSafetyError("session database identity changed before archive")
        rollout_path, updated_at, archived_at, archived = rows[0]
        if (
            rollout_path != record["db_rollout_path"]
            or updated_at != record["updated_at"]
            or archived_at is not None
            or archived not in (None, 0)
        ):
            raise MaintenanceSafetyError("session database state changed before archive")
        source = Path(str(record["from"]))
        if (
            not source.is_file()
            or source.stat().st_size != record["bytes"]
            or sha256_file(source) != record["sha256"]
        ):
            raise MaintenanceSafetyError("session rollout identity changed before archive")


def write_session_restore_script(
    manifest: Path,
    state_db: Path,
    backup_root: Path,
    *,
    privacy_safe: bool = False,
) -> None:
    restore = backup_root / "restore-sessions.py"
    restore.write_text(
        f'''import hashlib
import json
import shutil
import sqlite3
from pathlib import Path

def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

manifest = Path(r"{manifest}")
db = Path(r"{state_db}")
plan = [json.loads(line) for line in manifest.read_text(encoding="utf-8").splitlines()]
plan = [rec for rec in plan if rec.get("event") == "planned"]
if not plan:
    raise SystemExit("restore refused: manifest has no planned sessions")

for rec in plan:
    source = Path(rec["from"])
    archived = Path(rec["to"])
    backup = Path(rec["backup"]) if rec.get("backup") else None
    if source.exists() and archived.exists():
        raise SystemExit("restore refused: source/archive collision")
    if backup is not None and (not backup.exists() or sha256_file(backup) != rec["sha256"]):
        raise SystemExit("restore refused: payload backup missing or identity mismatch")
    present = archived if archived.exists() else source if source.exists() else backup
    if present is None or sha256_file(present) != rec["sha256"]:
        raise SystemExit("restore refused: rollout missing or identity mismatch")

conn = sqlite3.connect(db)
conn.execute("pragma busy_timeout=10000")
restored = []
try:
    conn.execute("begin immediate")
    for rec in plan:
        source = Path(rec["from"])
        archived = Path(rec["to"])
        backup = Path(rec["backup"]) if rec.get("backup") else None
        row = conn.execute(
            "select rollout_path, archived, archived_at from threads where id=?",
            (rec["thread_id"],),
        ).fetchall()
        if len(row) != 1:
            raise RuntimeError("restore refused: affected DB row count is not one")
        row_is_archived = row[0][0] == str(archived) and bool(row[0][1]) and row[0][2] is not None
        row_is_active = row[0][0] == str(source) and not row[0][1] and row[0][2] is None
        if row_is_archived:
            if archived.exists():
                source.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(archived), str(source))
            elif not source.exists():
                if backup is None:
                    raise RuntimeError("restore refused: archived rollout is missing")
                source.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(backup, source)
            if not source.exists() or sha256_file(source) != rec["sha256"]:
                raise RuntimeError("restore failed: restored rollout identity mismatch")
            restored.append(rec)
            cur = conn.execute(
                "update threads set rollout_path=?, archived=0, archived_at=NULL "
                "where id=? and rollout_path=? and archived_at is not null",
                (str(source), rec["thread_id"], str(archived)),
            )
            if cur.rowcount != 1:
                raise RuntimeError("restore failed: affected DB update count is not one")
        elif row_is_active:
            if not source.exists() or sha256_file(source) != rec["sha256"]:
                raise RuntimeError("restore refused: active DB row has no matching rollout")
        else:
            raise RuntimeError("restore refused: source and DB state disagree")
    conn.commit()
except Exception:
    conn.rollback()
    for rec in reversed(restored):
        source = Path(rec["from"])
        archived = Path(rec["to"])
        if archived.exists() or not source.exists() or sha256_file(source) != rec["sha256"]:
            raise RuntimeError("restore rollback refused: collision or identity mismatch")
        archived.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(source), str(archived))
    raise
finally:
    conn.close()
''',
        encoding="utf-8",
    )
    report("session_restore_script created" if privacy_safe else f"session_restore_script {restore}")


def prune_config(codex_home: Path, backup_root: Path, apply: bool, write_artifacts: bool) -> None:
    path = codex_home / "config.toml"
    if not path.exists():
        report("config_prune_candidates 0")
        return
    lines = path.read_text(encoding="utf-8-sig").splitlines()
    out: list[str] = []
    removed: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        match = PROJECT_HEADER_RE.match(line)
        if not match:
            out.append(line)
            i += 1
            continue
        project_path = match.group(2)
        block = [line]
        i += 1
        while i < len(lines) and not lines[i].startswith("["):
            block.append(lines[i])
            i += 1
        should_remove = bool(TEMP_PROJECT_RE.search(project_path)) or not Path(project_path).exists()
        if should_remove:
            removed.append(project_path)
        else:
            out.extend(block)

    if write_artifacts:
        (backup_root / "pruned-projects.txt").write_text(
            "\n".join(removed) + ("\n" if removed else ""),
            encoding="utf-8",
        )
    report(f"config_prune_candidates {len(removed)}")
    if apply and removed:
        path.write_text("\n".join(out) + "\n", encoding="utf-8")
        report("config_pruned applied")


def report_worktree_retirement(codex_home: Path, backup_root: Path, days: int, stamp: str, apply: bool) -> None:
    """Report candidate worktrees without moving or deleting them.

    Retiring a worktree is an authorised, per-worktree operation owned by the
    shared delivery reference, not an age-based sweep of a shared pool. Moving
    the directory with ``shutil.move`` breaks Git and app ownership of the
    checkout, and there is no safe fallback delete. This route therefore never
    mutates the filesystem: it reports what exists under
    ``$CODEX_HOME/worktrees`` and routes the reader to
    ``../delivery/references/worktree-retirement.md``.

    The scan never follows a link. The pool root and the path components this
    module composes are lstat-checked first, and each entry is classified
    without following it, so a symlink or junction that reaches a shared data
    root is counted as a link entry instead of being read, sized or moved.
    Candidate size is not assessed here; a shared read-only inventory covers
    custom roots and real measurements.

    ``backup_root``, ``days``, ``stamp`` and ``apply`` are accepted only so the
    call site and the deprecated ``--worktree-older-than-days`` flag stay
    compatible. None of them grants move, archive or delete eligibility, and no
    age threshold is applied to candidates.
    """
    del backup_root, days, stamp, apply  # retained for signature compatibility only
    root = codex_home / "worktrees"
    report(f"worktree_retirement reference {WORKTREE_RETIREMENT_REFERENCE}")
    report("worktree_age_eligibility none")
    report("worktree_scope codex_home/worktrees_only")
    report("worktree_custom_roots out_of_scope_use_shared_inventory")
    report("worktree_moves disabled")
    report("worktree_sizing not_assessed")
    if is_link_like(codex_home) or is_link_like(root):
        report("worktree_scan skipped_linked_ancestor")
        return
    try:
        entries = list(os.scandir(root))
    except FileNotFoundError:
        report("worktree_candidates 0")
        return
    except NotADirectoryError:
        report("worktree_scan skipped_not_a_directory")
        return
    except OSError:
        report("worktree_scan skipped_unreadable_root")
        return
    candidates = 0
    linked = 0
    unreadable = 0
    for entry in entries:
        kind = scan_entry_kind(entry)
        if kind == "dir":
            candidates += 1
        elif kind == "link":
            linked += 1
        elif kind == "unreadable":
            unreadable += 1
    report(f"worktree_candidates {candidates}")
    report(f"worktree_linked_entries {linked}")
    report(f"worktree_unreadable_entries {unreadable}")


def rotate_logs(codex_home: Path, threshold_mb: int, stamp: str, apply: bool) -> None:
    files = [path for path in codex_home.glob("logs_2.sqlite*") if path.is_file()]
    total = sum(path.stat().st_size for path in files)
    report(f"logs_mb {mb(total)}")
    if total < threshold_mb * 1024 * 1024:
        report("logs_rotate skipped_below_threshold")
        return
    if apply and files:
        archive_root = codex_home / "archived_logs" / f"keep-codex-fast-{stamp}"
        archive_root.mkdir(parents=True, exist_ok=True)
        for path in files:
            shutil.move(str(path), str(archive_root / path.name))
        report(f"logs_archive_root {archive_root}")


def top_node_processes(details: bool) -> None:
    system = platform.system()
    report("top_node_processes")
    try:
        if system == "Windows":
            command = (
                "Get-Process node -ErrorAction SilentlyContinue | "
                "Sort-Object WorkingSet64 -Descending | Select-Object -First 10 "
                "Id,ProcessName,@{n='MB';e={[math]::Round($_.WorkingSet64/1MB,1)}},Path | "
                "ConvertTo-Json -Compress"
            )
            output = subprocess.check_output(["powershell", "-NoProfile", "-Command", command], text=True)
            if not output.strip():
                return
            data = json.loads(output)
            rows = data if isinstance(data, list) else [data]
            for row in rows:
                if details:
                    report(f"node_mb {row.get('MB')} pid={row.get('Id')} path={row.get('Path')}")
                else:
                    report(f"node_mb {row.get('MB')} process=node")
            return
        output = subprocess.check_output(["ps", "-axo", "pid=,rss=,comm=,args="], text=True)
        rows = []
        for line in output.splitlines():
            parts = line.strip().split(None, 3)
            if len(parts) >= 3 and "node" in parts[2].lower():
                rows.append((int(parts[1]), line.strip()))
        for rss, line in sorted(rows, reverse=True)[:10]:
            if details:
                report(f"node_mb {rss / 1024:.1f} {line}")
            else:
                report(f"node_mb {rss / 1024:.1f} process=node")
    except Exception as exc:
        report(f"node_process_report_skipped {exc}")


def verify_sizes(codex_home: Path) -> None:
    for rel in ["sessions", "archived_sessions", "worktrees", "archived_worktrees", "archived_logs"]:
        path = codex_home / rel
        if not path.exists():
            continue
        if rel in {"worktrees", "archived_worktrees"}:
            # The worktree pools can hold links to shared data roots. Do not
            # walk them for a number this tool no longer acts on.
            report(f"size_{rel}_gb not_assessed")
            continue
        report(f"size_{rel}_gb {gb(size_bytes(path))}")


def verify_session_sizes(codex_home: Path) -> None:
    for rel in ["sessions", "archived_sessions"]:
        path = codex_home / rel
        if path.exists():
            report(f"size_{rel}_gb {gb(size_bytes(path))}")


def run(args: argparse.Namespace) -> int:
    codex_home = codex_home_from_args(args.codex_home)
    if not codex_home.exists():
        report(f"codex_home_missing {codex_home}")
        return 2

    sessions_only = bool(getattr(args, "sessions_only", False))
    stamp = now_stamp()
    if args.archive_older_than_days < 0:
        report("maintenance_aborted invalid_archive_threshold")
        return 3
    if sessions_only and args.apply and not args.backup_root:
        report("apply_aborted explicit_backup_root_required")
        return 3
    backup_root = Path(args.backup_root).expanduser() if args.backup_root else documents_backup_root() / f"keep-codex-fast-{stamp}"
    backup_root = backup_root.resolve()
    if sessions_only and args.apply and backup_root.exists():
        report("apply_aborted backup_root_must_be_new")
        return 3

    try:
        running = codex_processes_running()
        if args.apply and running and args.wait_for_codex_exit:
            report("waiting_for_codex_exit")
            wait_for_codex_exit()
            running = codex_processes_running()
    except Exception:
        report("process_detection_failed")
        if args.apply:
            report("apply_aborted process_state_unknown")
            return 3
        running = []

    if args.apply and running:
        report("apply_aborted codex_running")
        for index, proc in enumerate(running, start=1):
            if args.details:
                report(f"blocking_process {proc}")
            else:
                report(f"blocking_process codex_process_{index:03d}")
        return 3

    effective_apply = bool(args.apply)
    effective_backup = bool(effective_apply or args.backup_only)
    requested_mode = "apply" if args.apply else "backup-only" if args.backup_only else "report"
    effective_mode = "apply" if effective_apply else "backup-only" if effective_backup else "report"
    if args.details:
        report(f"codex_home {codex_home}")
        if effective_backup:
            report(f"backup_root {backup_root}")
    elif effective_backup and not sessions_only:
        report(f"backup_root {backup_root}")
    report(f"requested_mode {requested_mode}")
    report(f"effective_mode {effective_mode}")
    report(f"maintenance_scope {'sessions_only' if sessions_only else 'full'}")
    if effective_mode == "report":
        report("mode_safety read_only=true privacy=pseudonymous")
    elif effective_mode == "backup-only":
        report("mode_safety backup_only=true archives=false state_writes=false")
    else:
        report("mode_safety backup_first=true archive_only=true permanent_delete=false")
    operation_epoch = utc_now_epoch()
    cutoff_epoch = operation_epoch - args.archive_older_than_days * 24 * 60 * 60
    conn: sqlite3.Connection | None = None
    try:
        state_db = codex_home / "state_5.sqlite"
        if state_db.exists():
            pinned, pinned_digest = load_pinned_snapshot(codex_home)
        if effective_backup:
            if sessions_only:
                backup_session_metadata(codex_home, backup_root)
            else:
                backup_metadata(codex_home, backup_root)
        if state_db.exists():
            conn = sqlite_connect(state_db, readonly=not effective_apply)
            conn.execute("pragma busy_timeout=10000")
            if not sessions_only:
                normalize_sqlite_paths(conn, effective_apply)
            candidates = active_session_candidates(
                conn,
                codex_home,
                cutoff_epoch,
                pinned=pinned,
                strict=bool(effective_apply and sessions_only),
            )
            archive_sessions(
                conn,
                candidates,
                codex_home,
                backup_root,
                stamp,
                effective_apply,
                args.details,
                cutoff_epoch,
                operation_epoch,
                pinned,
                pinned_digest,
                privacy_safe=sessions_only,
                backup_payloads=sessions_only,
            )
            if effective_apply and not sessions_only:
                conn.commit()
                try:
                    conn.execute("pragma wal_checkpoint(truncate)")
                except Exception as exc:
                    report(f"wal_checkpoint_skipped {exc}")
                try:
                    conn.execute("pragma optimize")
                except Exception as exc:
                    report(f"sqlite_optimize_skipped {exc}")
        else:
            report("state_db_missing")
            if effective_apply:
                raise MaintenanceSafetyError("state database is missing")
    except Exception as exc:
        if conn is not None and conn.in_transaction:
            conn.rollback()
        report(f"maintenance_aborted {type(exc).__name__}")
        return 4
    finally:
        if conn is not None:
            conn.close()

    if sessions_only:
        verify_session_sizes(codex_home)
    else:
        prune_config(codex_home, backup_root, effective_apply, effective_backup)
        report_worktree_retirement(codex_home, backup_root, args.worktree_older_than_days, stamp, effective_apply)
        rotate_logs(codex_home, args.rotate_logs_above_mb, stamp, effective_apply)
        verify_sizes(codex_home)
        top_node_processes(args.details)
    report("done")
    return 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Safe, backup-first, archive-only Codex local-state maintenance."
    )
    parser.add_argument("--apply", action="store_true", help="Apply maintenance actions. Default is report-only.")
    parser.add_argument(
        "--backup-only",
        action="store_true",
        help="Create backups without applying maintenance actions. Default report mode writes no files.",
    )
    parser.add_argument(
        "--details",
        action="store_true",
        help="Include raw thread IDs, titles, paths, and process paths in output.",
    )
    parser.add_argument(
        "--sessions-only",
        action="store_true",
        help="Limit report/backup/apply to sessions; skip path, config, worktree, log, and process maintenance.",
    )
    parser.add_argument("--wait-for-codex-exit", action="store_true", help="Wait until Codex exits before applying.")
    parser.add_argument("--codex-home", help="Override Codex home. Defaults to CODEX_HOME or ~/.codex.")
    parser.add_argument("--backup-root", help="Override backup output folder.")
    parser.add_argument("--archive-older-than-days", type=int, default=10)
    parser.add_argument(
        "--worktree-older-than-days",
        type=int,
        default=7,
        help="Deprecated and ignored for eligibility. Worktree retirement is report-only and routes to the shared delivery reference; this flag is accepted for compatibility only.",
    )
    parser.add_argument("--rotate-logs-above-mb", type=int, default=64)
    args = parser.parse_args(argv)
    if args.apply and args.backup_only:
        parser.error("--apply and --backup-only cannot be used together")
    return args


if __name__ == "__main__":
    raise SystemExit(run(parse_args(sys.argv[1:])))
