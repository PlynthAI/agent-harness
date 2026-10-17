#!/usr/bin/env python3
"""Fail when ARCHITECTURE.md or CODING_STANDARDS.md binds to a repository path
that does not exist, so a moved, renamed or deleted folder or file cannot leave
either page silently stale.

Only binding tables are read: a table whose second column is headed "Where it
lives" or "Bound to". In that column a backticked token is a path when it has
no whitespace or "://", does not start with "@" (a scoped package or import
alias), and contains "/" or ends in a common file extension. Commands, URLs,
dotted symbols and config keys are therefore ignored. A glob (with *, ? or [)
passes when it matches at least one path. Prose, departure and known-trap lines
are not read: a departure names where the pattern would put a thing, which need
not exist. A missing page is not this check's failure.

Usage: binding_paths.py [REPOSITORY_ROOT]    (default: the current folder)
Exit 0 quietly when every bound path exists; exit 1 with "page:line: path" for
each one that does not. Standard library only, Python 3.9 or later.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

PAGES = ("ARCHITECTURE.md", "CODING_STANDARDS.md")
BINDING_HEADERS = ("where it lives", "bound to")
EXTENSIONS = {
    "md", "mdx", "json", "jsonc", "yaml", "yml", "toml", "ini", "cfg", "lock", "txt", "xml",
    "py", "pyi", "ts", "tsx", "js", "jsx", "mjs", "cjs", "mts", "cts", "css", "scss", "html",
    "sh", "ps1", "sql", "go", "rs", "java", "kt", "rb", "php", "swift", "cs",
}


def is_path(token: str) -> bool:
    if re.search(r"\s", token) or "://" in token or token.startswith("@"):
        return False
    extension = re.search(r"\.([A-Za-z0-9]+)$", token)
    return "/" in token or bool(extension and extension.group(1).lower() in EXTENSIONS)


def exists(root: Path, token: str) -> bool:
    relative = token.lstrip("/")
    if any(mark in relative for mark in "*?["):
        try:
            return next(iter(root.glob(relative)), None) is not None
        except (ValueError, NotImplementedError):
            return False
    return (root / relative).exists()


def missing_paths(root: Path) -> list[str]:
    missing = []
    for page in PAGES:
        path = root / page
        if not path.is_file():
            continue
        in_table = binding = False
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip().startswith("|"):
                in_table = False
                continue
            cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
            if not in_table:
                binding = len(cells) > 1 and cells[1].lower() in BINDING_HEADERS
            elif binding and len(cells) > 1:
                for token in re.findall(r"`([^`]+)`", cells[1]):
                    if is_path(token) and not exists(root, token):
                        missing.append(f"{page}:{number}: {token} does not exist")
            in_table = True
    return missing


def main(argv: list[str]) -> int:
    if len(argv) > 1 or (argv and argv[0].startswith("-")):
        print(__doc__)
        return 0 if argv and argv[0] in ("-h", "--help") else 2
    missing = missing_paths(Path(argv[0] if argv else "."))
    for entry in missing:
        print(entry)
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
