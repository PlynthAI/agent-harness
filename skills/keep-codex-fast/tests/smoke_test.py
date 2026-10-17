#!/usr/bin/env python3
"""Smoke tests for keep-codex-fast using a fake Codex home."""

from __future__ import annotations

import argparse
import contextlib
import hashlib
import io
import importlib.util
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "keep_codex_fast.py"


def load_module():
    spec = importlib.util.spec_from_file_location("keep_codex_fast", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    sys.modules["keep_codex_fast"] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    module.codex_processes_running = lambda: []
    module.top_node_processes = lambda details=False: module.report("top_node_processes skipped_in_smoke")
    return module


def make_fake_home(root: Path) -> dict[str, Path]:
    codex_home = root / ".codex"
    sessions = codex_home / "sessions" / "2026" / "01" / "01"
    sessions.mkdir(parents=True)
    rollout = sessions / "rollout-2026-01-01T00-00-00-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jsonl"
    rollout.write_text('{"type":"test"}\n', encoding="utf-8")
    old_time = time.time() - 30 * 86400
    os.utime(rollout, (old_time, old_time))

    (codex_home / ".codex-global-state.json").write_text('{"pinned-thread-ids":[]}', encoding="utf-8")
    (codex_home / "config.toml").write_text(
        '[projects."C:\\\\DefinitelyMissingKeepCodexFast"]\ntrust_level = "trusted"\n',
        encoding="utf-8",
    )

    worktree = codex_home / "worktrees" / "oldtree"
    worktree.mkdir(parents=True)
    (worktree / "file.txt").write_text("x", encoding="utf-8")
    os.utime(worktree, (old_time, old_time))

    log_file = codex_home / "logs_2.sqlite"
    log_file.write_text("log", encoding="utf-8")

    state_db = codex_home / "state_5.sqlite"
    conn = sqlite3.connect(state_db)
    conn.execute(
        "create table threads (id text primary key, title text, rollout_path text, cwd text, updated_at integer, archived_at integer, archived integer)"
    )
    conn.execute(
        "insert into threads values (?,?,?,?,?,?,?)",
        (
            "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "Old test thread",
            str(rollout),
            r"\\?\C:\DefinitelyMissingKeepCodexFast",
            int(old_time),
            None,
            0,
        ),
    )
    conn.commit()
    conn.close()

    return {
        "codex_home": codex_home,
        "rollout": rollout,
        "worktree": worktree,
        "log_file": log_file,
        "state_db": state_db,
    }


def make_directory_link(link: Path, target: Path) -> bool:
    """Create a directory symlink or Windows junction; False when unsupported."""
    try:
        link.symlink_to(target, target_is_directory=True)
        return True
    except (OSError, NotImplementedError):
        pass
    try:
        import _winapi  # type: ignore[import-not-found]

        _winapi.CreateJunction(str(target), str(link))
        return True
    except Exception:
        return False


def register_git_worktree(repo: Path, worktree: Path) -> bool:
    """Create a real linked Git worktree; False when Git is unavailable."""
    if shutil.which("git") is None:
        return False

    def git(*args: str) -> subprocess.CompletedProcess:
        return subprocess.run(
            ["git", "-c", "commit.gpgsign=false", *args],
            text=True,
            capture_output=True,
            check=False,
        )

    if git("init", "-q", str(repo)).returncode != 0:
        return False
    for key, value in (("user.email", "smoke@example.invalid"), ("user.name", "Smoke Test")):
        if git("-C", str(repo), "config", key, value).returncode != 0:
            return False
    if git("-C", str(repo), "commit", "--allow-empty", "-q", "-m", "init").returncode != 0:
        return False
    return git("-C", str(repo), "worktree", "add", "-q", "--detach", str(worktree)).returncode == 0


def git_worktree_listing(repo: Path) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), "worktree", "list", "--porcelain"],
        text=True,
        capture_output=True,
        check=False,
    )
    return result.stdout if result.returncode == 0 else ""


def assert_report_mode(module) -> None:
    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        backup = Path(td) / "backup-report"
        args = argparse.Namespace(
            apply=False,
            backup_only=False,
            details=False,
            wait_for_codex_exit=False,
            codex_home=str(paths["codex_home"]),
            backup_root=str(backup),
            archive_older_than_days=10,
            worktree_older_than_days=7,
            rotate_logs_above_mb=0,
        )
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            assert module.run(args) == 0
        text = output.getvalue()
        assert paths["rollout"].exists(), "report mode must not move sessions"
        assert paths["worktree"].exists(), "report mode must not move worktrees"
        assert paths["log_file"].exists(), "report mode must not rotate logs"
        assert not backup.exists(), "report mode must not create backup artifacts"
        assert "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" not in text
        assert "Old test thread" not in text
        assert str(paths["codex_home"]) not in text


