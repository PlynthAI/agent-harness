"""Read-only, review-oriented inventory of local Codex worktree directories.

This is evidence for a cleanup review, never a retirement decision.
"""

import argparse
import json
import ntpath
import os
from pathlib import Path
import sqlite3
import stat
import subprocess
import sys


GIT_TIMEOUT_SECONDS = 15
ASSOCIATION_SAMPLE_LIMIT = 25


def windows_path(value):
    """Normalize Windows paths lexically; never resolve a link target."""
    value = str(value).replace("/", "\\")
    if value.startswith("\\\\?\\UNC\\"):
        value = "\\\\" + value[8:]
    elif value.startswith("\\\\?\\"):
        value = value[4:]
    if not ntpath.isabs(value):
        raise ValueError(f"not an absolute Windows path: {value}")
    normalized = ntpath.normcase(ntpath.normpath(value))
    return normalized if ntpath.dirname(normalized) == normalized else normalized.rstrip("\\")


def contains(parent, child):
    return child == parent or child.startswith(parent.rstrip("\\") + "\\")


def overlaps(left, right):
    return contains(left, right) or contains(right, left)


def path_problem(path):
    """Check every ancestor without following a reparse point or symlink."""
    for part in reversed((path, *path.parents)):
        try:
            info = part.lstat()
        except OSError as exc:
            return f"{part}: {type(exc).__name__}: {exc.strerror or exc}"
        if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & 0x400:
            return f"{part}: link or reparse point"
    return None


def read_state(db_path):
    """Read both tables in one SQLite snapshot through a read-only URI."""
    if path_problem(db_path):
        raise RuntimeError(f"state database path unavailable: {path_problem(db_path)}")
    connection = sqlite3.connect(db_path.as_uri() + "?mode=ro", uri=True)
    try:
        connection.execute("PRAGMA query_only=ON")
        connection.execute("BEGIN")
        threads = connection.execute(
            "SELECT id, cwd, archived, source, agent_path, agent_role FROM threads"
        ).fetchall()
        attachments = connection.execute(
            "SELECT a.thread_id, a.identity_key, a.attachment_type, t.archived, "
            "t.source, t.agent_path, t.agent_role FROM thread_attachments a "
            "LEFT JOIN threads t ON t.id=a.thread_id WHERE a.attachment_type='worktree'"
        ).fetchall()
        connection.rollback()
        return threads, attachments
    finally:
        connection.close()


def thread_kind(source, agent_path, agent_role):
    if agent_path or agent_role:
        return "historical_subagent"
    if source and source.startswith("{"):
        try:
            if "subagent" in json.loads(source):
                return "historical_subagent"
        except (TypeError, ValueError):
            return "unknown_source"
    return "user_chat"


def associate(group, threads, attachments, check_attachment_paths=True):
    result = {key: [] for key in (
        "active_user_chats", "archived_user_chats", "active_historical_subagents",
        "archived_historical_subagents", "unknown_source_chats",
        "active_worktree_attachments", "archived_worktree_attachments",
        "orphan_worktree_attachments",
    )}
    result["ancestor_cwd_overlaps"] = {}
    for ident, cwd, archived, source, agent_path, agent_role in threads:
        try:
            cwd_key = windows_path(cwd)
        except (TypeError, ValueError):
            continue
        direct = contains(group, cwd_key)
        ancestor = contains(cwd_key, group) and not direct
        if not direct and not ancestor:
            continue
        kind = thread_kind(source, agent_path, agent_role)
        key = ("archived_" if archived else "active_") + kind + "s"
        if kind == "unknown_source":
            key = "unknown_source_chats"
        if direct:
            result[key].append(ident)
        else:
            result["ancestor_cwd_overlaps"][key] = result["ancestor_cwd_overlaps"].get(key, 0) + 1
    for ident, path, kind, archived, source, agent_path, agent_role in attachments:
        try:
            match = overlaps(group, windows_path(path))
        except (TypeError, ValueError):
            continue
        if not match:
            continue
        key = ("archived_" if archived else "active_") + "worktree_attachments"
        if archived is None:
            key = "orphan_worktree_attachments"
        attachment = {"thread_id": ident, "path": path,
                      "thread_kind": thread_kind(source, agent_path, agent_role)}
        if check_attachment_paths:
            try:
                attachment["path_issue"] = path_problem(Path(path))
            except (TypeError, ValueError):
                attachment["path_issue"] = "invalid path"
        else:
            attachment["path_issue"] = "not checked: excluded path"
        result[key].append(attachment)
    result["counts"] = {key: len(value) for key, value in result.items()
                        if isinstance(value, list)}
    result["truncated"] = []
    for key, value in result.items():
        if isinstance(value, list) and len(value) > ASSOCIATION_SAMPLE_LIMIT:
            result[key] = value[:ASSOCIATION_SAMPLE_LIMIT]
            result["truncated"].append(key)
    return result


