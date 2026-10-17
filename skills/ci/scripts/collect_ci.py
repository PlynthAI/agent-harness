#!/usr/bin/env python3
"""Read-only GitHub Actions inventory through an already-authenticated gh CLI.

Python 3.10+, standard library only. Exports retained run/job/step metadata,
including old execution attempts. Does not execute repository code, download
logs, change workflows, dispatch runs, retrieve secrets, or calculate invoices.
Dates select RUN CREATION time, UTC [since, until), not a billing-period ledger.
See METRICS.md for limitations, attribution and required-check reconstruction.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
import uuid
from typing import Any, Callable
from urllib.parse import urlencode

UTC = timezone.utc
API_VERSION = "2026-03-10"
PAGE_SIZE = 100
RUN_SEARCH_LIMIT = 1000
Json = dict[str, Any]
Getter = Callable[[str, dict[str, Any]], Json]


class CollectionError(RuntimeError):
    """An incomplete or invalid collection; never silently report completeness."""


def parse_time(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    return result.astimezone(UTC) if result.tzinfo else None


def iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def parse_date(value: str) -> datetime:
    try:
        return datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=UTC)
    except ValueError as error:
        raise argparse.ArgumentTypeError("Use a UTC date in YYYY-MM-DD format.") from error


def elapsed(start: str | None, end: str | None) -> float | None:
    first, last = parse_time(start), parse_time(end)
    if first is None or last is None or last < first:
        return None
    return (last - first).total_seconds()


def job_execution(job: Json) -> tuple[float | None, str | None]:
    """Skipped jobs consume no runner time, even with reversed synthetic dates."""
    if job.get("conclusion") == "skipped":
        return 0.0, None
    steps = job.get("steps") or []
    # A completed cancellation with no runner assignment and no execution
    # evidence is distinguishable from a running/cancelled partial job.
    if (job.get("status") == "completed" and job.get("conclusion") == "cancelled"
            and job.get("runner_id") is None and not steps):
        if not job.get("started_at"):
            return 0.0, "cancelled_before_runner_assignment"
        return None, "cancelled_allocation_unknown"
    if job.get("status") != "completed":
        return None, "not_completed_at_collection"
    seconds = elapsed(job.get("started_at"), job.get("completed_at"))
    return (seconds, None) if seconds is not None else (None, "missing_or_invalid_execution_dates")


def gh_get(path: str, params: dict[str, Any]) -> Json:
    """Fixed GET method, no shell, bounded retries for transient failures."""
    endpoint = path + ("?" + urlencode(params) if params else "")
    command = ["gh", "api", "--hostname", "github.com", "--method", "GET", endpoint,
               "-H", "Accept: application/vnd.github+json",
               "-H", f"X-GitHub-Api-Version: {API_VERSION}"]
    env = os.environ.copy()
    env["GH_PROMPT_DISABLED"] = "1"
    for attempt in range(4):
        try:
            result = subprocess.run(command, text=True, capture_output=True,
                                    timeout=120, check=False, env=env)
        except (OSError, subprocess.TimeoutExpired) as error:
            if attempt < 3 and isinstance(error, subprocess.TimeoutExpired):
                time.sleep(2 ** attempt)
                continue
            raise CollectionError(f"gh request failed for {path}: {type(error).__name__}") from error
        if result.returncode == 0:
            try:
                payload = json.loads(result.stdout)
            except json.JSONDecodeError as error:
                raise CollectionError(f"Non-JSON response from {path}.") from error
            if not isinstance(payload, dict):
                raise CollectionError(f"Expected an object from {path}.")
            return payload
        transient = bool(re.search(r"HTTP (429|5\d\d)\b", result.stderr))
        if transient and attempt < 3:
            time.sleep(2 ** attempt)
            continue
        # gh's stderr is useful for permission/rate-limit failures, but avoid
        # copying it into the exported report or printing arbitrary payloads.
        status = re.search(r"HTTP (\d{3})\b", result.stderr)
        label = status.group(1) if status else "unknown"
        raise CollectionError(
            f"GitHub GET failed (HTTP {label}) for {path}. Check gh authentication, "
            "Actions:read permission and rate limits. Partial exports are marked incomplete."
        )
    raise CollectionError("Retry budget exhausted.")


def all_pages(get: Getter, path: str, params: dict[str, Any], key: str,
              first: Json | None = None) -> list[Json]:
    page, expected, by_id = 1, None, {}
    while True:
        data = first if page == 1 and first is not None else get(
            path, {**params, "per_page": PAGE_SIZE, "page": page})
        items, count = data.get(key), data.get("total_count")
        if not isinstance(items, list) or not isinstance(count, int) or count < 0:
            raise CollectionError(f"Malformed paginated response: {path}.")
        if expected is None:
            expected = count
        elif expected != count:
            raise CollectionError(f"Collection changed during pagination: {path}; collect again.")
        for item in items:
            if not isinstance(item, dict) or not isinstance(item.get("id"), int):
                raise CollectionError(f"Missing stable ID in {path}.")
            by_id[item["id"]] = item
        if len(items) < PAGE_SIZE or page * PAGE_SIZE >= count:
            break
        page += 1
    if len(by_id) != expected:
        raise CollectionError(
            f"Incomplete pagination for {path}: got {len(by_id)}, expected {expected}.")
    return list(by_id.values())


def runs_in_window(get: Getter, repo: str, start: datetime, end: datetime) -> list[Json]:
    """Split crowded windows to avoid GitHub's 1,000-result filtered-search cap."""
    seconds = int((end - start).total_seconds())
    if seconds < 1:
        return []
    path = f"repos/{repo}/actions/runs"
    # GitHub range boundaries are inclusive. Convert our exclusive end to the
    # last included whole second, avoiding duplicates at daily split boundaries.
    params = {"created": f"{iso(start)}..{iso(end - timedelta(seconds=1))}"}
    first = get(path, {**params, "per_page": PAGE_SIZE, "page": 1})
    count = first.get("total_count")
    if not isinstance(count, int) or count < 0:
        raise CollectionError(f"Missing run count for {repo}.")
    if count >= RUN_SEARCH_LIMIT:
        if seconds <= 1:
            raise CollectionError("At least 1,000 runs share one second; cannot prove completeness.")
        middle = start + timedelta(seconds=seconds // 2)
        return runs_in_window(get, repo, start, middle) + runs_in_window(get, repo, middle, end)
    runs = all_pages(get, path, params, "workflow_runs", first)
    for run in runs:
        created = parse_time(run.get("created_at"))
        if created is None or not start <= created < end:
            raise CollectionError("GitHub returned a run outside the requested creation window.")
    return runs


def list_runs(get: Getter, repo: str, start: datetime, end: datetime) -> list[Json]:
    by_id: dict[int, Json] = {}
    cursor = start
    while cursor < end:
        next_cursor = min(cursor + timedelta(days=1), end)
        for run in runs_in_window(get, repo, cursor, next_cursor):
            by_id[run["id"]] = run
        cursor = next_cursor
    return sorted(by_id.values(), key=lambda run: (run["created_at"], run["id"]))


def run_row(repo: str, run: Json) -> Json:
    return {"repository": repo, "run_id": run["id"], "workflow_name": run.get("name"),
            "workflow_path": run.get("path"), "workflow_id": run.get("workflow_id"),
            "event": run.get("event"), "head_sha": run.get("head_sha"),
            "head_branch": run.get("head_branch"), "created_at": run.get("created_at"),
            "latest_attempt_started_at": run.get("run_started_at"),
            "updated_at": run.get("updated_at"),
            "latest_attempt": run.get("run_attempt"), "latest_status": run.get("status"),
            "latest_conclusion": run.get("conclusion"), "url": run.get("html_url"),
            "pull_requests": [{"number": pr.get("number"),
                               "head_sha": (pr.get("head") or {}).get("sha"),
                               "base_sha": (pr.get("base") or {}).get("sha")}
                              for pr in run.get("pull_requests", [])]}


def job_row(repo: str, run: Json, job: Json) -> Json:
    seconds, note = job_execution(job)
    return {"repository": repo, "run_id": run["id"], "job_id": job["id"],
            "run_attempt": job.get("run_attempt"), "job_name": job.get("name"),
            "workflow_path": run.get("path"), "event": run.get("event"),
            "head_sha": job.get("head_sha"), "status": job.get("status"),
            "conclusion": job.get("conclusion"), "labels": job.get("labels", []),
            "runner_group_name": job.get("runner_group_name"),
            "runner_assigned": job.get("runner_id") is not None,
            "created_at": job.get("created_at"), "started_at": job.get("started_at"),
            "completed_at": job.get("completed_at"), "execution_seconds": seconds,
            "execution_note": note,
            # This is an observation, NOT a dependency-aware queue metric.
            "observed_prestart_seconds": elapsed(job.get("created_at"), job.get("started_at")),
            "url": job.get("html_url")}


def step_rows(repo: str, run: Json, job: Json) -> list[Json]:
    result = []
    for step in job.get("steps") or []:
        duration = 0.0 if step.get("conclusion") == "skipped" else elapsed(
            step.get("started_at"), step.get("completed_at"))
        result.append({"repository": repo, "run_id": run["id"], "job_id": job["id"],
                       "run_attempt": job.get("run_attempt"), "number": step.get("number"),
                       "name": step.get("name"), "status": step.get("status"),
                       "conclusion": step.get("conclusion"), "started_at": step.get("started_at"),
                       "completed_at": step.get("completed_at"), "duration_seconds": duration})
    return result


def write_json(path: Path, value: Any) -> None:
    temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
    try:
        temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        for attempt in range(10):
            try:
                os.replace(temporary, path)
                break
            except PermissionError as error:
                if (sys.platform != "win32" or getattr(error, "winerror", None) not in (5, 32)
                        or attempt == 9):
                    raise
                time.sleep(0.05)
    finally:
        temporary.unlink(missing_ok=True)


def attempt_coverage(run: Json, jobs: list[Json]) -> Json:
    latest = run.get("run_attempt")
    declared = list(range(1, latest + 1)) if type(latest) is int and latest > 0 else None
    observed = sorted({job["run_attempt"] for job in jobs
                       if type(job.get("run_attempt")) is int and job["run_attempt"] > 0})
    missing_metadata = sum(type(job.get("run_attempt")) is not int or
                           job.get("run_attempt", 0) < 1 for job in jobs)
    return {
        "run_id": run["id"],
        "declared_attempts": declared,
        "observed_job_bearing_attempts": observed,
        "attempts_without_observed_jobs": sorted(set(declared) - set(observed))
        if declared is not None else None,
        "observed_attempts_beyond_declared": sorted(set(observed) - set(declared))
        if declared is not None else None,
        "jobs_without_valid_attempt": missing_metadata,
        "interpretation": "An attempt without observed jobs is a metadata gap or a legitimate empty attempt; execution is unknown.",
    }


def snapshot_identity(repo: str, run: Json) -> str:
    # Only the exported fields enter the identity; no actor or arbitrary API data is persisted.
    payload = json.dumps(run_row(repo, run), sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:24]


def snapshot_path(out: Path, run: Json, identity: str) -> Path:
    return out / "snapshots" / f"run-{run['id']}-{identity}.json"


def reusable_snapshot(out: Path, repo: str, run: Json) -> Json | None:
    if run.get("status") != "completed":
        return None
    identity = snapshot_identity(repo, run)
    path = snapshot_path(out, run, identity)
    if not path.exists():
        return None
    try:
        snapshot = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise CollectionError(f"Unreadable snapshot for run {run['id']}.") from error
    if (snapshot.get("schema_version") != 1 or snapshot.get("repository") != repo or
            snapshot.get("run_id") != run["id"] or snapshot.get("identity") != identity or
            not isinstance(snapshot.get("jobs"), list) or
            not isinstance(snapshot.get("steps"), list)):
        raise CollectionError(f"Invalid snapshot for run {run['id']}.")
    return snapshot


def capture_run(get: Getter, out: Path, repo: str, run: Json) -> Json:
    jobs = all_pages(get, f"repos/{repo}/actions/runs/{run['id']}/jobs",
                     {"filter": "all"}, "jobs")
    snapshot = {
        "schema_version": 1, "repository": repo, "run_id": run["id"],
        "captured_at": iso(datetime.now(UTC)),
        "identity": snapshot_identity(repo, run), "run": run_row(repo, run),
        "jobs": [job_row(repo, run, job) for job in jobs],
        "steps": [step for job in jobs for step in step_rows(repo, run, job)],
        "attempt_coverage": attempt_coverage(run, jobs),
    }
    path = snapshot_path(out, run, snapshot["identity"])
    # Active runs can change jobs without an updated inventory timestamp. Keep
    # every capture immutable and refresh active runs on every invocation.
    if run.get("status") != "completed":
        path = path.with_name(path.stem + "-" + uuid.uuid4().hex + path.suffix)
    if not path.exists():
        write_json(path, snapshot)
    return snapshot


def write_aggregates(out: Path, snapshots: list[Json], manifest: Json) -> None:
    totals: dict[str, float] = defaultdict(float)
    outcomes: Counter[str] = Counter()
    temporary = [out / (name + "." + uuid.uuid4().hex + ".tmp")
                 for name in ("runs.jsonl", "jobs.jsonl", "steps.jsonl")]
    try:
        with temporary[0].open("w", encoding="utf-8") as rf, \
                temporary[1].open("w", encoding="utf-8") as jf, \
                temporary[2].open("w", encoding="utf-8") as sf:
            for snapshot in snapshots:
                rf.write(json.dumps(snapshot["run"], ensure_ascii=False) + "\n")
                manifest["run_count"] += 1
                coverage = snapshot["attempt_coverage"]
                manifest["attempt_coverage"].append(coverage)
                for row in snapshot["jobs"]:
                    jf.write(json.dumps(row, ensure_ascii=False) + "\n")
                    manifest["job_count"] += 1
                    if type(row.get("run_attempt")) is not int or row["run_attempt"] < 1:
                        manifest["missing_attempt_jobs"] += 1
                    if row["execution_seconds"] is None:
                        manifest["unknown_execution_jobs"] += 1
                    else:
                        totals[str(row.get("workflow_path"))] += row["execution_seconds"]
                    outcomes[str(row.get("conclusion") or row.get("status"))] += 1
                for step in snapshot["steps"]:
                    sf.write(json.dumps(step, ensure_ascii=False) + "\n")
                    manifest["step_count"] += 1
        for source, name in zip(temporary, ("runs.jsonl", "jobs.jsonl", "steps.jsonl")):
            os.replace(source, out / name)
        write_json(out / "summary.json", {
            "label": "Observed unweighted job execution; not cost or critical-path latency",
            "observed_execution_seconds_by_workflow": dict(totals),
            "job_outcomes": dict(outcomes),
            "unknown_execution_jobs": manifest["unknown_execution_jobs"],
            "note": "Unknown durations are excluded, never filled with zero. Read collection.json."
        })
    finally:
        for path in temporary:
            path.unlink(missing_ok=True)


def collect(repo: str, start: datetime, end: datetime, out: Path, get: Getter = gh_get,
            resume: bool = False, max_runs: int | None = None) -> Json:
    if max_runs is not None and max_runs < 1:
        raise CollectionError("--max-runs must be positive.")
    if resume:
        try:
            previous = json.loads((out / "collection.json").read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            raise CollectionError("--resume requires an existing collection.json.") from error
        if (previous.get("schema_version") != 2 or previous.get("repository") != repo or
                previous.get("created_since_inclusive_utc") != iso(start) or
                previous.get("created_until_exclusive_utc") != iso(end) or
                previous.get("api_version") != API_VERSION):
            raise CollectionError("--resume repository, window, or collector configuration differs.")
    else:
        previous = {}
    out.mkdir(parents=True, exist_ok=True)
    if not resume and any(out.iterdir()):
        raise CollectionError(f"Output directory must be empty: {out}")
    (out / "snapshots").mkdir(exist_ok=True)
    manifest: Json = {"schema_version": 2, "repository": repo,
                      "created_since_inclusive_utc": iso(start),
                      "created_until_exclusive_utc": iso(end),
                      "collection_started_at": iso(datetime.now(UTC)),
                      "api_version": API_VERSION, "complete": False,
                      "run_count": 0, "job_count": 0, "step_count": 0,
                      "unknown_execution_jobs": 0, "missing_attempt_jobs": 0,
                      "attempt_coverage": [], "pending_runs": None,
                      "reused_runs": 0, "refreshed_runs": 0,
                      "scope": "retained runs created in window; jobs from all their attempts",
                      "limitations": ["Not a billing-period ledger or invoice",
                                      "No required-check, review or merge-eligibility reconstruction",
                                      "No exact runner-queue decomposition",
                                      "Deleted runs, historical rules and expired logs are not recovered",
                                      "A run collection is not an atomic GitHub snapshot"]}
    write_json(out / "collection.json", manifest)
    # Prior aggregates must never look current if inventory or refresh fails.
    for name in ("summary.json", "runs.jsonl", "jobs.jsonl", "steps.jsonl"):
        (out / name).unlink(missing_ok=True)
    collection_error: BaseException | None = None
    try:
        runs = list_runs(get, repo, start, end)
        manifest["inventory_refreshed_at"] = iso(datetime.now(UTC))
        snapshots: dict[int, Json] = {}
        pending: list[Json] = []
        for run in runs:
            saved = reusable_snapshot(out, repo, run)
            if saved is None:
                pending.append(run)
            else:
                snapshots[run["id"]] = saved
                manifest["reused_runs"] += 1
        if max_runs is not None and previous.get("last_refreshed_run_id") is not None:
            cursor = previous["last_refreshed_run_id"]
            # Rotate capped refreshes so repeatedly changing active runs cannot
            # permanently keep later runs out of the checkpoint.
            after = [run for run in pending if run["id"] > cursor]
            before = [run for run in pending if run["id"] <= cursor]
            pending = after + before
        for run in pending[:max_runs]:
            snapshots[run["id"]] = capture_run(get, out, repo, run)
            manifest["last_refreshed_run_id"] = run["id"]
            manifest["refreshed_runs"] += 1
        remaining = len(pending) - min(len(pending), max_runs or len(pending))
        manifest["pending_runs"] = remaining
        manifest["inventory_run_count"] = len(runs)
        manifest["snapshotted_runs"] = len(snapshots)
        if remaining == 0:
            write_aggregates(out, [snapshots[run["id"]] for run in runs], manifest)
            manifest["complete"] = True  # Pagination complete; quality flags still apply.
        else:
            manifest["incomplete_reason"] = "max_runs_reached"
    except BaseException as error:
        manifest["error"] = str(error)
        collection_error = error
        raise
    finally:
        manifest["collection_finished_at"] = iso(datetime.now(UTC))
        try:
            write_json(out / "collection.json", manifest)
        except Exception as checkpoint_error:
            if collection_error is None:
                raise
            if hasattr(collection_error, "add_note"):
                collection_error.add_note(f"Final collection checkpoint failed: {checkpoint_error}")
            else:
                collection_error.__context__ = checkpoint_error
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", required=True, help="GitHub repository in OWNER/NAME form")
    parser.add_argument("--since", required=True, type=parse_date, help="Inclusive UTC creation date")
    parser.add_argument("--until", required=True, type=parse_date, help="Exclusive UTC creation date")
    parser.add_argument("--out", required=True, type=Path, help="New or empty local output directory")
    parser.add_argument("--resume", action="store_true", help="Resume a matching output; refresh inventory and changed or active runs")
    parser.add_argument("--max-runs", type=int, help="Maximum run job refreshes this invocation; leaves an incomplete checkpoint")
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*/[A-Za-z0-9][A-Za-z0-9_.-]*", args.repo):
        parser.error("--repo must be an OWNER/NAME repository, not a URL or path.")
    if args.since >= args.until:
        parser.error("--since must be earlier than --until.")
    if args.until > datetime.now(UTC):
        parser.error("--until must not be in the future.")
    if not shutil.which("gh"):
        parser.error("GitHub CLI (gh) is required; use an authenticated installation with Actions:read.")
    try:
        result = collect(args.repo, args.since, args.until, args.out,
                         resume=args.resume, max_runs=args.max_runs)
    except (CollectionError, OSError, ValueError) as error:
        print(f"Collection failed: {error}", file=sys.stderr)
        return 1
    if not result["complete"]:
        print(f"Checkpointed {result['snapshotted_runs']} runs; "
              f"{result['pending_runs']} pending in {args.out}. Resume with --resume.")
        return 2
    print(f"Collected {result['run_count']} runs, {result['job_count']} jobs, "
          f"{result['step_count']} steps into {args.out}")
    print("Check collection.json quality flags before analysis; billing and gate timings remain unjoined.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