def assert_backup_only_mode(module) -> None:
    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        backup = Path(td) / "backup-only"
        args = argparse.Namespace(
            apply=False,
            backup_only=True,
            details=False,
            wait_for_codex_exit=False,
            codex_home=str(paths["codex_home"]),
            backup_root=str(backup),
            archive_older_than_days=10,
            worktree_older_than_days=7,
            rotate_logs_above_mb=0,
        )
        assert module.run(args) == 0
        assert paths["rollout"].exists(), "backup-only mode must not move sessions"
        assert paths["worktree"].exists(), "backup-only mode must not move worktrees"
        assert paths["log_file"].exists(), "backup-only mode must not rotate logs"
        assert (backup / "state_5.sqlite").exists()
        assert (backup / "config.toml").exists()
        assert not (backup / "moved-sessions.jsonl").exists()


def assert_session_alias_detection(module) -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        real_root = root / "real"
        alias_root = root / "alias"
        real_root.mkdir()
        try:
            alias_root.symlink_to(real_root, target_is_directory=True)
        except OSError:
            return

        paths = make_fake_home(real_root)
        alias_home = alias_root / ".codex"
        conn = module.sqlite_connect(alias_home / "state_5.sqlite", readonly=True)
        try:
            candidates = module.active_session_candidates(conn, alias_home, int(time.time()) - 10 * 86400)
        finally:
            conn.close()
        assert len(candidates) == 1


def assert_apply_mode(module) -> None:
    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        backup = Path(td) / "backup-apply"
        args = argparse.Namespace(
            apply=True,
            backup_only=False,
            details=False,
            wait_for_codex_exit=False,
            codex_home=str(paths["codex_home"]),
            backup_root=str(backup),
            archive_older_than_days=10,
            worktree_older_than_days=7,
            rotate_logs_above_mb=0,
        )
        assert module.run(args) == 0

        conn = sqlite3.connect(paths["state_db"])
        archived, archived_at, rollout_path, cwd = conn.execute(
            "select archived, archived_at, rollout_path, cwd from threads where id=?",
            ("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",),
        ).fetchone()
        conn.close()

        assert archived == 1
        assert archived_at is not None
        assert "archived_sessions" in rollout_path
        assert cwd == r"C:\DefinitelyMissingKeepCodexFast"
        assert not paths["rollout"].exists()
        assert paths["worktree"].exists(), "apply must not move worktrees"
        assert (paths["worktree"] / "file.txt").exists()
        assert not paths["log_file"].exists()
        assert "DefinitelyMissingKeepCodexFast" not in (paths["codex_home"] / "config.toml").read_text(
            encoding="utf-8"
        )
        assert (backup / "restore-sessions.py").exists()
        assert (backup / "moved-sessions.jsonl").exists()
        assert not (backup / "moved-worktrees.jsonl").exists()
        assert not (paths["codex_home"] / "archived_worktrees").exists()


