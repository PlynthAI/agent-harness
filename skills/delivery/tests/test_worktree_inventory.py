"""Disposable fixtures for the read-only worktree inventory."""

import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile
import unittest
from unittest import mock


SCRIPT = Path(__file__).parents[1] / "scripts" / "worktree-inventory.py"
SPEC = importlib.util.spec_from_file_location("worktree_inventory", SCRIPT)
inventory = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(inventory)


def make_state(path, threads=(), attachments=()):
    db = sqlite3.connect(path)
    try:
        db.execute("CREATE TABLE threads (id TEXT, cwd TEXT, archived INTEGER, "
                   "source TEXT, agent_path TEXT, agent_role TEXT)")
        db.execute("CREATE TABLE thread_attachments (thread_id TEXT, identity_key TEXT, "
                   "attachment_type TEXT)")
        db.executemany("INSERT INTO threads VALUES (?,?,?,?,?,?)", threads)
        db.executemany("INSERT INTO thread_attachments VALUES (?,?,?)", attachments)
        db.commit()
    finally:
        db.close()


def run_git(repo, *args):
    return subprocess.run(["git", "-C", str(repo), *args], check=True,
                          capture_output=True, text=True)


class InventoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / "worktrees"
        self.root.mkdir()
        self.db = self.base / "state.sqlite"

    def test_windows_path_boundaries_and_extended_forms(self):
        self.assertEqual(inventory.windows_path(r"\\?\D:\Work\A\..\B"), r"d:\work\b")
        self.assertEqual(inventory.windows_path(r"\\?\UNC\Server\Share\A"),
                         r"\\server\share\a")
        self.assertEqual(inventory.windows_path("C:\\"), "c:\\")
        self.assertTrue(inventory.contains(r"d:\work", r"d:\work\child"))
        self.assertFalse(inventory.contains(r"d:\work", r"d:\workspace"))

    def test_active_archived_and_historical_agents_are_separate(self):
        group = self.root / "a" / "repo"
        group.mkdir(parents=True)
        source = json.dumps({"subagent": {"other": "guardian"}})
        make_state(self.db, [
            ("active", str(group), 0, "exec", None, None),
            ("archive", str(group), 1, "exec", None, None),
            ("agent", str(group), 1, source, None, None),
        ], [("active", str(group), "worktree"),
            ("archive", str(group), "worktree")])
        row = inventory.inventory([self.root], self.db)["groups"][0]
        assoc = row["association"]
        self.assertEqual(assoc["active_user_chats"], ["active"])
        self.assertEqual(assoc["archived_user_chats"], ["archive"])
        self.assertEqual(assoc["archived_historical_subagents"], ["agent"])
        self.assertEqual(len(assoc["active_worktree_attachments"]), 1)
        self.assertEqual(len(assoc["archived_worktree_attachments"]), 1)
        self.assertIsNone(assoc["active_worktree_attachments"][0]["path_issue"])

    def test_ancestor_cwd_overlap_is_visible(self):
        group = self.root / "a"
        group.mkdir()
        make_state(self.db, [("parent", str(self.root), 0, "exec", None, None)])
        assoc = inventory.inventory([self.root], self.db)["groups"][0]["association"]
        self.assertEqual(assoc["active_user_chats"], [])
        self.assertEqual(assoc["ancestor_cwd_overlaps"]["active_user_chats"], 1)

    def test_drive_root_exclusion_prevents_descendant_inspection(self):
        make_state(self.db)
        protected_drive = Path(self.root.anchor)
        with mock.patch.object(inventory, "candidate_paths", side_effect=AssertionError("traversed")):
            report = inventory.inventory([self.root], self.db, [protected_drive])
        self.assertEqual(report["groups"], [])
        self.assertEqual(report["roots"][0]["excluded_by"], [str(protected_drive)])

    def test_association_count_remains_complete_when_ids_are_sampled(self):
        group = self.root / "a"
        group.mkdir()
        make_state(self.db, [(str(i), str(group), 0, "exec", None, None)
                             for i in range(inventory.ASSOCIATION_SAMPLE_LIMIT + 1)])
        assoc = inventory.inventory([self.root], self.db)["groups"][0]["association"]
        self.assertEqual(assoc["counts"]["active_user_chats"],
                         inventory.ASSOCIATION_SAMPLE_LIMIT + 1)
        self.assertEqual(len(assoc["active_user_chats"]), inventory.ASSOCIATION_SAMPLE_LIMIT)
        self.assertIn("active_user_chats", assoc["truncated"])

    def test_missing_schema_is_reported_without_claiming_no_associations(self):
        group = self.root / "a"
        group.mkdir()
        db = sqlite3.connect(self.db)
        db.close()
        report = inventory.inventory([self.root], self.db)
        self.assertIn("no such table", report["state_error"])
        self.assertIn("associations unavailable", " ".join(report["groups"][0]["issues"]))
        self.assertEqual(report["retirement_decision"], "not_assessed")

    def test_clean_git_and_ignored_data_are_distinct_and_no_files_change(self):
        group = self.root / "a"
        repo = group / "repo"
        repo.mkdir(parents=True)
        run_git(repo, "init", "-q")
        (repo / ".gitignore").write_text("cache/\n", encoding="utf-8")
        (repo / "readme.txt").write_text("fixture", encoding="utf-8")
        run_git(repo, "add", ".gitignore", "readme.txt")
        run_git(repo, "-c", "user.name=Test", "-c", "user.email=test@example.invalid",
                "commit", "-qm", "fixture")
        make_state(self.db)
        baseline = {str(p.relative_to(self.base)): (p.stat().st_size, p.stat().st_mtime_ns)
                    for p in self.base.rglob("*") if p.is_file()}
        clean = inventory.inventory([self.root], self.db)["groups"][0]["git"][0]
        self.assertEqual(clean["status_count"], 0)
        self.assertEqual(clean["ignored_count"], 0)
        self.assertTrue(clean["registered"])
        self.assertTrue(clean["head"])
        cache = repo / "cache"
        cache.mkdir()
        (cache / "important.dat").write_text("keep", encoding="utf-8")
        expected = {str(p.relative_to(self.base)): (p.stat().st_size, p.stat().st_mtime_ns)
                    for p in self.base.rglob("*") if p.is_file()}
        dirty = inventory.inventory([self.root], self.db)["groups"][0]["git"][0]
        self.assertEqual(dirty["status_count"], 0)
        self.assertIn("cache/", dirty["ignored_names"])
        self.assertEqual(expected, {str(p.relative_to(self.base)): (p.stat().st_size, p.stat().st_mtime_ns)
                                    for p in self.base.rglob("*") if p.is_file()})
        self.assertEqual(baseline, {k: v for k, v in expected.items() if k in baseline})

    def test_missing_git_and_missing_attachment_are_visible(self):
        group = self.root / "residue"
        group.mkdir()
        missing = group / "vanished"
        make_state(self.db, [("t", str(group), 0, "exec", None, None)],
                   [("t", str(missing), "worktree")])
        row = inventory.inventory([self.root], self.db)["groups"][0]
        self.assertTrue(any("partial removal residue" in issue for issue in row["issues"]))
        self.assertTrue(any("attachment paths" in issue for issue in row["issues"]))
        self.assertIsNotNone(row["association"]["active_worktree_attachments"][0]["path_issue"])

    def test_excluded_group_is_not_traversed(self):
        protected = self.root / "c83b"
        protected.mkdir()
        make_state(self.db)
        with mock.patch.object(inventory, "inspect_git", side_effect=AssertionError("traversed")):
            row = inventory.inventory([self.root], self.db, [protected])["groups"][0]
        self.assertEqual(row["excluded_by"], [str(protected)])
        self.assertEqual(row["git"], [])

    def test_excluded_root_is_not_scanned(self):
        make_state(self.db)
        with mock.patch.object(inventory, "candidate_paths", side_effect=AssertionError("scanned")):
            report = inventory.inventory([self.root], self.db, [self.root])
        self.assertEqual(report["groups"], [])
        self.assertEqual(report["roots"][0]["excluded_by"], [str(self.root)])

    def test_reparse_or_symlink_group_is_not_followed(self):
        outside = self.base / "outside"
        outside.mkdir()
        link = self.root / "link"
        try:
            os.symlink(outside, link, target_is_directory=True)
        except (OSError, NotImplementedError) as exc:
            self.skipTest(f"directory symlink unavailable: {exc}")
        make_state(self.db)
        row = inventory.inspect_candidate(link, [], [], [])
        self.assertIn("link or reparse point", " ".join(row["issues"]))
        self.assertEqual(row["git"], [])

    def test_desktop_current_and_direct_checkout_roots(self):
        (self.root / "desktop-current" / "id" / "repo").mkdir(parents=True)
        make_state(self.db)
        groups = inventory.inventory([self.root], self.db)["groups"]
        self.assertEqual([Path(row["group"]).name for row in groups], ["id"])
        direct = self.base / "direct"
        direct.mkdir()
        run_git(direct, "init", "-q")
        result = inventory.inventory([direct], self.db)
        self.assertEqual(result["groups"][0]["group"], str(direct))

    def test_missing_registration_is_an_explicit_git_error(self):
        repo = self.root / "repo"
        repo.mkdir()
        run_git(repo, "init", "-q")
        make_state(self.db)
        original = inventory.git
        def stale_registration(path, *args):
            if args[:2] == ("worktree", "list"):
                return "worktree C:/elsewhere\nHEAD 0000000\n", None
            return original(path, *args)
        with mock.patch.object(inventory, "git", side_effect=stale_registration):
            result = inventory.inventory([self.root], self.db)
        git = result["groups"][0]["git"][0]
        self.assertFalse(git["registered"])
        self.assertIn("checkout absent", " ".join(git["errors"]))


if __name__ == "__main__":
    unittest.main()