def git(repo, *args):
    command = ["git", "--no-optional-locks", "-c", "core.fsmonitor=false",
               "-C", str(repo), *args]
    env = dict(os.environ, GIT_OPTIONAL_LOCKS="0", GIT_TERMINAL_PROMPT="0")
    def run(cmd):
        return subprocess.run(cmd, env=env, capture_output=True, text=True,
                              encoding="utf-8", errors="replace", timeout=GIT_TIMEOUT_SECONDS)
    try:
        result = run(command)
        if result.returncode and "dubious ownership" in result.stderr.lower():
            command[2:2] = ["-c", "safe.directory=" + str(repo)]
            result = run(command)
    except (OSError, subprocess.TimeoutExpired) as exc:
        return None, f"{type(exc).__name__}: {exc}"
    if result.returncode:
        return None, (result.stderr or result.stdout).strip()[:500] or f"git exit {result.returncode}"
    return result.stdout, None


def inspect_git(repo):
    result = {"path": str(repo), "errors": []}
    for name, arguments in (
        ("top_level", ("rev-parse", "--show-toplevel")),
        ("git_dir", ("rev-parse", "--absolute-git-dir")),
        ("common_dir", ("rev-parse", "--git-common-dir")),
        ("head", ("rev-parse", "HEAD")),
        ("branch", ("rev-parse", "--abbrev-ref", "HEAD")),
        ("registration", ("worktree", "list", "--porcelain")),
        ("status", ("status", "--porcelain=v1", "--untracked-files=normal")),
        ("ignored", ("ls-files", "--others", "--ignored", "--directory", "--exclude-standard")),
    ):
        output, error = git(repo, *arguments)
        if error:
            result["errors"].append(f"{name}: {error}")
            continue
        if name == "registration":
            entries = [line[9:] for line in output.splitlines() if line.startswith("worktree ")]
            try:
                result["registered"] = any(windows_path(item) == windows_path(repo) for item in entries)
            except ValueError:
                result["registered"] = False
            if not result["registered"]:
                result["errors"].append("checkout absent from git worktree registration")
        elif name == "status":
            result["status_entries"] = output.splitlines()
            result["status_count"] = len(result["status_entries"])
        elif name == "ignored":
            result["ignored_names"] = output.splitlines()
            result["ignored_count"] = len(result["ignored_names"])
        elif name == "branch":
            result[name] = None if output.strip() == "HEAD" else output.strip()
        else:
            result[name] = output.strip() or None
    # A checkout can be a primary repository; registration still has to name it.
    if result.get("top_level"):
        try:
            if windows_path(result["top_level"]) != windows_path(repo):
                result["errors"].append("Git top level differs from checkout")
        except ValueError:
            result["errors"].append("Git top level is not an absolute path")
    return result


def git_marker(path):
    marker = path / ".git"
    try:
        info = marker.lstat()
    except FileNotFoundError:
        return False, None
    except OSError as exc:
        return False, f".git: {type(exc).__name__}: {exc}"
    if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & 0x400:
        return False, ".git is a link or reparse point"
    return True, None


def candidate_paths(root, exclusions=()):
    marker, _ = git_marker(root)
    if marker:
        return [root]
    candidates = []
    with os.scandir(root) as entries:
        for entry in entries:
            child = Path(entry.path)
            if entry.name == "desktop-current" and any(
                    overlaps(windows_path(child), windows_path(item)) and
                    contains(windows_path(item), windows_path(child)) for item in exclusions):
                candidates.append(child)
                continue
            if entry.name == "desktop-current" and entry.is_dir(follow_symlinks=False):
                if path_problem(child):
                    candidates.append(child)
                else:
                    with os.scandir(child) as nested:
                        candidates.extend(Path(item.path) for item in nested
                                          if item.is_dir(follow_symlinks=False) or
                                          getattr(item.stat(follow_symlinks=False), "st_file_attributes", 0) & 0x400)
            elif (entry.is_dir(follow_symlinks=False) or entry.is_symlink() or
                  getattr(entry.stat(follow_symlinks=False), "st_file_attributes", 0) & 0x400):
                candidates.append(child)
    return candidates


