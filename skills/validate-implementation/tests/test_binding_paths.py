"""Behaviour of the binding paths check: every repository path that
ARCHITECTURE.md or CODING_STANDARDS.md binds to must exist. Each test builds a
throwaway repository folder and runs the script as a repository's CI would.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "binding_paths.py"

ARCHITECTURE = """# Shop architecture

The pattern would put handlers in `app/api/`; this repository keeps them in
`server/routes/` because the API is served separately.

## Bindings

| Part of the pattern | Where it lives |
|---|---|
| Routes | `server/routes/` |
| Entry point | `server/main.py` |
| Pages | `app/*/page.tsx` and `app/layout.tsx` |
| Shared library | `lib/` |
"""

STANDARDS = """# Shop coding standards

| Convention | Bound to |
|---|---|
| Ruff rules | `pyproject.toml` `[tool.ruff]` `tool.ruff.lint` |
| Lint | `pnpm lint`, `@scope/eslint-config` and `src.server.routes` |
| Docs | `https://example.com/docs/guide.md` |
"""


class BindingPathsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.root = Path(tempfile.mkdtemp(prefix="binding-paths-"))
        self.addCleanup(shutil.rmtree, self.root, True)
        for relative in ("server/routes/orders.py", "server/main.py", "app/shop/page.tsx",
                         "app/layout.tsx", "lib/money.py", "pyproject.toml"):
            self.write(relative, "")
        self.write("ARCHITECTURE.md", ARCHITECTURE)
        self.write("CODING_STANDARDS.md", STANDARDS)

    def write(self, relative: str, text: str) -> None:
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def run_check(self) -> subprocess.CompletedProcess:
        return subprocess.run([sys.executable, str(SCRIPT), str(self.root)], capture_output=True, text=True)

    def test_pages_whose_bound_paths_all_exist_pass_quietly(self) -> None:
        done = self.run_check()
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        self.assertEqual(done.stdout + done.stderr, "")

    def test_a_moved_folder_or_deleted_file_fails_with_page_line_and_path(self) -> None:
        (self.root / "server/routes/orders.py").unlink()
        (self.root / "server/routes").rmdir()
        (self.root / "pyproject.toml").unlink()
        done = self.run_check()
        self.assertEqual(done.returncode, 1, done.stdout + done.stderr)
        self.assertIn("ARCHITECTURE.md:10: server/routes/", done.stdout)
        self.assertIn("CODING_STANDARDS.md:5: pyproject.toml", done.stdout)
        self.assertEqual(len(done.stdout.strip().splitlines()), 2, done.stdout)

    def test_a_glob_that_matches_nothing_fails_and_other_tables_are_not_read(self) -> None:
        (self.root / "app/shop/page.tsx").unlink()
        self.write("CODING_STANDARDS.md", STANDARDS + "\n| Area | Owner |\n|---|---|\n| Old | `gone/folder/` |\n")
        done = self.run_check()
        self.assertEqual(done.returncode, 1, done.stdout + done.stderr)
        self.assertEqual(done.stdout.strip().splitlines(), ["ARCHITECTURE.md:12: app/*/page.tsx does not exist"])

    def test_a_repository_without_the_pages_passes(self) -> None:
        (self.root / "ARCHITECTURE.md").unlink()
        (self.root / "CODING_STANDARDS.md").unlink()
        done = self.run_check()
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)


if __name__ == "__main__":
    unittest.main()