def assert_worktree_retirement_route(module) -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        paths = make_fake_home(root)
        codex_home = paths["codex_home"]
        worktrees_root = codex_home / "worktrees"

        shared_target = root / "shared-data"
        shared_target.mkdir()
        (shared_target / "payload.txt").write_text("keep", encoding="utf-8")

        old_time = time.time() - 90 * 86400
        old_tree = paths["worktree"]  # worktrees/oldtree, already aged by make_fake_home
        fresh_tree = worktrees_root / "freshtree"
        fresh_tree.mkdir(parents=True)
        (fresh_tree / "note.txt").write_text("fresh", encoding="utf-8")

        # A link entry directly in the pool, plus one inside a real candidate.
        pool_link = worktrees_root / "linked-checkout"
        pool_link_created = make_directory_link(pool_link, shared_target)
        inner_link = old_tree / "shared-data"
        inner_link_created = make_directory_link(inner_link, shared_target)

        # A Windows junction needs no administrator rights, so exercise it too.
        junction_target = root / "junction-target"
        junction_target.mkdir()
        (junction_target / "payload.txt").write_text("keep", encoding="utf-8")
        junction_link = worktrees_root / "junction-checkout"
        junction_created = False
        try:
            import _winapi  # type: ignore[import-not-found]

            _winapi.CreateJunction(str(junction_target), str(junction_link))
            junction_created = True
        except Exception:
            pass
        module.report(
            f"worktree_route_links symlink={pool_link_created} junction={junction_created}"
        )

        repo = root / "repo"
        git_tree = worktrees_root / "gitoldtree"
        git_registered = register_git_worktree(repo, git_tree)
        if git_registered:
            (git_tree / "tracked.txt").write_text("tracked", encoding="utf-8")
            os.utime(git_tree, (old_time, old_time))
        else:
            module.report("worktree_git_registration skipped_git_unavailable")
        os.utime(old_tree, (old_time, old_time))
        os.utime(fresh_tree, (time.time(), time.time()))

        expected_candidates = 3 if git_registered else 2
        expected_linked = (1 if pool_link_created else 0) + (1 if junction_created else 0)

        def assert_state_intact(label: str) -> None:
            assert old_tree.exists(), f"{label}: old worktree must remain"
            assert (old_tree / "file.txt").exists(), f"{label}: old worktree files must remain"
            assert fresh_tree.exists(), f"{label}: fresh worktree must remain"
            if pool_link_created:
                assert pool_link.exists(), f"{label}: pool link entry must remain"
            if junction_created:
                assert module.is_link_like(junction_link), f"{label}: junction must read as a link"
                assert module.scan_entry_kind(
                    next(e for e in os.scandir(worktrees_root) if e.name == junction_link.name)
                ) == "link", f"{label}: junction must not count as a candidate"
                assert (junction_target / "payload.txt").exists(), f"{label}: junction target must remain"
            if inner_link_created:
                assert inner_link.exists(), f"{label}: link entry must remain"
                assert (shared_target / "payload.txt").read_text(encoding="utf-8") == "keep"
                assert (inner_link / "payload.txt").exists(), f"{label}: link target must stay reachable"
            if git_registered:
                assert git_tree.exists(), f"{label}: registered worktree directory must remain"
                listing = git_worktree_listing(repo)
                assert str(git_tree) in listing or git_tree.as_posix() in listing, (
                    f"{label}: Git registration must remain"
                )
                registration = repo / ".git" / "worktrees"
                assert registration.is_dir() and any(registration.iterdir())

        def run_worktree_scope(apply: bool, days: int, backup_name: str) -> str:
            args = argparse.Namespace(
                apply=apply,
                backup_only=False,
                details=False,
                sessions_only=False,
                wait_for_codex_exit=False,
                codex_home=str(codex_home),
                backup_root=str(root / backup_name),
                archive_older_than_days=10,
                worktree_older_than_days=days,
                rotate_logs_above_mb=64,
            )
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                assert module.run(args) == 0
            return output.getvalue()

        backup_names = []
        for apply in (False, True):
            for days in (7, 10_000):
                label = f"apply={apply} days={days}"
                backup_names.append(f"backup-{apply}-{days}")
                text = run_worktree_scope(apply, days, backup_names[-1])
                assert f"worktree_candidates {expected_candidates}" in text, label
                assert f"worktree_linked_entries {expected_linked}" in text, label
                assert "worktree_candidates 0" not in text, label
                assert "worktree_age_eligibility none" in text, label
                assert "worktree_moves disabled" in text, label
                assert "worktree_sizing not_assessed" in text, label
                assert "size_worktrees_gb not_assessed" in text, label
                assert "out_of_scope_use_shared_inventory" in text, label
                assert "../delivery/references/worktree-retirement.md" in text, label
                assert_state_intact(label)

        assert not (codex_home / "archived_worktrees").exists()
        for backup_name in backup_names:
            assert not (root / backup_name / "moved-worktrees.jsonl").exists(), backup_name

        # A pool whose own root is a link must not be walked at all.
        linked_home = root / "linked-home" / ".codex"
        linked_home.mkdir(parents=True)
        real_pool = linked_home / "real-worktrees"
        real_pool.mkdir()
        (real_pool / "candidate").mkdir()
        (real_pool / "candidate" / "file.txt").write_text("x", encoding="utf-8")
        if make_directory_link(linked_home / "worktrees", real_pool):
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                module.report_worktree_retirement(linked_home, root / "backup-linked", 7, "stamp", False)
            text = output.getvalue()
            assert "worktree_scan skipped_linked_ancestor" in text
            assert "worktree_candidates" not in text
            assert "worktree_sizing not_assessed" in text
            assert (real_pool / "candidate" / "file.txt").exists()


