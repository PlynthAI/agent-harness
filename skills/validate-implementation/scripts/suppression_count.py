#!/usr/bin/env python3
"""Count inline suppression comments by area and rule, against a baseline that
can only go down.

The quality kit's baseline for linters with no baseline file of their own
(Ruff, pyrefly) and for inline ESLint and TypeScript suppressions, which an
ESLint bulk-suppressions file does not cover. A key is
"<top-level folder>: <kind> <rule>", for example "scripts: noqa E402"; "*"
stands for a suppression that names no rule. Only files Git tracks are read.

Only comments count, never text inside a string. Python files are read with
the tokenize module; a file that does not tokenize is read line by line
instead, with a NOTE naming it, and there matching text in a string counts
too. JavaScript and TypeScript are read by a small scanner that skips string
and template literals and reads each whole comment, so a block directive whose
rules run over several lines counts each rule. Its known limits: it does not
recognise regular expression literals or JSX text, so a quote character there
hides directives later on that line (a backtick, until the next backtick) and
a "//" or "/*" inside a regular expression is taken for a comment; and
comments inside a template's ${...} are not seen.

Commands, run from anywhere inside the repository:

  write  [--exclude GLOB ...]  Record every current count (adoption, or a
                               deliberate reset reviewed as such).
  shrink                       Lower counts to the current tree. Never adds a
                               key or raises a count.
  check  [--base REF]          Fail when a count rose (a new suppression) or
                               fell without a shrink (a stale baseline). With
                               --base, also fail when the committed baseline
                               is above the one at REF, so it only goes down.

Options: --baseline FILE (default .suppression-baseline.json at the
repository root). Exit 0 pass, 1 fail, 2 usage or environment error.
Standard library only; Python 3.9 or later.
"""

from __future__ import annotations

import argparse
import fnmatch
import io
import json
import re
import subprocess
import sys
import tokenize
from collections import Counter, defaultdict
from pathlib import Path

DEFAULT_BASELINE = ".suppression-baseline.json"
PYTHON_SUFFIXES = {".py", ".pyi"}
SCRIPT_SUFFIXES = {".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"}

PY_NOQA = re.compile(
    r"#\s*(?P<ruff>ruff\s*:\s*)?noqa\b(?:\s*:\s*(?P<codes>[A-Z]+[0-9]+(?:[\s,]+[A-Z]+[0-9]+)*))?",
    re.IGNORECASE,
)
PY_BRACKETED = re.compile(r"#\s*(?P<tool>type|pyrefly)\s*:\s*ignore\b(?:\[(?P<codes>[^\]]*)\])?")
# Matched against the body of one whole comment, so a block directive whose
# rule list runs over several lines counts each rule.
ESLINT = re.compile(r"\s*eslint-disable(?:-next-line|-line)?(?=\s|$)(?P<rest>.*)", re.DOTALL)
TS_DIRECTIVE = re.compile(r"[\s*/]*@ts-(?P<kind>ignore|expect-error|nocheck)\b")


def split_codes(text: str | None, separators: str = r"[\s,]+") -> list[str]:
    codes = [code for code in re.split(separators, (text or "").strip()) if code]
    return codes or ["*"]


def python_comment_suppressions(comment: str) -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    for match in PY_NOQA.finditer(comment):
        kind = "ruff-noqa" if match.group("ruff") else "noqa"
        found.extend((kind, code.upper() if code != "*" else code) for code in split_codes(match.group("codes")))
    for match in PY_BRACKETED.finditer(comment):
        kind = f"{match.group('tool')}-ignore"
        found.extend((kind, code) for code in split_codes(match.group("codes"), r"\s*,\s*"))
    return found


