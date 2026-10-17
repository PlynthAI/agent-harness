"""Optional, read-only OKF v0.2 structural checks. No network or bundle writes."""

from __future__ import annotations

import argparse
from datetime import date, datetime, timezone
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

import yaml


class FrontmatterLoader(yaml.SafeLoader):
    """Keep timestamp spelling so dates without offsets are not silently repaired."""


FrontmatterLoader.yaml_implicit_resolvers = {
    key: [(tag, rx) for tag, rx in values if tag != "tag:yaml.org,2002:timestamp"]
    for key, values in yaml.SafeLoader.yaml_implicit_resolvers.items()
}


def without_code(text: str) -> str:
    lines, fence, length = [], None, 0
    for line in text.splitlines():
        match = re.match(r"^ {0,3}(`{3,}|~{3,})(.*)$", line)
        if fence:
            if match and match[1][0] == fence and len(match[1]) >= length and not match[2].strip():
                fence = None
            continue
        if match:
            fence, length = match[1][0], len(match[1])
            continue
        lines.append(line)
    return re.sub(r"(`+).*?\1", "", "\n".join(lines))


# Markdown backslash escapes apply to ASCII punctuation only.
ESCAPABLE_PUNCTUATION = frozenset("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~")


def is_machine_path(text: str) -> bool:
    r"""Drive-absolute (`C:\` or `C:/`) or UNC (`\\server\share`) spelling."""
    return bool(re.match(r"^[A-Za-z]:[\\/]", text)) or text.startswith("\\\\")


def link_targets(text: str):
    """Inline Markdown destinations and reference definitions, excluding code."""
    clean = without_code(text)
    for match in re.finditer(r"!?\[[^\]\n]*\]\(\s*", clean):
        pos = match.end()
        if pos < len(clean) and clean[pos] == "<":
            end = clean.find(">", pos + 1)
            if end != -1:
                yield clean[pos + 1:end]
            continue
        target, depth = [], 0
        while pos < len(clean):
            char = clean[pos]
            if char == "\\" and pos + 1 < len(clean) and clean[pos + 1] in ESCAPABLE_PUNCTUATION:
                target.append(clean[pos + 1])
                pos += 2
                continue
            if char.isspace() or (char == ")" and depth == 0):
                break
            depth += (char == "(") - (char == ")")
            target.append(char)
            pos += 1
        if target:
            yield "".join(target)
    for match in re.finditer(r"^ {0,3}\[(?!\^)[^\]\n]+\]:\s*(?:<([^>\n]+)>|(\S+))", clean, re.M):
        yield match[1] or match[2]