def assert_sessions_only_containment(module, *, apply: bool) -> None:
    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        rollout_hash = hashlib.sha256(paths["rollout"].read_bytes()).hexdigest()
        backup = Path(td) / ("backup-sessions-apply" if apply else "backup-sessions-report")
        prohibited = [
            "backup_metadata",
            "normalize_sqlite_paths",
            "prune_config",
            "report_worktree_retirement",
            "rotate_logs",
            "verify_sizes",
            "top_node_processes",
        ]
        originals = {name: getattr(module, name) for name in prohibited}

        def prohibited_call(*_args, **_kwargs):
            raise AssertionError("non-session function called in --sessions-only mode")

        for name in prohibited:
            setattr(module, name, prohibited_call)
        try:
            args = argparse.Namespace(
                apply=apply,
                backup_only=False,
                details=False,
                sessions_only=True,
                wait_for_codex_exit=False,
                codex_home=str(paths["codex_home"]),
                backup_root=str(backup),
                archive_older_than_days=10,
                worktree_older_than_days=7,
                rotate_logs_above_mb=0,
            )
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                assert module.run(args) == 0
        finally:
            for name, original in originals.items():
                setattr(module, name, original)

        text = output.getvalue()
        assert "maintenance_scope sessions_only" in text
        assert paths["worktree"].exists()
        assert paths["log_file"].exists()
        assert "DefinitelyMissingKeepCodexFast" in (paths["codex_home"] / "config.toml").read_text(
            encoding="utf-8"
        )
        assert "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" not in text
        assert "Old test thread" not in text
        assert str(paths["codex_home"]) not in text
        if apply:
            assert not paths["rollout"].exists()
            assert (backup / "state_5.sqlite").exists()
            assert (backup / "moved-sessions.jsonl").exists()
            assert (backup / "restore-sessions.py").exists()
            payloads = list((backup / "session-payloads").rglob("*.jsonl"))
            assert len(payloads) == 1
            assert hashlib.sha256(payloads[0].read_bytes()).hexdigest() == rollout_hash
            planned = [
                json.loads(line)
                for line in (backup / "moved-sessions.jsonl").read_text(encoding="utf-8").splitlines()
                if json.loads(line).get("event") == "planned"
            ]
            assert len(planned) == 1
            assert planned[0]["relative"].endswith(".jsonl")
            assert planned[0]["sha256"] == hashlib.sha256(payloads[0].read_bytes()).hexdigest()
            assert not (backup / "config.toml").exists()
            assert not (backup / "moved-worktrees.jsonl").exists()

            conn = sqlite3.connect(paths["state_db"])
            archived, archived_at, rollout_path, cwd = conn.execute(
                "select archived, archived_at, rollout_path, cwd from threads where id=?",
                ("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",),
            ).fetchone()
            conn.close()
            assert archived == 1
            assert archived_at is not None
            assert "archived_sessions" in rollout_path
            assert cwd == r"\\?\C:\DefinitelyMissingKeepCodexFast"
        else:
            assert paths["rollout"].exists()
            assert not backup.exists()


def assert_sessions_only_candidate_semantics(module) -> None:
    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        codex_home = paths["codex_home"]
        sessions_root = codex_home / "sessions" / "2026" / "01" / "02"
        sessions_root.mkdir(parents=True)
        old_time = int(time.time() - 30 * 86400)
        new_time = int(time.time() - 86400)
        rows = []
        for label, updated_at, archived_at in [
            ("pinned", old_time, None),
            ("newer", new_time, None),
            ("archived", old_time, old_time),
        ]:
            thread_id = f"{label:0<8}-1111-1111-1111-111111111111"
            rollout = sessions_root / f"rollout-{label}-{thread_id}.jsonl"
            rollout.write_text('{"type":"test"}\n', encoding="utf-8")
            rows.append((thread_id, label, str(rollout), updated_at, archived_at, int(archived_at is not None)))
        pinned_id = rows[0][0]
        (codex_home / ".codex-global-state.json").write_text(
            '{"pinned-thread-ids":["' + pinned_id + '"]}', encoding="utf-8"
        )
        conn = sqlite3.connect(paths["state_db"])
        conn.executemany(
            "insert into threads (id,title,rollout_path,cwd,updated_at,archived_at,archived) values (?,?,?,NULL,?,?,?)",
            rows,
        )
        conn.commit()
        conn.close()

        backup = Path(td) / "backup-candidate-semantics"
        args = argparse.Namespace(
            apply=True,
            backup_only=False,
            details=False,
            sessions_only=True,
            wait_for_codex_exit=False,
            codex_home=str(codex_home),
            backup_root=str(backup),
            archive_older_than_days=10,
            worktree_older_than_days=7,
            rotate_logs_above_mb=0,
        )
        assert module.run(args) == 0

        conn = sqlite3.connect(paths["state_db"])
        states = dict(conn.execute("select id, archived from threads").fetchall())
        conn.close()
        assert states["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"] == 1
        assert states[pinned_id] == 0
        assert states[rows[1][0]] == 0
        assert states[rows[2][0]] == 1


def assert_sessions_only_apply_requires_codex_exit(module) -> None:
    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        backup = Path(td) / "backup-running"
        original = module.codex_processes_running
        module.codex_processes_running = lambda: ["123 Codex.exe"]
        try:
            args = argparse.Namespace(
                apply=True,
                backup_only=False,
                details=False,
                sessions_only=True,
                wait_for_codex_exit=False,
                codex_home=str(paths["codex_home"]),
                backup_root=str(backup),
                archive_older_than_days=10,
                worktree_older_than_days=7,
                rotate_logs_above_mb=0,
            )
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                assert module.run(args) == 3
        finally:
            module.codex_processes_running = original

        text = output.getvalue()
        assert "apply_aborted codex_running" in text
        assert "123 Codex.exe" not in text
        assert paths["rollout"].exists()
        assert not backup.exists()
        conn = sqlite3.connect(paths["state_db"])
        archived = conn.execute(
            "select archived from threads where id=?",
            ("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",),
        ).fetchone()[0]
        conn.close()
        assert archived == 0