def inspect_candidate(group, threads, attachments, exclusions):
    key = windows_path(group)
    matching = [str(item) for item in exclusions if overlaps(key, windows_path(item))]
    row = {"group": str(group), "association": associate(key, threads, attachments,
           check_attachment_paths=not matching), "git": [], "issues": [], "next_check": []}
    if matching:
        row["excluded_by"] = matching
        row["next_check"].append("Excluded path: preserve this group and do not traverse it")
        return row
    problem = path_problem(group)
    if problem:
        row["issues"].append(problem)
        row["next_check"].append("Inspect the path or reparse point without following it")
        return row
    repos = []
    marker, issue = git_marker(group)
    if issue:
        row["issues"].append(issue)
    if marker:
        repos.append(group)
    else:
        try:
            with os.scandir(group) as entries:
                for entry in entries:
                    child = Path(entry.path)
                    child_problem = path_problem(child)
                    if child_problem:
                        row["issues"].append(child_problem)
                        continue
                    if entry.is_dir(follow_symlinks=False):
                        found, error = git_marker(child)
                        if found:
                            repos.append(child)
                        if error:
                            row["issues"].append(f"{child}: {error}")
        except OSError as exc:
            row["issues"].append(f"scan: {type(exc).__name__}: {exc}")
    if not repos:
        row["issues"].append("no immediate Git checkout; may be partial removal residue")
        row["next_check"].append("Inspect local residue and Git registration manually")
    if len(repos) > 1:
        row["issues"].append("multiple immediate Git checkouts")
    row["git"] = [inspect_git(repo) for repo in repos]
    if repos:
        row["next_check"].append("Verify owner, PR/head and merge evidence before any retirement")
        if any(item.get("status_count") or item.get("ignored_count") for item in row["git"]):
            row["next_check"].append("Review local tracked, untracked and ignored content")
        if any(item["errors"] for item in row["git"]):
            row["next_check"].append("Resolve Git errors and registration before classification")
    if (any(row["association"]["counts"].values()) or
            any(row["association"]["ancestor_cwd_overlaps"].values())):
        row["next_check"].append("Review every chat and attachment association")
    if any(item.get("path_issue") for key in ("active_worktree_attachments",
            "archived_worktree_attachments", "orphan_worktree_attachments")
            for item in row["association"][key]):
        row["issues"].append("one or more attachment paths are missing or unavailable")
    return row


def inventory(roots, db_path, exclusions=(), target=None):
    result = {"scope": {"roots": [str(item) for item in roots], "state_db": str(db_path),
                        "exclusions": [str(item) for item in exclusions],
                        "target": str(target) if target else None},
              "state_semantics": "active means archived=0, not running; no process state was checked",
              "state_error": None, "roots": [], "groups": [],
              "retirement_decision": "not_assessed"}
    try:
        threads, attachments = read_state(db_path)
    except (OSError, sqlite3.Error, RuntimeError) as exc:
        threads, attachments = [], []
        result["state_error"] = f"{type(exc).__name__}: {exc}"
    selected = False
    for root in roots:
        root_row = {"path": str(root), "error": None}
        result["roots"].append(root_row)
        try:
            covering = [str(item) for item in exclusions if contains(windows_path(item), windows_path(root))]
            if covering:
                root_row["excluded_by"] = covering
                continue
            problem = path_problem(root)
            if problem:
                raise OSError(problem)
            if not root.is_dir():
                raise OSError("root is not a directory")
            for group in candidate_paths(root, exclusions):
                if target and not overlaps(windows_path(group), windows_path(target)):
                    continue
                selected = True
                result["groups"].append(inspect_candidate(group, threads, attachments, exclusions))
        except OSError as exc:
            root_row["error"] = f"{type(exc).__name__}: {exc}"
    if target and not selected:
        result["target_error"] = "target not found in the supplied roots"
    if result["state_error"]:
        for row in result["groups"]:
            row["issues"].append("chat and attachment associations unavailable")
            row["next_check"].append("Repair the read-only state database query before classification")
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", action="append", required=True, type=Path,
                        help="absolute worktree root; repeatable")
    state = parser.add_mutually_exclusive_group(required=True)
    state.add_argument("--codex-home", type=Path)
    state.add_argument("--state-db", type=Path)
    parser.add_argument("--exclude", action="append", default=[], type=Path,
                        help="absolute path whose overlapping group must not be inspected")
    parser.add_argument("--target", type=Path, help="one group or checkout path to inspect")
    args = parser.parse_args(argv)
    db_path = args.state_db or args.codex_home / "state_5.sqlite"
    all_paths = [*args.root, db_path, *args.exclude, *([args.target] if args.target else [])]
    try:
        for item in all_paths:
            windows_path(item)
    except ValueError as exc:
        parser.error(str(exc))
    report = inventory(args.root, db_path, args.exclude, args.target)
    json.dump(report, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 1 if report["state_error"] or report.get("target_error") or any(r["error"] for r in report["roots"]) else 0


if __name__ == "__main__":
    raise SystemExit(main())
