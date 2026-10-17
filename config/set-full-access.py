#!/usr/bin/env python3
"""Plan or apply explicitly requested Codex access settings, preserving TOML text."""

import argparse
import copy
from datetime import datetime, timezone
import math
import os
from pathlib import Path
import re
import sys
import tempfile
import tomllib


SETTINGS = {
    ("approval_policy",): "never",
    ("sandbox_mode",): "danger-full-access",
    ("computer_use", "default_app_access"): "allow",
}
REMOVED = ("default_permissions",)


class ConfigError(Exception):
    """An input that cannot be safely edited without losing configuration."""


def statements(text):
    """Yield whole TOML statements, ignoring newlines inside strings and containers."""
    start = index = depth = 0
    quote = None
    multiline = False
    comment = False
    while index < len(text):
        char = text[index]
        if comment:
            if char == "\n":
                comment = False
            else:
                index += 1
                continue
        elif quote:
            if char == "\\" and quote == '"':
                index += 2
                continue
            if char == quote:
                if multiline:
                    end = index
                    while end < len(text) and text[end] == quote:
                        end += 1
                    if end - index >= 3:
                        quote = None
                    index = end
                    continue
                quote = None
            index += 1
            continue
        elif char == "#":
            comment = True
        elif char in "\"'":
            quote = char
            multiline = text[index:index + 3] == char * 3
            index += 3 if multiline else 1
            continue
        elif char in "[{":
            depth += 1
        elif char in "]}":
            depth -= 1
        if char == "\n" and depth == 0:
            yield start, index + 1, text[start:index + 1]
            start = index + 1
        index += 1
    if start < len(text):
        yield start, len(text), text[start:]


def key_path(key):
    node = tomllib.loads(key + " = 0")
    path = []
    while isinstance(node, dict) and len(node) == 1:
        part, node = next(iter(node.items()))
        path.append(part)
    if node != 0:
        raise ConfigError("Ambiguous assignment; config unchanged.")
    return tuple(path)


def assignment_equal(statement):
    quote = None
    escaped = False
    for index, char in enumerate(statement):
        if escaped:
            escaped = False
        elif quote:
            if char == "\\" and quote == '"':
                escaped = True
            elif char == quote:
                quote = None
        elif char in "\"'":
            quote = char
        elif char == "=":
            return index
    raise ConfigError("Ambiguous assignment; config unchanged.")


def table_path(statement):
    node = tomllib.loads(statement)
    path = []
    while node:
        if isinstance(node, list):
            node = node[0]
            continue
        part, node = next(iter(node.items()))
        path.append(part)
    return tuple(path)


def plan(text):
    before = tomllib.loads(text)
    newline = "\r\n" if "\r\n" in text else "\n"
    edits = []
    found = set()
    context = ()
    computer_header_end = None
    targets = {**SETTINGS, REMOVED: None}
    for start, end, statement in statements(text):
        stripped = statement.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("["):
            context = table_path(statement)
            if context == ("computer_use",):
                computer_header_end = end
            continue
        equal = assignment_equal(statement)
        key = context + key_path(statement[:equal])
        if key == ("computer_use",):
            raise ConfigError("Inline computer_use table is ambiguous; config unchanged.")
        if key not in targets:
            continue
        found.add(key)
        # Only ordinary one-line string assignments can be safely rewritten.
        value_text = statement[equal + 1:]
        token = re.match(r'''[ \t]*("(?:[^"\\\r\n]|\\[^\r\n])*"|'[^'\r\n]*')''', value_text)
        if (not token or value_text.lstrip().startswith(('"""', "'''"))
                or not re.fullmatch(r"[ \t]*(?:#[^\r\n]*)?(?:\r?\n)?", value_text[token.end():])):
            raise ConfigError(f"Unsupported or multiline {'.'.join(key)}; config unchanged.")
        if key == REMOVED:
            # Keep the inline comment when removing its now-unused assignment.
            comment = value_text[token.end():].lstrip(" \t")
            edits.append((start, end, comment if comment.startswith("#") else
                          newline if statement.endswith("\n") else ""))
        elif get_value(before, key) != targets[key]:
            value_start = equal + 1 + token.start(1)
            value_end = equal + 1 + token.end(1)
            edits.append((start + value_start, start + value_end, f'"{targets[key]}"'))
    computer = before.get("computer_use", {})
    if not isinstance(computer, dict):
        raise ConfigError("Unsupported computer_use value; config unchanged.")
    changes = [(path, desired) for path, desired in SETTINGS.items()
               if get_value(before, path) != desired]
    if REMOVED[0] in before:
        changes.append((REMOVED, None))
    for key in targets:
        if get_value(before, key) is not None and key not in found:
            raise ConfigError(f"Ambiguous {'.'.join(key)}; config unchanged.")
    prefix = "".join(f'{key[0]} = "{value}"{newline}' for key, value in SETTINGS.items()
                     if len(key) == 1 and key not in found)
    if prefix:
        edits.append((0, 0, prefix))
    app_key = ("computer_use", "default_app_access")
    if app_key not in found:
        app_line = f'default_app_access = "allow"{newline}'
        if computer_header_end is not None:
            separator = "" if text[:computer_header_end].endswith("\n") else newline
            edits.append((computer_header_end, computer_header_end, separator + app_line))
        else:
            separator = "" if not text or text.endswith("\n") else newline
            edits.append((len(text), len(text), separator + f"[computer_use]{newline}" + app_line))
    after_text = text
    for start, end, replacement in reversed(sorted(edits, key=lambda edit: (edit[0], edit[1]))):
        after_text = after_text[:start] + replacement + after_text[end:]
    expected = copy.deepcopy(before)
    expected.pop(REMOVED[0], None)
    expected["approval_policy"] = "never"
    expected["sandbox_mode"] = "danger-full-access"
    expected.setdefault("computer_use", {})["default_app_access"] = "allow"
    if not same_config(tomllib.loads(after_text), expected):
        raise ConfigError("Unrelated configuration would change; config unchanged.")
    return after_text, changes