def session_only_args(paths, backup: Path | None, **overrides):
    values = dict(
        apply=True,
        backup_only=False,
        details=False,
        sessions_only=True,
        wait_for_codex_exit=False,
        codex_home=str(paths["codex_home"]),
        backup_root=str(backup) if backup is not None else None,
        archive_older_than_days=10,
        worktree_older_than_days=7,
        rotate_logs_above_mb=0,
    )
    values.update(overrides)
    return argparse.Namespace(**values)


def add_old_session(paths, thread_id: str, content: str = '{"type":"second"}\n') -> Path:
    rollout = paths["codex_home"] / "sessions" / "2026" / "01" / "02" / f"rollout-{thread_id}.jsonl"
    rollout.parent.mkdir(parents=True, exist_ok=True)
    rollout.write_text(content, encoding="utf-8")
    old_time = int(time.time() - 30 * 86400)
    conn = sqlite3.connect(paths["state_db"])
    conn.execute(
        "insert into threads values (?,?,?,?,?,?,?)",
        (thread_id, "Second old thread", str(rollout), "C:\\repo", old_time, None, 0),
    )
    conn.commit()
    conn.close()
    return rollout


def assert_pinned_state_fails_closed(module) -> None:
    states = [None, "{", "{}", '{"pinned-thread-ids":"not-a-list"}', '{"pinned-thread-ids":[1]}']
    for index, state in enumerate(states):
        with tempfile.TemporaryDirectory() as td:
            paths = make_fake_home(Path(td))
            pinned_path = paths["codex_home"] / ".codex-global-state.json"
            if state is None:
                pinned_path.unlink()
            else:
                pinned_path.write_text(state, encoding="utf-8")
            backup = Path(td) / f"backup-pinned-{index}"
            assert module.run(session_only_args(paths, backup)) == 4
            assert paths["rollout"].exists()
            assert not (backup / "moved-sessions.jsonl").exists()


def assert_process_detection_failures_abort(module) -> None:
    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        backup = Path(td) / "backup-process-failure"
        original = module.codex_processes_running
        module.codex_processes_running = lambda: (_ for _ in ()).throw(RuntimeError("unavailable"))
        try:
            assert module.run(session_only_args(paths, backup)) == 3
        finally:
            module.codex_processes_running = original
        assert paths["rollout"].exists()
        assert not backup.exists()

    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        backup = Path(td) / "backup-post-wait"
        calls = []
        original_detect = module.codex_processes_running
        original_wait = module.wait_for_codex_exit

        def still_running():
            calls.append(1)
            return ["123 Codex.exe"]

        module.codex_processes_running = still_running
        module.wait_for_codex_exit = lambda: None
        try:
            assert module.run(session_only_args(paths, backup, wait_for_codex_exit=True)) == 3
        finally:
            module.codex_processes_running = original_detect
            module.wait_for_codex_exit = original_wait
        assert len(calls) == 2, "apply must explicitly recheck after waiting"
        assert paths["rollout"].exists()
        assert not backup.exists()