def check_bundle(directory: Path, quality: bool = False) -> dict:
    root = directory.resolve()
    if not root.is_dir():
        raise ValueError(f"Bundle directory does not exist: {directory}")
    report = {"bundle": str(root), "target": "0.2", "files_checked": 0,
              "concepts_checked": 0, "errors": [], "warnings": []}

    def finding(kind, path, code, message):
        report[kind].append({"path": path, "code": code, "message": message})

    def warn(path, code, message):
        finding("warnings", path, code, message)

    def timestamp(value, path, field):
        try:
            if not isinstance(value, str) or "T" not in value:
                raise ValueError
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if parsed.utcoffset() is None:
                raise ValueError
            return parsed
        except (ValueError, TypeError):
            warn(path, "timestamp", f"{field} should be an ISO 8601 datetime with an explicit offset.")
            return None

    def destination(target, file, path):
        if not target or target.startswith("#"):
            return
        if is_machine_path(target):
            warn(path, "local-path", f"Machine-specific path: {target}")
            return
        try:
            parsed = urlsplit(target)
        except ValueError:
            warn(path, "link", f"Cannot interpret link: {target}")
            return
        if parsed.scheme or parsed.netloc:
            if parsed.scheme == "file" or parsed.hostname in {"localhost", "127.0.0.1", "::1"}:
                warn(path, "local-path", f"Machine-specific resource: {target}")
            return
        raw = unquote(parsed.path)
        if not raw:
            return
        if is_machine_path(raw):
            warn(path, "local-path", f"Machine-specific path: {target}")
            return
        if "\\" in raw:
            warn(path, "path-separator", f"Prefer portable forward slashes: {target}")
        candidate = (root / raw.lstrip("/") if raw.startswith("/") else file.parent / raw).resolve()
        if not candidate.is_relative_to(root):
            warn(path, "outside-bundle", f"Link leaves this bundle: {target}")
        elif not candidate.exists():
            warn(path, "broken-link", f"Target not present in this bundle: {target}")

    for file in sorted(root.rglob("*.md")):
        if not file.is_file():
            continue
        path = file.relative_to(root).as_posix()
        if not file.resolve().is_relative_to(root):
            warn(path, "outside-bundle", "Skipped symlink to a file outside the bundle.")
            continue
        report["files_checked"] += 1
        try:
            text = file.read_text(encoding="utf-8-sig")
        except UnicodeDecodeError:
            finding("errors", path, "encoding", "Markdown must be UTF-8.")
            continue
        lines, metadata, body = text.splitlines(), None, text
        has_frontmatter = bool(lines and lines[0] == "---")
        if has_frontmatter:
            try:
                end = lines.index("---", 1)
                metadata = yaml.load("\n".join(lines[1:end]), Loader=FrontmatterLoader)
                body = "\n".join(lines[end + 1:])
                if not isinstance(metadata, dict):
                    raise ValueError("Frontmatter must be a YAML mapping.")
            except (ValueError, yaml.YAMLError) as exc:
                finding("errors", path, "frontmatter", f"Invalid frontmatter: {exc}")
                continue
        if file.name == "index.md":
            if has_frontmatter and (file.parent != root or set(metadata) - {"okf_version"}):
                finding("errors", path, "index-frontmatter", "Only a root index may carry the okf_version key.")
            if metadata and metadata.get("okf_version") != "0.2":
                warn(path, "version", "Unfamiliar version declaration; checking known v0.2 structure.")
            if not re.search(r"^#{1,6}\s+\S", without_code(body), re.M):
                finding("errors", path, "index-structure", "An index should group its contents under Markdown headings.")
        elif file.name == "log.md":
            if has_frontmatter:
                finding("errors", path, "log-frontmatter", "Use date-grouped log entries, without frontmatter.")
            dates = []
            for heading in re.findall(r"^##\s+(.+?)\s*$", without_code(body), re.M):
                try:
                    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", heading):
                        raise ValueError
                    dates.append(date.fromisoformat(heading))
                except ValueError:
                    finding("errors", path, "log-date", f"Expected YYYY-MM-DD date heading: {heading}")
            if dates != sorted(dates, reverse=True):
                finding("errors", path, "log-order", "Log date groups should be newest first.")
        else:
            report["concepts_checked"] += 1
            if not metadata or not isinstance(metadata.get("type"), str) or not metadata["type"].strip():
                finding("errors", path, "type", "A concept needs YAML frontmatter with a nonempty string type.")
                continue
            if "status" in metadata and metadata["status"] not in ("draft", "stable", "deprecated"):
                warn(path, "status", "Unrecognized optional status; use draft, stable or deprecated.")
            for field in ("generated", "verified"):
                if field not in metadata:
                    continue
                value = metadata[field]
                events = value if field == "verified" and isinstance(value, list) else [value]
                for event in events:
                    if not isinstance(event, dict) or not isinstance(event.get("by"), str) or not event["by"].strip():
                        warn(path, "actor", f"{field} should name an actor in by.")
                        continue
                    if "at" in event:
                        timestamp(event["at"], path, f"{field}.at")
                    elif field == "verified":
                        warn(path, "verification-time", "A verification event should record at.")
            if "stale_after" in metadata:
                instant = timestamp(metadata["stale_after"], path, "stale_after")
                if instant and instant <= datetime.now(timezone.utc):
                    warn(path, "stale", "This concept is at or past stale_after.")
            if "sources" in metadata:
                if not isinstance(metadata["sources"], list):
                    warn(path, "sources", "Optional sources should be a list of source mappings.")
                else:
                    for source in metadata["sources"]:
                        if not isinstance(source, dict) or not isinstance(source.get("resource"), str) or not source["resource"].strip():
                            warn(path, "source-resource", "Each source should contain a resource string.")
                            continue
                        if "last_modified" in source:
                            timestamp(source["last_modified"], path, "sources.last_modified")
                        resource = source["resource"]
                        # Scope descriptors are also permitted; only inspect recognizable paths/URLs.
                        if "://" in resource or resource.startswith(("/", "./", "../")) or resource.endswith(".md"):
                            destination(resource, file, path)
            if isinstance(metadata.get("resource"), str):
                destination(metadata["resource"], file, path)
            if quality:
                for field in ("title", "description"):
                    if not metadata.get(field):
                        warn(path, "editorial", f"Consider adding {field}; it is optional in OKF.")
                project = metadata.get("x_project")
                if not isinstance(project, dict) or project.get("owner") in (None, "", "unassigned"):
                    warn(path, "editorial", "Consider naming an owner; x_project is optional.")
                if "TODO" in text:
                    warn(path, "draft-content", "Unfilled TODO content remains.")
        for target in link_targets(body):
            destination(target, file, path)
    return report


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--json", action="store_true", dest="as_json")
    parser.add_argument("--quality", action="store_true", help="Add advisory editorial checks.")
    args = parser.parse_args(argv)
    try:
        result = check_bundle(args.bundle, args.quality)
    except (OSError, ValueError) as exc:
        print(json.dumps({"tool_error": str(exc)}) if args.as_json else f"Cannot check bundle: {exc}")
        return 2
    if args.as_json:
        print(json.dumps(result, indent=2))
    else:
        print(f"{result['files_checked']} Markdown files, {result['concepts_checked']} concepts; "
              f"{len(result['errors'])} core errors, {len(result['warnings'])} advisory warnings.")
        for kind in ("errors", "warnings"):
            for item in result[kind]:
                print(f"{kind[:-1].upper()} {item['path']} [{item['code']}]: {item['message']}")
        print("Structure only; external links and factual accuracy were not verified.")
    return 1 if result["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
