"""Behaviour of the suppression count: a baseline of inline suppression comments
that can only go down. Each test builds a throwaway Git repository and runs the
script as a repository's CI would, so nothing here depends on the harness tree.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "suppression_count.py"
GIT_ENV = {
    **os.environ,
    "GIT_AUTHOR_NAME": "t",
    "GIT_AUTHOR_EMAIL": "t@example.invalid",
    "GIT_COMMITTER_NAME": "t",
    "GIT_COMMITTER_EMAIL": "t@example.invalid",
}


class Repo:
    def __init__(self) -> None:
        self.root = Path(tempfile.mkdtemp(prefix="suppression-count-"))
        self.git("init", "-q", "-b", "main")
        self.git("config", "core.autocrlf", "false")

    def git(self, *args: str) -> str:
        done = subprocess.run(
            ["git", *args], cwd=self.root, env=GIT_ENV, capture_output=True, text=True, check=True
        )
        return done.stdout

    def write(self, relative: str, text: str, track: bool = True) -> None:
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8", newline="\n")
        if track:
            self.git("add", "--", relative)

    def commit(self, message: str = "c") -> None:
        self.git("add", "-A")
        self.git("commit", "-q", "-m", message)

    def run(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), *args], cwd=self.root, capture_output=True, text=True
        )

    def counts(self) -> dict[str, int]:
        return json.loads((self.root / ".suppression-baseline.json").read_text(encoding="utf-8"))["counts"]

    def close(self) -> None:
        shutil.rmtree(self.root, ignore_errors=True)


PY = """import os, sys  # noqa: E401
sys.path.insert(0, ".")
import json  # noqa: E402, F401
value = json.loads("1")  # type: ignore[assignment]
other = value  # type: ignore
third = other  # pyrefly: ignore[bad-assignment]
blanket = 1  # noqa
"""

TS = """// eslint-disable-next-line no-console, no-alert -- legacy logging
console.log(1);
/* eslint-disable react-hooks/exhaustive-deps */
// @ts-expect-error untyped module
import x from "x";
"""


class SuppressionCountTest(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = Repo()
        self.addCleanup(self.repo.close)
        self.repo.write("scripts/tool.py", PY)
        self.repo.write("app/page.tsx", TS)
        self.repo.write("sandbox/scratch.py", "x = 1  # noqa: F841\n")
        self.repo.write("setup.py", "# ruff: noqa\n")
        self.repo.commit()

    def test_write_counts_each_rule_by_area_and_check_passes_on_an_unchanged_tree(self) -> None:
        self.repo.write("scripts/untracked.py", "y = 2  # noqa: F841\n", track=False)
        written = self.repo.run("write", "--exclude", "sandbox/*")
        self.assertEqual(written.returncode, 0, written.stdout + written.stderr)
        self.assertEqual(
            self.repo.counts(),
            {
                ".: ruff-noqa *": 1,
                "app: eslint-disable no-alert": 1,
                "app: eslint-disable no-console": 1,
                "app: eslint-disable react-hooks/exhaustive-deps": 1,
                "app: ts-expect-error *": 1,
                "scripts: noqa *": 1,
                "scripts: noqa E401": 1,
                "scripts: noqa E402": 1,
                "scripts: noqa F401": 1,
                "scripts: pyrefly-ignore bad-assignment": 1,
                "scripts: type-ignore *": 1,
                "scripts: type-ignore assignment": 1,
            },
        )
        checked = self.repo.run("check")
        self.assertEqual(checked.returncode, 0, checked.stdout + checked.stderr)

    def test_a_new_suppression_fails_the_check_and_names_its_rule_and_file(self) -> None:
        self.repo.run("write", "--exclude", "sandbox/*")
        self.repo.write("scripts/new.py", "import os  # noqa: F401\n")
        checked = self.repo.run("check")
        self.assertEqual(checked.returncode, 1)
        self.assertIn("scripts: noqa F401", checked.stdout)
        self.assertIn("scripts/new.py:1", checked.stdout)

    def test_a_removed_suppression_fails_until_the_baseline_is_shrunk(self) -> None:
        self.repo.run("write", "--exclude", "sandbox/*")
        self.repo.write("scripts/tool.py", PY.replace("  # noqa: E401", ""))
        stale = self.repo.run("check")
        self.assertEqual(stale.returncode, 1)
        self.assertIn("scripts: noqa E401", stale.stdout)
        self.assertIn("shrink", stale.stdout)
        shrunk = self.repo.run("shrink")
        self.assertEqual(shrunk.returncode, 0, shrunk.stdout + shrunk.stderr)
        self.assertNotIn("scripts: noqa E401", self.repo.counts())
        self.assertEqual(self.repo.run("check").returncode, 0)

    def test_shrink_never_adds_or_raises_an_entry(self) -> None:
        self.repo.run("write", "--exclude", "sandbox/*")
        self.repo.write("scripts/tool.py", PY.replace("  # noqa: E401", "  # noqa: E401, F811"))
        self.repo.write("app/more.ts", "// @ts-expect-error again\nlet a = 1;\n")
        self.repo.run("shrink")
        counts = self.repo.counts()
        self.assertNotIn("scripts: noqa F811", counts)
        self.assertEqual(counts["app: ts-expect-error *"], 1)
        self.assertEqual(self.repo.run("check").returncode, 1)

    def test_the_excluded_scope_is_kept_by_the_baseline_itself(self) -> None:
        self.repo.run("write", "--exclude", "sandbox/*")
        self.repo.write("sandbox/scratch.py", "x = 1  # noqa: F841\nz = 2  # noqa: F841\n")
        self.assertEqual(self.repo.run("check").returncode, 0)
        self.repo.run("shrink")
        self.assertEqual(self.repo.run("check").returncode, 0)

    def test_base_ref_rejects_a_baseline_raised_above_the_base_branch(self) -> None:
        self.repo.run("write", "--exclude", "sandbox/*")
        self.repo.commit("baseline")
        self.repo.git("checkout", "-q", "-b", "feature")
        self.repo.write("scripts/new.py", "import os  # noqa: F401\n")
        self.repo.run("write", "--exclude", "sandbox/*")
        self.repo.commit("raise")
        raised = self.repo.run("check", "--base", "main")
        self.assertEqual(raised.returncode, 1)
        self.assertIn("scripts: noqa F401", raised.stdout)
        self.assertIn("main", raised.stdout)

    def test_base_ref_accepts_a_lowered_baseline(self) -> None:
        self.repo.run("write", "--exclude", "sandbox/*")
        self.repo.commit("baseline")
        self.repo.git("checkout", "-q", "-b", "feature")
        self.repo.write("scripts/tool.py", PY.replace("  # noqa: E401", ""))
        self.repo.run("shrink")
        self.repo.commit("lower")
        lowered = self.repo.run("check", "--base", "main")
        self.assertEqual(lowered.returncode, 0, lowered.stdout + lowered.stderr)

    def test_base_ref_without_a_baseline_is_the_first_adoption_and_passes(self) -> None:
        self.repo.git("checkout", "-q", "-b", "adopt")
        self.repo.run("write", "--exclude", "sandbox/*")
        self.repo.commit("adopt")
        first = self.repo.run("check", "--base", "main")
        self.assertEqual(first.returncode, 0, first.stdout + first.stderr)
        self.assertIn("no baseline", first.stdout.lower())

    def test_a_base_ref_that_does_not_resolve_is_an_error_not_a_first_adoption(self) -> None:
        # A shallow CI checkout has no origin/main; passing as "first adoption"
        # there would switch the guard off without anyone noticing.
        self.repo.run("write", "--exclude", "sandbox/*")
        self.repo.commit("baseline")
        unresolved = self.repo.run("check", "--base", "origin/main")
        self.assertEqual(unresolved.returncode, 2, unresolved.stdout + unresolved.stderr)
        self.assertIn("origin/main", unresolved.stderr)

    def test_a_missing_baseline_fails_and_says_how_to_create_it(self) -> None:
        missing = self.repo.run("check")
        self.assertEqual(missing.returncode, 1)
        self.assertIn("write", missing.stdout)

    def test_a_rule_added_inside_a_multiline_eslint_block_fails_the_check(self) -> None:
        block = "/* eslint-disable\n   no-console,\n{extra}*/\nconsole.log(1);\n"
        self.repo.write("web/legacy.js", block.format(extra=""))
        written = self.repo.run("write", "--exclude", "sandbox/*")
        self.assertEqual(written.returncode, 0, written.stdout + written.stderr)
        counts = self.repo.counts()
        self.assertEqual(counts.get("web: eslint-disable no-console"), 1, counts)
        self.assertNotIn("web: eslint-disable *", counts)
        self.repo.write("web/legacy.js", block.format(extra="   no-alert\n"))
        checked = self.repo.run("check")
        self.assertEqual(checked.returncode, 1, checked.stdout + checked.stderr)
        self.assertIn("NEW   web: eslint-disable no-alert", checked.stdout)
        self.assertIn("web/legacy.js:1", checked.stdout)

    def test_python_strings_that_look_like_suppressions_are_not_counted(self) -> None:
        self.repo.write(
            "fixtures/samples.py",
            'text = "# noqa: F401"\nhint = \'# type: ignore[assignment]\'\ndoc = """\n# pyrefly: ignore\n"""\n',
        )
        self.repo.run("write", "--exclude", "sandbox/*")
        self.assertEqual([key for key in self.repo.counts() if key.startswith("fixtures:")], [])
        self.repo.write("fixtures/samples.py", 'text = ""  # noqa: F401\n')
        checked = self.repo.run("check")
        self.assertEqual(checked.returncode, 1, checked.stdout + checked.stderr)
        self.assertIn("NEW   fixtures: noqa F401", checked.stdout)
        self.assertNotIn("STALE", checked.stdout)

    def test_a_python_file_that_does_not_tokenize_is_read_by_line_and_says_so(self) -> None:
        self.repo.write("legacy/broken.py", "value = (\n    1  # noqa: F841\n")
        written = self.repo.run("write", "--exclude", "sandbox/*")
        self.assertEqual(written.returncode, 0, written.stdout + written.stderr)
        self.assertEqual(self.repo.counts().get("legacy: noqa F841"), 1)
        self.assertIn("legacy/broken.py", written.stdout)
        self.assertIn("does not tokenize", written.stdout)
        checked = self.repo.run("check")
        self.assertEqual(checked.returncode, 0, checked.stdout + checked.stderr)
        self.assertIn("legacy/broken.py", checked.stdout)

    def test_script_strings_and_templates_that_look_like_suppressions_are_not_counted(self) -> None:
        source = (
            'const a = "// eslint-disable-line no-console";\n'
            "const b = '/* eslint-disable */';\n"
            "const c = `\n// @ts-ignore\n/* eslint-disable no-alert */\n`;\n"
            'const u = "https://example.com/*";\n'
            "// @ts-expect-error real\n"
            'const d = "x"; // eslint-disable-line no-debugger\n'
        )
        self.repo.write("web/strings.ts", source)
        self.repo.run("write", "--exclude", "sandbox/*")
        counts = {key: n for key, n in self.repo.counts().items() if key.startswith("web:")}
        self.assertEqual(counts, {"web: eslint-disable no-debugger": 1, "web: ts-expect-error *": 1})
        self.repo.write("web/strings.ts", source.replace('"// eslint-disable-line no-console"', '""; // eslint-disable-line no-console'))
        checked = self.repo.run("check")
        self.assertEqual(checked.returncode, 1, checked.stdout + checked.stderr)
        self.assertIn("NEW   web: eslint-disable no-console", checked.stdout)
        self.assertNotIn("STALE", checked.stdout)

    def test_write_works_with_python_3_9_pathlib_and_writes_lf(self) -> None:
        # Python 3.9's Path.write_text has no newline argument; stand in for it
        # here, since a 3.9 interpreter may not be installed.
        bootstrap = (
            "import pathlib, runpy, sys\n"
            "original = pathlib.Path.write_text\n"
            "def write_text(self, data, encoding=None, errors=None):\n"
            "    return original(self, data, encoding=encoding, errors=errors)\n"
            "pathlib.Path.write_text = write_text\n"
            "sys.argv = [sys.argv[1], 'write', '--exclude', 'sandbox/*']\n"
            "runpy.run_path(sys.argv[0], run_name='__main__')\n"
        )
        done = subprocess.run(
            [sys.executable, "-c", bootstrap, str(SCRIPT)], cwd=self.repo.root, capture_output=True, text=True
        )
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        written = (self.repo.root / ".suppression-baseline.json").read_bytes()
        self.assertIn(b'"scripts: noqa E401": 1', written)
        self.assertNotIn(b"\r\n", written)

    def test_help_succeeds_and_an_unknown_command_is_a_usage_error(self) -> None:
        self.assertEqual(self.repo.run("--help").returncode, 0)
        self.assertEqual(self.repo.run("frobnicate").returncode, 2)


if __name__ == "__main__":
    unittest.main()