def same_config(left, right):
    """Compare parsed TOML, including NaN, which ordinarily differs from itself."""
    if type(left) is not type(right):
        return False
    if isinstance(left, dict):
        return left.keys() == right.keys() and all(same_config(left[key], right[key]) for key in left)
    if isinstance(left, list):
        return len(left) == len(right) and all(same_config(a, b) for a, b in zip(left, right))
    if isinstance(left, float) and math.isnan(left):
        return math.isnan(right)
    return left == right


def get_value(config, path):
    node = config
    for part in path:
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node


def check_plain_path(path):
    """Never replace a linked file or write backups through a linked directory."""
    for candidate in (path, *path.parents):
        try:
            stat = candidate.lstat()
        except FileNotFoundError:
            continue
        if candidate.is_symlink() or getattr(stat, "st_file_attributes", 0) & 0x400:
            raise ConfigError("Linked configuration or backup path; config unchanged.")


def apply(path, raw, changed):
    check_plain_path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    existed = path.exists()
    if existed and path.read_bytes() != raw:
        raise ConfigError("Configuration changed during planning; retry.")
    backup = None
    if existed:
        backup_root = path.parent / ".harness-backup"
        check_plain_path(backup_root)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        folder = backup_root / stamp
        backup_root.mkdir(mode=0o700, exist_ok=True)
        folder.mkdir(mode=0o700, exist_ok=False)
        backup = folder / "config.toml"
        descriptor = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "wb") as saved:
            saved.write(raw)
        print(f"Backup: {backup}")
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".config-", suffix=".tmp", delete=False) as output:
            temporary = Path(output.name)
            output.write(changed)
            output.flush()
            os.fsync(output.fileno())
        if existed:
            os.chmod(temporary, path.stat().st_mode)
        check_plain_path(path)
        if path.exists() != existed or (existed and path.read_bytes() != raw):
            raise ConfigError("Configuration changed during apply; backup retained, retry.")
        os.replace(temporary, path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--codex-home", type=Path,
                        default=Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex"))
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    try:
        path = args.codex_home / "config.toml"
        raw = path.read_bytes() if path.exists() else b""
        text = raw.decode("utf-8-sig")
        after_text, changes = plan(text)
        for key, value in changes:
            print(f"{'.'.join(key)}: {'remove' if value is None else repr(value)}")
        if not changes:
            print("No changes needed.")
        elif args.apply:
            bom = b"\xef\xbb\xbf" if raw.startswith(b"\xef\xbb\xbf") else b""
            apply(path, raw, bom + after_text.encode("utf-8"))
            print("Applied access settings.")
        return 0
    except (tomllib.TOMLDecodeError, UnicodeError):
        print("Invalid UTF-8 TOML; config unchanged.", file=sys.stderr)
        return 1
    except (ConfigError, OSError) as error:
        # Do not echo configuration values or parser excerpts.
        print(str(error) if isinstance(error, ConfigError) else
              "Cannot access configuration; config unchanged.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