def assert_null_updated_at_and_backup_root_fail_closed(module) -> None:
    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        null_rollout = add_old_session(paths, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
        conn = sqlite3.connect(paths["state_db"])
        conn.execute(
            "update threads set updated_at=NULL where id=?",
            ("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",),
        )
        conn.commit()
        conn.close()
        backup = Path(td) / "backup-null-updated"
        assert module.run(session_only_args(paths, backup)) == 4
        assert paths["rollout"].exists() and null_rollout.exists()
        assert not (backup / "moved-sessions.jsonl").exists()

    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        assert module.run(session_only_args(paths, None)) == 3
        assert paths["rollout"].exists()


def assert_cold_sqlite_family_backup(module) -> None:
    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        wal = paths["codex_home"] / "state_5.sqlite-wal"
        shm = paths["codex_home"] / "state_5.sqlite-shm"
        wal.write_bytes(b"synthetic-wal")
        shm.write_bytes(b"synthetic-shm")
        backup = Path(td) / "cold-family"
        module.backup_session_metadata(paths["codex_home"], backup)
        assert (backup / "state_5.sqlite").read_bytes() == paths["state_db"].read_bytes()
        assert (backup / "state_5.sqlite-wal").read_bytes() == b"synthetic-wal"
        assert (backup / "state_5.sqlite-shm").read_bytes() == b"synthetic-shm"


def assert_payload_backup_failures_prevent_moves(module) -> None:
    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        backup = Path(td) / "backup-no-space"
        original = module.shutil.disk_usage
        zero_space = original(Path(td))._replace(free=0)
        module.shutil.disk_usage = lambda _path: zero_space
        try:
            assert module.run(session_only_args(paths, backup)) == 4
        finally:
            module.shutil.disk_usage = original
        assert paths["rollout"].exists()

    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        backup = Path(td) / "backup-corrupt-copy"
        original = module.shutil.copy2

        def corrupt_payload_copy(source, dest, *args, **kwargs):
            result = original(source, dest, *args, **kwargs)
            if str(source).endswith(".jsonl"):
                Path(dest).write_text("corrupt", encoding="utf-8")
            return result

        module.shutil.copy2 = corrupt_payload_copy
        try:
            assert module.run(session_only_args(paths, backup)) == 4
        finally:
            module.shutil.copy2 = original
        assert paths["rollout"].exists()
        conn = sqlite3.connect(paths["state_db"])
        assert conn.execute("select archived from threads").fetchone()[0] == 0
        conn.close()


def assert_interrupted_archive_rolls_back(module) -> None:
    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        second = add_old_session(paths, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
        backup = Path(td) / "backup-interrupted"
        original = module.shutil.move
        archive_moves = 0

        def fail_second_archive_move(source, dest, *args, **kwargs):
            nonlocal archive_moves
            if "archived_sessions" in str(dest):
                archive_moves += 1
                manifest = backup / "moved-sessions.jsonl"
                planned = [
                    json.loads(line)
                    for line in manifest.read_text(encoding="utf-8").splitlines()
                    if json.loads(line).get("event") == "planned"
                ]
                assert len(planned) == 2
                assert (backup / "restore-sessions.py").exists()
                assert len(list((backup / "session-payloads").rglob("*.jsonl"))) == 2
                if archive_moves == 2:
                    raise OSError("synthetic interruption")
            return original(source, dest, *args, **kwargs)

        module.shutil.move = fail_second_archive_move
        try:
            assert module.run(session_only_args(paths, backup)) == 4
        finally:
            module.shutil.move = original
        assert paths["rollout"].exists() and second.exists()
        conn = sqlite3.connect(paths["state_db"])
        assert set(conn.execute("select archived from threads").fetchall()) == {(0,)}
        conn.close()
        events = [json.loads(line)["event"] for line in (backup / "moved-sessions.jsonl").read_text(encoding="utf-8").splitlines()]
        assert "rollback_completed" in events


def assert_restore_integrity_guards(module) -> None:
    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        backup = Path(td) / "backup-restore"
        assert module.run(session_only_args(paths, backup)) == 0
        result = subprocess.run(
            [sys.executable, str(backup / "restore-sessions.py")],
            text=True,
            capture_output=True,
            check=False,
        )
        assert result.returncode == 0, result.stderr
        assert paths["rollout"].exists()
        conn = sqlite3.connect(paths["state_db"])
        assert conn.execute("select archived, archived_at from threads").fetchone() == (0, None)
        conn.close()

    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        backup = Path(td) / "backup-restore-collision"
        assert module.run(session_only_args(paths, backup)) == 0
        planned = next(
            json.loads(line)
            for line in (backup / "moved-sessions.jsonl").read_text(encoding="utf-8").splitlines()
            if json.loads(line).get("event") == "planned"
        )
        Path(planned["from"]).parent.mkdir(parents=True, exist_ok=True)
        Path(planned["from"]).write_bytes(Path(planned["backup"]).read_bytes())
        result = subprocess.run(
            [sys.executable, str(backup / "restore-sessions.py")],
            text=True,
            capture_output=True,
            check=False,
        )
        assert result.returncode != 0
        assert Path(planned["to"]).exists(), "collision refusal must not move the archive"

    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        backup = Path(td) / "backup-restore-db-count"
        assert module.run(session_only_args(paths, backup)) == 0
        planned = next(
            json.loads(line)
            for line in (backup / "moved-sessions.jsonl").read_text(encoding="utf-8").splitlines()
            if json.loads(line).get("event") == "planned"
        )
        conn = sqlite3.connect(paths["state_db"])
        conn.execute("delete from threads where id=?", (planned["thread_id"],))
        conn.commit()
        conn.close()
        result = subprocess.run(
            [sys.executable, str(backup / "restore-sessions.py")],
            text=True,
            capture_output=True,
            check=False,
        )
        assert result.returncode != 0
        assert Path(planned["to"]).exists(), "DB row-count refusal must precede the restore move"

    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        backup = Path(td) / "backup-restore-payload-fallback"
        assert module.run(session_only_args(paths, backup)) == 0
        planned = next(
            json.loads(line)
            for line in (backup / "moved-sessions.jsonl").read_text(encoding="utf-8").splitlines()
            if json.loads(line).get("event") == "planned"
        )
        Path(planned["to"]).unlink()
        result = subprocess.run(
            [sys.executable, str(backup / "restore-sessions.py")],
            text=True,
            capture_output=True,
            check=False,
        )
        assert result.returncode == 0, result.stderr
        assert hashlib.sha256(Path(planned["from"]).read_bytes()).hexdigest() == planned["sha256"]
        conn = sqlite3.connect(paths["state_db"])
        assert conn.execute("select archived, archived_at from threads").fetchone() == (0, None)
        conn.close()


def assert_cutoff_is_frozen_once(module) -> None:
    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        backup = Path(td) / "backup-cutoff"
        calls = []
        original = module.utc_now_epoch
        module.utc_now_epoch = lambda: calls.append(2_000_000_000) or 2_000_000_000
        try:
            assert module.run(session_only_args(paths, backup)) == 0
        finally:
            module.utc_now_epoch = original
        assert calls == [2_000_000_000]
        planned = next(
            json.loads(line)
            for line in (backup / "moved-sessions.jsonl").read_text(encoding="utf-8").splitlines()
            if json.loads(line).get("event") == "planned"
        )
        assert planned["cutoff_utc_epoch"] == 2_000_000_000 - 10 * 86400


def assert_keyboard_interrupt_rolls_back(module) -> None:
    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        second = add_old_session(paths, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
        backup = Path(td) / "backup-keyboard-interrupt"
        original = module.shutil.move
        archive_moves = 0

        def interrupt_second_move(source, dest, *args, **kwargs):
            nonlocal archive_moves
            if "archived_sessions" in str(dest):
                archive_moves += 1
                if archive_moves == 2:
                    raise KeyboardInterrupt()
            return original(source, dest, *args, **kwargs)

        module.shutil.move = interrupt_second_move
        try:
            try:
                module.run(session_only_args(paths, backup))
                raise AssertionError("KeyboardInterrupt must be re-raised after rollback")
            except KeyboardInterrupt:
                pass
        finally:
            module.shutil.move = original
        assert paths["rollout"].exists() and second.exists()
        conn = sqlite3.connect(paths["state_db"])
        assert set(conn.execute("select archived, archived_at from threads").fetchall()) == {(0, None)}
        conn.close()


def assert_state_backup_hash_verification(module) -> None:
    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        backup = Path(td) / "backup-corrupt-state"
        original = module.shutil.copy2

        def corrupt_state_copy(source, dest, *args, **kwargs):
            result = original(source, dest, *args, **kwargs)
            if Path(source).name == "state_5.sqlite":
                with Path(dest).open("ab") as handle:
                    handle.write(b"corrupt")
            return result

        module.shutil.copy2 = corrupt_state_copy
        try:
            assert module.run(session_only_args(paths, backup)) == 4
        finally:
            module.shutil.copy2 = original
        assert paths["rollout"].exists()
        assert not (backup / "moved-sessions.jsonl").exists()


def assert_pre_move_admission_drift(module) -> None:
    def run_copy_drift(kind: str) -> None:
        with tempfile.TemporaryDirectory() as td:
            paths = make_fake_home(Path(td))
            backup = Path(td) / f"backup-drift-{kind}"
            original = module.shutil.copy2
            triggered = False

            def drift_after_payload(source, dest, *args, **kwargs):
                nonlocal triggered
                result = original(source, dest, *args, **kwargs)
                if not triggered and "session-payloads" in str(dest):
                    triggered = True
                    if kind == "recent":
                        conn = sqlite3.connect(paths["state_db"])
                        conn.execute(
                            "update threads set updated_at=? where id=?",
                            (int(time.time()), "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                        )
                        conn.commit()
                        conn.close()
                    elif kind == "pinned":
                        (paths["codex_home"] / ".codex-global-state.json").write_text(
                            '{"pinned-thread-ids":["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"]}',
                            encoding="utf-8",
                        )
                    else:
                        with Path(source).open("ab") as handle:
                            handle.write(b"drift")
                return result

            module.shutil.copy2 = drift_after_payload
            try:
                assert module.run(session_only_args(paths, backup)) == 4
            finally:
                module.shutil.copy2 = original
            assert paths["rollout"].exists()
            conn = sqlite3.connect(paths["state_db"])
            assert conn.execute("select archived from threads").fetchone()[0] == 0
            conn.close()

    for kind in ["recent", "pinned", "source"]:
        run_copy_drift(kind)

    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        backup = Path(td) / "backup-process-reopen"
        original = module.codex_processes_running
        calls = 0

        def reopen_after_backup():
            nonlocal calls
            calls += 1
            return [] if calls == 1 else ["123 Codex.exe"]

        module.codex_processes_running = reopen_after_backup
        try:
            assert module.run(session_only_args(paths, backup)) == 4
        finally:
            module.codex_processes_running = original
        assert calls == 2
        assert paths["rollout"].exists()


def assert_unsafe_candidate_shapes_abort_apply(module) -> None:
    def run_case(kind: str) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            paths = make_fake_home(root)
            if kind == "missing":
                paths["rollout"].unlink()
            elif kind == "blank":
                conn = sqlite3.connect(paths["state_db"])
                conn.execute("update threads set rollout_path='' ")
                conn.commit()
                conn.close()
            elif kind == "nonregular":
                paths["rollout"].unlink()
                paths["rollout"].mkdir()
            elif kind == "outside":
                outside = root / "outside-rollout.jsonl"
                outside.write_text('{"type":"outside"}\n', encoding="utf-8")
                conn = sqlite3.connect(paths["state_db"])
                conn.execute("update threads set rollout_path=?", (str(outside),))
                conn.commit()
                conn.close()
            elif kind == "duplicate":
                old_time = int(time.time() - 30 * 86400)
                conn = sqlite3.connect(paths["state_db"])
                conn.execute(
                    "insert into threads values (?,?,?,?,?,?,?)",
                    (
                        "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                        "Duplicate",
                        str(paths["rollout"]),
                        "C:\\repo",
                        old_time,
                        None,
                        0,
                    ),
                )
                conn.commit()
                conn.close()
            elif kind == "archived-inconsistent":
                conn = sqlite3.connect(paths["state_db"])
                conn.execute("update threads set archived=1, archived_at=NULL")
                conn.commit()
                conn.close()
            backup = root / f"backup-unsafe-{kind}"
            assert module.run(session_only_args(paths, backup)) == 4
            assert not (backup / "moved-sessions.jsonl").exists()

    for kind in ["missing", "blank", "nonregular", "outside", "duplicate", "archived-inconsistent"]:
        run_case(kind)

    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        paths["rollout"].unlink()
        backup = Path(td) / "report-unsafe"
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            assert module.run(session_only_args(paths, backup, apply=False)) == 0
        assert "session_candidate_anomalies 1" in output.getvalue()
        assert not backup.exists()


def assert_sessions_only_backup_root_must_be_new(module) -> None:
    with tempfile.TemporaryDirectory() as td:
        paths = make_fake_home(Path(td))
        backup = Path(td) / "existing-backup"
        backup.mkdir()
        assert module.run(session_only_args(paths, backup)) == 3
        assert list(backup.iterdir()) == []
        assert paths["rollout"].exists()


def assert_protected_active_aliases_abort(module) -> None:
    for protected_kind in ["pinned", "newer"]:
        with tempfile.TemporaryDirectory() as td:
            paths = make_fake_home(Path(td))
            protected_id = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
            protected_updated_at = (
                int(time.time() - 30 * 86400)
                if protected_kind == "pinned"
                else int(time.time())
            )
            conn = sqlite3.connect(paths["state_db"])
            conn.execute(
                "insert into threads values (?,?,?,?,?,?,?)",
                (
                    protected_id,
                    f"{protected_kind} alias",
                    str(paths["rollout"]),
                    "C:\\protected",
                    protected_updated_at,
                    None,
                    0,
                ),
            )
            conn.commit()
            before_rows = conn.execute(
                "select id, rollout_path, updated_at, archived_at, archived from threads order by id"
            ).fetchall()
            conn.close()
            if protected_kind == "pinned":
                (paths["codex_home"] / ".codex-global-state.json").write_text(
                    '{"pinned-thread-ids":["' + protected_id + '"]}',
                    encoding="utf-8",
                )
            before_hash = hashlib.sha256(paths["rollout"].read_bytes()).hexdigest()
            backup = Path(td) / f"backup-{protected_kind}-alias"
            assert module.run(session_only_args(paths, backup)) == 4
            assert paths["rollout"].exists()
            assert hashlib.sha256(paths["rollout"].read_bytes()).hexdigest() == before_hash
            assert not (backup / "moved-sessions.jsonl").exists()
            conn = sqlite3.connect(paths["state_db"])
            after_rows = conn.execute(
                "select id, rollout_path, updated_at, archived_at, archived from threads order by id"
            ).fetchall()
            conn.close()
            assert after_rows == before_rows


def main() -> int:
    module = load_module()
    assert_report_mode(module)
    assert_backup_only_mode(module)
    assert_session_alias_detection(module)
    assert_apply_mode(module)
    assert_worktree_retirement_route(module)
    assert_sessions_only_containment(module, apply=False)
    assert_sessions_only_containment(module, apply=True)
    assert_sessions_only_candidate_semantics(module)
    assert_sessions_only_apply_requires_codex_exit(module)
    assert_pinned_state_fails_closed(module)
    assert_process_detection_failures_abort(module)
    assert_null_updated_at_and_backup_root_fail_closed(module)
    assert_cold_sqlite_family_backup(module)
    assert_payload_backup_failures_prevent_moves(module)
    assert_interrupted_archive_rolls_back(module)
    assert_restore_integrity_guards(module)
    assert_cutoff_is_frozen_once(module)
    assert_keyboard_interrupt_rolls_back(module)
    assert_state_backup_hash_verification(module)
    assert_pre_move_admission_drift(module)
    assert_unsafe_candidate_shapes_abort_apply(module)
    assert_sessions_only_backup_root_must_be_new(module)
    assert_protected_active_aliases_abort(module)
    print("smoke tests passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