def script_comments(text: str) -> list[tuple[int, str]]:
    """Each // or /* */ comment as (line it starts on, body without delimiters).

    String and template literals are skipped so text inside them is not read as
    a comment. A ' or " string ends at its line's end even when unclosed, so a
    stray quote (JSX text, a regular expression) costs at most that line.
    """
    comments: list[tuple[int, str]] = []
    i, line, end = 0, 1, len(text)
    while i < end:
        quote = text[i]
        if quote in "'\"`":
            i += 1
            while i < end and text[i] != quote and (quote == "`" or text[i] != "\n"):
                step = 2 if text[i] == "\\" else 1
                line += text[i : i + step].count("\n")
                i += step
            if i < end and text[i] == quote:
                i += 1
        elif text.startswith("//", i):
            stop = text.find("\n", i)
            stop = end if stop < 0 else stop
            comments.append((line, text[i + 2 : stop]))
            i = stop
        elif text.startswith("/*", i):
            stop = text.find("*/", i + 2)
            stop = end if stop < 0 else stop
            body = text[i + 2 : stop]
            comments.append((line, body))
            line += body.count("\n")
            i = stop + 2
        else:
            line += text[i] == "\n"
            i += 1
    return comments


def script_suppressions(text: str) -> list[tuple[int, str, str]]:
    found: list[tuple[int, str, str]] = []
    for line, body in script_comments(text):
        directive = ESLINT.match(body)
        if directive:
            rest = directive.group("rest").split("--")[0]
            found.extend((line, "eslint-disable", rule) for rule in split_codes(rest, r"\s*,\s*"))
        for offset, part in enumerate(body.split("\n")):
            match = TS_DIRECTIVE.match(part)
            if match:
                found.append((line + offset, f"ts-{match.group('kind')}", "*"))
    return found


def python_suppressions(text: str) -> list[tuple[int, str, str]] | None:
    """Suppressions in real comment tokens, or None when the file does not tokenize."""
    try:
        tokens = list(tokenize.generate_tokens(io.StringIO(text).readline))
    except (tokenize.TokenError, SyntaxError):
        return None
    return [
        (token.start[0], kind, code)
        for token in tokens
        if token.type == tokenize.COMMENT
        for kind, code in python_comment_suppressions(token.string)
    ]


def python_line_suppressions(text: str) -> list[tuple[int, str, str]]:
    """The fallback for a file that does not tokenize: any matching text counts."""
    return [
        (number, kind, code)
        for number, line in enumerate(text.splitlines(), start=1)
        for kind, code in python_comment_suppressions(line)
    ]


def git(root: Path, *args: str) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(["git", *args], cwd=root, capture_output=True)


def repository_root() -> Path:
    done = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True)
    if done.returncode != 0:
        raise SystemExit(fail_usage("not inside a Git repository"))
    return Path(done.stdout.strip())


def fail_usage(message: str) -> int:
    print(f"suppression-count: {message}", file=sys.stderr)
    return 2


def scan(root: Path, exclude: list[str]) -> tuple[Counter[str], dict[str, list[str]]]:
    listed = git(root, "ls-files", "-z", "--full-name")
    if listed.returncode != 0:
        raise SystemExit(fail_usage("git ls-files failed"))
    counts: Counter[str] = Counter()
    places: dict[str, list[str]] = defaultdict(list)
    for raw in listed.stdout.split(b"\0"):
        if not raw:
            continue
        relative = raw.decode("utf-8", "surrogateescape")
        suffix = Path(relative).suffix.lower()
        if suffix not in PYTHON_SUFFIXES | SCRIPT_SUFFIXES:
            continue
        if any(fnmatch.fnmatchcase(relative, pattern) for pattern in exclude):
            continue
        path = root / relative
        if not path.is_file():
            continue
        area = relative.split("/", 1)[0] if "/" in relative else "."
        text = path.read_text(encoding="utf-8-sig", errors="replace")
        if suffix in SCRIPT_SUFFIXES:
            found = script_suppressions(text)
        else:
            tokenized = python_suppressions(text)
            if tokenized is None:
                print(f"NOTE  {relative} does not tokenize; read line by line, so matching text in strings counts too.")
            found = python_line_suppressions(text) if tokenized is None else tokenized
        for number, kind, code in found:
            key = f"{area}: {kind} {code}"
            counts[key] += 1
            places[key].append(f"{relative}:{number}")
    return counts, places


def baseline_path(root: Path, option: str | None) -> Path:
    return (Path.cwd() / option) if option else (root / DEFAULT_BASELINE)


def load(path: Path) -> dict | None:
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save(path: Path, exclude: list[str], counts: dict[str, int]) -> None:
    document = {"version": 1, "exclude": exclude, "counts": dict(sorted(counts.items()))}
    # Path.open, not write_text: write_text takes newline only from Python 3.10.
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(document, indent=2) + "\n")


def command_write(root: Path, path: Path, exclude: list[str]) -> int:
    counts, _ = scan(root, exclude)
    save(path, exclude, dict(counts))
    print(f"Wrote {path.name}: {sum(counts.values())} suppression(s) under {len(counts)} key(s).")
    return 0


def command_shrink(root: Path, path: Path) -> int:
    document = load(path)
    if document is None:
        print(f"No baseline at {path}. Run: suppression_count.py write")
        return 1
    exclude = list(document.get("exclude", []))
    current, _ = scan(root, exclude)
    before = document.get("counts", {})
    after = {key: min(count, current.get(key, 0)) for key, count in before.items()}
    after = {key: count for key, count in after.items() if count > 0}
    save(path, exclude, after)
    risen = sorted(key for key, count in current.items() if count > before.get(key, 0))
    print(f"Baseline {sum(before.values())} -> {sum(after.values())} suppression(s).")
    if risen:
        print(f"Not added or raised ({len(risen)} key(s)); check will fail on: " + ", ".join(risen))
    return 0


def baseline_at(root: Path, ref: str, path: Path) -> dict | None:
    # An unresolvable ref (a shallow CI checkout without the base branch) is an
    # error, never a first adoption, or the guard would switch itself off.
    if git(root, "rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}").returncode != 0:
        raise SystemExit(fail_usage(f"cannot resolve {ref}; fetch the base branch before check --base"))
    relative = path.resolve().relative_to(root.resolve()).as_posix()
    shown = git(root, "show", f"{ref}:{relative}")
    if shown.returncode != 0:
        return None
    return json.loads(shown.stdout.decode("utf-8"))


def command_check(root: Path, path: Path, base: str | None) -> int:
    document = load(path)
    if document is None:
        print(f"No baseline at {path}. Run: suppression_count.py write")
        return 1
    expected: dict[str, int] = document.get("counts", {})
    current, places = scan(root, list(document.get("exclude", [])))
    failed = False
    for key in sorted(set(expected) | set(current)):
        was, now = expected.get(key, 0), current.get(key, 0)
        if now > was:
            failed = True
            print(f"NEW   {key}: {now} (baseline {was}). Fix it or state a departure in the tool config.")
            for place in places[key][:20]:
                print(f"        {place}")
        elif now < was:
            failed = True
            print(f"STALE {key}: {now} (baseline {was}). Run: suppression_count.py shrink")
    if base:
        at_base = baseline_at(root, base, path)
        if at_base is None:
            print(f"No baseline at {base}: first adoption, nothing to compare.")
        else:
            base_counts = at_base.get("counts", {})
            for key, count in sorted(expected.items()):
                if count > base_counts.get(key, 0):
                    failed = True
                    print(f"RAISED {key}: {count} (at {base}: {base_counts.get(key, 0)}). The baseline only goes down.")
    total = sum(current.values())
    print(f"{'FAIL' if failed else 'PASS'}: {total} suppression(s), baseline {sum(expected.values())}.")
    return 1 if failed else 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="suppression_count.py",
        description="Count inline suppressions by area and rule against a baseline that only goes down.",
    )
    parser.add_argument("command", choices=["write", "shrink", "check"])
    parser.add_argument("--baseline", help=f"baseline file (default {DEFAULT_BASELINE} at the repository root)")
    parser.add_argument("--exclude", action="append", default=[], help="glob of tracked paths to leave out (write only)")
    parser.add_argument("--base", help="Git ref whose baseline the committed one may not exceed (check only)")
    args = parser.parse_args(argv)
    if args.exclude and args.command != "write":
        parser.error("--exclude applies to write; the baseline keeps its own scope")
    if args.base and args.command != "check":
        parser.error("--base applies to check")
    root = repository_root()
    path = baseline_path(root, args.baseline)
    if args.command == "write":
        return command_write(root, path, args.exclude)
    if args.command == "shrink":
        return command_shrink(root, path)
    return command_check(root, path, args.base)


if __name__ == "__main__":
    sys.exit(main())
