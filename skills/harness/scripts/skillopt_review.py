#!/usr/bin/env python3
"""Evaluate one bounded change to one shared skill with SkillOpt-Sleep.

The runner owns everything around the upstream engine: it validates a reviewed
case set, pins the exact source it evaluates (including uncommitted edits),
builds an isolated sandbox so neither the installed skills nor the operator's
own SkillOpt configuration can leak in, runs the engine at a pinned revision
with a frozen configuration, scores the untouched test split for the baseline
and the candidate itself, and stages a surviving candidate as a review packet
under the canonical checkout's .local/proposals. It never adopts, commits or
deploys anything. See references/nightly-review.md.

  python skillopt_review.py setup
  python skillopt_review.py check --cases CASES.json
  python skillopt_review.py run   --cases CASES.json [--backend mock]

Exit codes: 0 finished (candidate staged, quiet night or skipped), 1 runtime or
engine failure, 2 rejected input.
"""
from __future__ import annotations

import argparse
import datetime as _dt
import difflib
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path

PIN = "79124b37e9a6371e13b753f8bcd7adb1e493ade1"
PACKAGE = f"skillopt @ git+https://github.com/microsoft/SkillOpt@{PIN}"
CASES_FORMAT = "harness.skillopt.cases.v1"
SPLITS = ("train", "val", "test")
MIN_HOLDOUT = 2
LOCK_STALE_SECONDS = 12 * 3600
# Upstream scores an unknown op as passed, so only its known text ops are
# accepted. tool_called is refused: the pilot replays text only, and upstream's
# tool paths hand a real CLI shell access outside the sandbox.
SHAPE_OPS = {"section_present", "section_contains", "max_chars", "min_chars", "no_refusal"}
OUTCOME_OPS = {"regex", "contains", "not_contains"}
BACKENDS = {"mock", "codex", "claude", "azure_openai", "copilot", "cursor", "pi", "opencode"}
SKILL_NAME = re.compile(r"^[a-z0-9][a-z0-9-]*$")

# The engine settings the pilot freezes. The runner builds the config itself,
# so ~/.skillopt-sleep/config.json is never read; the engine's environment is
# scrubbed of SKILLOPT_SLEEP_* overrides (including the prompts file) as well.
FROZEN = {
    "evolve_skill": True,
    "evolve_memory": False,
    "auto_adopt": False,
    "gate_mode": "on",
    "gate_metric": "mixed",
    "gate_no_regression": True,
    "edit_budget": 2,
    "dream_rollouts": 1,
    "dream_factor": 0,
    "recall_k": 0,
    "multi_skill_fanout": False,
    "multi_skill_report": False,
    "llm_mine": False,
    "target_task_filter": False,
    "evidence_log": True,
    "redact_secrets": True,
    "preferences": "",
    "seed": 42,
}


class Rejected(Exception):
    """Input the runner refuses; exit 2."""


# ── paths ────────────────────────────────────────────────────────────────────

def default_source() -> Path:
    return Path(__file__).resolve().parents[3]


def canonical_checkout(source: Path) -> Path:
    """The checkout that owns .local, shared by every worktree of the source.

    Only a source at the root of its own work tree has one; a source folder
    nested inside some other repository keeps its .local to itself.
    """
    try:
        out = subprocess.run(
            ["git", "-C", str(source), "rev-parse", "--path-format=absolute",
             "--show-toplevel", "--git-common-dir"],
            capture_output=True, text=True, check=True,
        ).stdout.split("\n")
        if Path(out[0].strip()).resolve() != source.resolve():
            return source
        return Path(out[1].strip()).resolve().parent
    except (OSError, IndexError, subprocess.CalledProcessError):
        return source


def review_root(source: Path, workspace: str | None) -> Path:
    if workspace:
        return Path(workspace).resolve()
    return canonical_checkout(source) / ".local" / "workspace" / "artifacts" / "skillopt-review"


def engine_python(root: Path, explicit: str | None) -> Path:
    if explicit:
        return Path(explicit)
    env = os.environ.get("HARNESS_SKILLOPT_PYTHON")
    if env:
        return Path(env)
    scripts = "Scripts" if os.name == "nt" else "bin"
    exe = "python.exe" if os.name == "nt" else "python"
    return root / "engine" / ".venv" / scripts / exe


def inside(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def inside_work_tree(path: Path) -> bool:
    out = subprocess.run(["git", "-C", str(path), "rev-parse", "--is-inside-work-tree"],
                         capture_output=True, text=True)
    return out.stdout.strip() == "true"


def engine_env(sandbox: Path, settings: dict) -> dict:
    """The engine's environment without the operator's SkillOpt overrides.

    SKILLOPT_SLEEP_* variables change workers, models, CLI paths and the prompts
    file; the prompts file is pointed into the sandbox so ~/.skillopt-sleep is
    never read. Azure credentials pass only when an Azure backend was chosen.
    """
    env = {k: v for k, v in os.environ.items() if not k.upper().startswith("SKILLOPT_SLEEP_")}
    env["SKILLOPT_SLEEP_PROMPTS_PATH"] = str(sandbox / "home" / "prompts.json")
    # CLI backends make their own clean working folders under the temp root;
    # keeping those in the sandbox keeps them outside any repository as well.
    for name in ("TEMP", "TMP", "TMPDIR"):
        env[name] = str(sandbox / "tmp")
    backends = {settings.get(k) for k in ("backend", "optimizer_backend", "target_backend")}
    if "azure_openai" not in backends:
        env = {k: v for k, v in env.items() if not k.upper().startswith("AZURE_OPENAI_")}
    return env


# ── case set ─────────────────────────────────────────────────────────────────

def normalise_intent(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", text.lower())).strip()


def backend_roles(args) -> list[str]:
    """Every backend the run would call, each checked against the known names."""
    roles = [args.backend] + [b for b in (getattr(args, "optimizer_backend", ""),
                                          getattr(args, "target_backend", "")) if b]
    unknown = [b for b in roles if b not in BACKENDS]
    if unknown:
        # Upstream silently falls back to mock for an unknown name, which would
        # label mock scores as model evidence.
        raise Rejected(f"unknown backend {', '.join(unknown)}; use one of {', '.join(sorted(BACKENDS))}")
    return roles


def load_cases(path: Path, source: Path, model_backed: bool) -> dict:
    try:
        cases = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise Rejected(f"cannot read case set {path}: {exc}") from exc
    if not isinstance(cases, dict) or cases.get("format") != CASES_FORMAT:
        raise Rejected(f"case set must be a JSON object with format {CASES_FORMAT!r}")
    errors: list[str] = []

    skill = cases.get("skill")
    if not isinstance(skill, str) or not SKILL_NAME.match(skill):
        errors.append("'skill' must name one shared skill folder")
    elif not (source / "skills" / skill / "SKILL.md").is_file():
        errors.append(f"skills/{skill}/SKILL.md does not exist in {source}")
    if not str(cases.get("issue") or "").strip():
        errors.append("'issue' must state the one coherent problem being evaluated")
    if not isinstance(cases.get("reviewed"), bool):
        errors.append("'reviewed' must be true or false")
    elif model_backed and cases["reviewed"] is not True:
        errors.append("a model-backed run needs a reviewed case set ('reviewed': true)")

    context = cases.get("context", [])
    if not isinstance(context, list) or not all(isinstance(c, str) for c in context):
        errors.append("'context' must be a list of source-relative paths")
    else:
        for rel in context:
            full = (source / rel)
            if Path(rel).is_absolute() or not inside(full, source):
                errors.append(f"context path escapes the source: {rel}")
            elif not full.is_file():
                errors.append(f"context file does not exist: {rel}")

    tasks = cases.get("tasks")
    if not isinstance(tasks, list) or not tasks:
        errors.append("'tasks' must be a non-empty list")
        tasks = []
    ids: set[str] = set()
    group_split: dict[str, str] = {}
    intent_split: dict[str, str] = {}
    counts = {s: 0 for s in SPLITS}
    for n, task in enumerate(tasks, 1):
        if not isinstance(task, dict):
            errors.append(f"task #{n} is not an object")
            continue
        tid = str(task.get("id") or "")
        label = f"task {tid or '#' + str(n)}"
        if not tid:
            errors.append(f"{label}: missing id")
        elif tid in ids:
            errors.append(f"{label}: duplicate id")
        ids.add(tid)
        split = task.get("split")
        if split not in SPLITS:
            errors.append(f"{label}: split must be one of {', '.join(SPLITS)}")
            continue
        counts[split] += 1
        group = str(task.get("group") or "")
        if not group:
            errors.append(f"{label}: 'group' names the incident it belongs to; variants share it")
        elif group_split.setdefault(group, split) != split:
            errors.append(f"{label}: group {group!r} spans {group_split[group]} and {split}; keep an incident in one split")
        intent = str(task.get("intent") or "")
        if not intent.strip():
            errors.append(f"{label}: missing intent")
        else:
            key = normalise_intent(intent)
            if intent_split.setdefault(key, split) != split:
                errors.append(f"{label}: the same intent appears in {intent_split[key]} and {split}")
        kind = task.get("reference_kind")
        if kind == "rule":
            checks = (task.get("judge") or {}).get("checks") if isinstance(task.get("judge"), dict) else None
            ops = [c.get("op") if isinstance(c, dict) else None for c in checks] if isinstance(checks, list) else []
            bad = [str(op) for op in ops if op not in SHAPE_OPS | OUTCOME_OPS]
            if not ops:
                errors.append(f"{label}: a rule task needs judge.checks")
            elif bad:
                errors.append(f"{label}: unsupported judge op(s) {', '.join(bad)}; use {', '.join(sorted(SHAPE_OPS | OUTCOME_OPS))}")
            elif not any(op in OUTCOME_OPS for op in ops):
                errors.append(f"{label}: judge checks only the shape of the answer; add an outcome check")
        elif kind == "exact":
            if not str(task.get("reference") or "").strip():
                errors.append(f"{label}: an exact task needs a reference")
        else:
            errors.append(f"{label}: reference_kind must be 'rule' or 'exact' (deterministic scoring)")
        if task.get("origin", "real") != "real":
            errors.append(f"{label}: only real cases belong in the set; synthetic expansion is off")

    if counts["train"] < 1:
        errors.append("at least one train task is needed")
    for split in ("val", "test"):
        if counts[split] < MIN_HOLDOUT:
            errors.append(f"{split} has {counts[split]} task(s); at least {MIN_HOLDOUT} are needed")
    if errors:
        raise Rejected("case set rejected:\n  " + "\n  ".join(errors))
    cases["_counts"] = counts
    return cases


# ── source identity ──────────────────────────────────────────────────────────

def text_hash(path: Path) -> str:
    data = path.read_bytes()
    if b"\0" not in data:
        data = data.replace(b"\r\n", b"\n")
    return hashlib.sha256(data).hexdigest()


def source_identity(source: Path, cases: dict) -> dict:
    skill_dir = source / "skills" / cases["skill"]
    files = {}
    for path in sorted(skill_dir.rglob("*")):
        if path.is_file() and "__pycache__" not in path.parts:
            files[path.relative_to(source).as_posix()] = text_hash(path)
    for rel in cases.get("context", []):
        files[Path(rel).as_posix()] = text_hash(source / rel)
    head, dirty = "", None
    try:
        head = subprocess.run(["git", "-C", str(source), "rev-parse", "HEAD"],
                              capture_output=True, text=True, check=True).stdout.strip()
        paths = [f"skills/{cases['skill']}", *cases.get("context", [])]
        dirty = bool(subprocess.run(["git", "-C", str(source), "status", "--porcelain", "--", *paths],
                                    capture_output=True, text=True, check=True).stdout.strip())
    except (OSError, subprocess.CalledProcessError):
        pass
    return {"source": str(source), "head": head, "uncommitted": dirty, "files": files}


def fingerprint(identity: dict, cases_path: Path, settings: dict) -> str:
    blob = json.dumps({"files": identity["files"], "cases": text_hash(cases_path),
                       "settings": settings, "frozen": FROZEN, "pin": PIN,
                       "runner": text_hash(Path(__file__).resolve())}, sort_keys=True)
    return hashlib.sha256(blob.encode()).hexdigest()


# ── lock and index ───────────────────────────────────────────────────────────

class RunLock:
    def __init__(self, path: Path):
        self.path = path
        self.held = False

    def __enter__(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        for _ in range(2):
            try:
                fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            except FileExistsError:
                try:
                    age = time.time() - self.path.stat().st_mtime
                except FileNotFoundError:
                    continue
                if age < LOCK_STALE_SECONDS:
                    raise Rejected(f"another review holds {self.path} ({int(age)}s old); one run at a time")
                print(f"[review] replacing a stale lock ({int(age)}s old)")
                self.path.unlink(missing_ok=True)
                continue
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                json.dump({"pid": os.getpid(), "at": now_iso()}, fh)
            self.held = True
            return self
        raise Rejected(f"could not take {self.path}")

    def __exit__(self, *exc):
        if self.held:
            self.path.unlink(missing_ok=True)


def now_iso() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def read_index(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, path)


# ── commands ─────────────────────────────────────────────────────────────────

def cmd_setup(args) -> int:
    root = review_root(args.source, args.workspace)
    venv = root / "engine" / ".venv"
    python = engine_python(root, None)
    if not python.exists():
        subprocess.run(["uv", "venv", "--quiet", "--python", "3.13", str(venv)], check=True)
    subprocess.run(["uv", "pip", "install", "--quiet", "--python", str(python), PACKAGE], check=True)
    commit = subprocess.run([str(python), str(Path(__file__).resolve()), "_pin"],
                            capture_output=True, text=True).stdout.strip()
    if commit != PIN:
        print(f"[review] installed engine is at {commit or 'an unknown revision'}, expected {PIN}")
        return 1
    print(f"[review] engine ready at {PIN[:10]}: {python}")
    return 0


def cmd_check(args) -> int:
    model_backed = any(b != "mock" for b in backend_roles(args))
    cases = load_cases(args.cases, args.source, model_backed)
    c = cases["_counts"]
    print(f"[review] {args.cases.name}: skill {cases['skill']}, "
          f"{c['train']} train / {c['val']} val / {c['test']} test, reviewed={cases['reviewed']}")
    return 0


def cmd_run(args) -> int:
    source = args.source
    model_backed = any(b != "mock" for b in backend_roles(args))
    cases = load_cases(args.cases, source, model_backed)
    root = review_root(source, args.workspace)
    python = engine_python(root, args.engine_python)
    if not python.exists():
        raise Rejected(f"no SkillOpt engine at {python}; run 'setup' first")
    settings = {k: getattr(args, k) for k in (
        "backend", "model", "optimizer_backend", "optimizer_model",
        "target_backend", "target_model", "codex_path")}
    identity = source_identity(source, cases)
    key = fingerprint(identity, args.cases, settings)
    index_path = root / "runs" / "index.json"

    with RunLock(root / "runs" / ".lock"):
        index = read_index(index_path)
        prior = index.get(key)
        if prior and not args.force:
            print(f"[review] nothing new since run {prior['run']} ({prior['outcome']}); skipped without a model call")
            print(json.dumps({"outcome": "skipped", "run": prior["run"]}))
            return 0

        run_id = f"{_dt.datetime.now(_dt.timezone.utc):%Y%m%dT%H%M%SZ}-{cases['skill']}-{uuid.uuid4().hex[:8]}"
        run_dir = root / "runs" / run_id
        run_dir.mkdir(parents=True)
        # A model-backed sandbox lives outside every Git work tree: a CLI
        # backend such as Codex loads AGENTS.md from the repository root down
        # to its working directory, which inside the harness checkout would
        # hand both arms the workspace route table. The mock backend reads no
        # files. The sandbox moves into the run record afterwards.
        sandbox = Path(tempfile.mkdtemp(prefix="harness-skillopt-"))
        if model_backed and inside_work_tree(sandbox):
            sandbox.rmdir()
            raise Rejected(f"the temporary folder {sandbox.parent} is inside a Git work tree; point TMP outside one")
        project = sandbox / "project"
        skill_copy = project / "skills" / cases["skill"] / "SKILL.md"
        skill_copy.parent.mkdir(parents=True)
        (sandbox / "home").mkdir()
        (sandbox / "tmp").mkdir()
        baseline = (source / "skills" / cases["skill"] / "SKILL.md").read_text(encoding="utf-8")
        skill_copy.write_text(baseline, encoding="utf-8", newline="")
        memory = "".join(
            f"## {Path(rel).as_posix()}\n\n{(source / rel).read_text(encoding='utf-8')}\n\n"
            for rel in cases.get("context", []))
        (project / "CLAUDE.md").write_text(memory, encoding="utf-8", newline="")

        upstream_tasks = []
        for t in cases["tasks"]:
            task = {k: v for k, v in t.items() if k != "group"}
            task.update(project=str(project), origin="real", skill_hint="")
            upstream_tasks.append(task)
        write_json(run_dir / "tasks.json", {
            "format": "skillopt_sleep.tasks.v1", "project": str(project),
            "target_skill_path": str(skill_copy), "reviewed": cases["reviewed"],
            "tasks": upstream_tasks})
        job = {
            "project": str(project), "home": str(sandbox / "home"),
            "tasks_file": str(run_dir / "tasks.json"), "skill_path": str(skill_copy),
            "settings": settings, "codex_path": args.codex_path or "",
            "result": str(run_dir / "engine-result.json"),
        }
        write_json(run_dir / "job.json", job)

        started = time.time()
        try:
            proc = subprocess.run([str(python), str(Path(__file__).resolve()), "_engine", str(run_dir / "job.json")],
                                  env=engine_env(sandbox, settings))
        finally:
            shutil.move(str(sandbox), str(run_dir / "sandbox"))
        elapsed = round(time.time() - started, 1)
        engine_path = run_dir / "engine-result.json"
        if proc.returncode != 0 or not engine_path.exists():
            write_json(run_dir / "result.json", {"outcome": "engine-failed", "exit": proc.returncode, "elapsed_s": elapsed})
            print(f"[review] engine failed (exit {proc.returncode}); see {run_dir}")
            return 1
        engine = json.loads(engine_path.read_text(encoding="utf-8"))

        result = decide(engine, baseline)
        result.update(run=run_id, elapsed_s=elapsed, fingerprint=key, identity=identity,
                      settings=settings, pin=PIN, cases=str(args.cases))
        if source_identity(source, cases)["files"] != identity["files"]:
            result.update(outcome="stale-source",
                          reason="the evaluated source changed during the run; rerun against the current files")
        if result["outcome"] == "candidate":
            result["packet"] = str(stage_packet(source, cases, run_id, result, baseline, engine["candidate"]))
        write_json(run_dir / "result.json", result)
        if result["outcome"] != "stale-source":
            index[key] = {"run": run_id, "outcome": result["outcome"], "at": now_iso()}
            write_json(index_path, index)

    print(f"[review] {cases['skill']}: {result['outcome']} - {result['reason']}")
    print(f"[review] gate (val, mixed) {fmt(engine['val_baseline'])} -> {fmt(engine['val_candidate'])}, "
          f"test (mean soft) {fmt(result['test_baseline'])} -> {fmt(result['test_candidate'])}, "
          f"{engine['calls']} backend call(s) incl. cached and locally judged, ~{engine['tokens']} tokens, {elapsed}s")
    if result.get("packet"):
        print(f"[review] packet: {result['packet']}")
    print(json.dumps({"outcome": result["outcome"], "run": run_id, "packet": result.get("packet", "")}))
    return 0


def fmt(x) -> str:
    return "-" if x is None else f"{x:.3f}"


def decide(engine: dict, baseline: str) -> dict:
    test = engine["test"]
    base = [r["baseline"] for r in test]
    cand = [r["candidate"] for r in test if r["candidate"] is not None]
    out = {
        "test_baseline": sum(s["soft"] for s in base) / len(base) if base else None,
        "test_candidate": sum(s["soft"] for s in cand) / len(cand) if cand else None,
        "test": test, "edits": engine["edits"], "rejected_edits": engine["rejected_edits"],
        "gate_action": engine["gate_action"], "val_baseline": engine["val_baseline"],
        "val_candidate": engine["val_candidate"], "calls": engine["calls"],
        "tokens": engine["tokens"], "notes": engine["notes"],
    }
    candidate = engine["candidate"]
    if not engine["accepted"] or candidate is None or candidate == baseline:
        why = engine["no_edits_reason"] or f"gate {engine['gate_action'] or 'kept the baseline'}"
        out.update(outcome="no-candidate", reason=why)
        return out
    regressed = [r["id"] for r in test
                 if r["candidate"]["hard"] < r["baseline"]["hard"] or r["candidate"]["soft"] < r["baseline"]["soft"]]
    if regressed:
        out.update(outcome="rejected-on-test", reason="the untouched test split regressed on " + ", ".join(regressed))
    elif out["test_candidate"] <= out["test_baseline"]:
        out.update(outcome="rejected-on-test", reason="passed the gate but did not improve the untouched test split")
    else:
        out.update(outcome="candidate", reason="passed the gate and improved the untouched test split without a per-task regression")
    return out


def stage_packet(source: Path, cases: dict, run_id: str, result: dict, baseline: str, candidate: str) -> Path:
    packet = canonical_checkout(source) / ".local" / "proposals" / f"skillopt-{run_id}"
    packet.mkdir(parents=True)
    rel = f"skills/{cases['skill']}/SKILL.md"
    patch = "".join(difflib.unified_diff(
        baseline.splitlines(keepends=True), candidate.splitlines(keepends=True),
        fromfile=f"a/{rel}", tofile=f"b/{rel}"))
    (packet / "SKILL.md.patch").write_text(patch, encoding="utf-8", newline="")
    write_json(packet / "result.json", result)
    rows = "\n".join(
        f"| {r['id']} | {r['baseline']['soft']:.2f} | {r['candidate']['soft']:.2f} |" for r in result["test"])
    edits = "\n".join(f"- {e['op']}: {e['content']}  \n  _Why:_ {e.get('rationale', '')}" for e in result["edits"]) or "- none"
    rejected = "\n".join(f"- {e['op']}: {e['content']}" for e in result["rejected_edits"]) or "- none"
    ident = result["identity"]
    (packet / "proposal.md").write_text(f"""# SkillOpt candidate for `{cases['skill']}`

Run `{run_id}`, backend `{result['settings']['backend']}`, engine pin `{PIN[:10]}`.
Evaluation only: nothing was adopted, committed or deployed.

## Problem

{cases['issue'].strip()}

## Proposed change

Owned prose in `{rel}` ([patch](SKILL.md.patch)). The patch is the engine's raw candidate,
appended inside its own marker block; apply the accepted rule through the harness library
in the skill's own wording and structure, without the markers.

{edits}

Rejected by the gate:

{rejected}

## Evidence

- Validation gate (mixed hard/soft score): {fmt(result['val_baseline'])} -> {fmt(result['val_candidate'])}, {result['gate_action']}.
- Untouched test split (mean soft score): {fmt(result['test_baseline'])} -> {fmt(result['test_candidate'])}.
- Cost: {result['calls']} backend call(s), including cached and locally judged ones; about {result['tokens']} tokens (upstream estimate); {result['elapsed_s']}s.

| Test task | Baseline soft | Candidate soft |
| --- | --- | --- |
{rows}

## Source identity

Source `{ident['source']}` at `{ident['head'][:10] or 'unknown'}`, uncommitted edits: {'unknown' if ident['uncommitted'] is None else ident['uncommitted']}.
`{rel}` sha256 `{ident['files'].get(rel, '')}`. Before applying, confirm the file still has this
hash; if it changed, rerun the review against the current source instead.

## Remaining uncertainty

Replay scores the instruction text only: it does not recreate a repository,
browser or Windows session. A higher score is evidence about the tested
behaviour, not proof of an operational repair. Run the skill's harness checks,
independent review and any workflow fixture before applying.

## Undo

Reverse the patch in the source, then redeploy; `config/deploy.ps1` keeps a
backup of every file it replaces.
""", encoding="utf-8")
    return packet


# ── engine side (runs inside the pinned environment) ─────────────────────────

def installed_pin() -> str:
    import importlib.metadata as md
    try:
        url = json.loads(md.distribution("skillopt").read_text("direct_url.json") or "{}")
    except md.PackageNotFoundError:
        return ""
    return (url.get("vcs_info") or {}).get("commit_id", "")


def cmd_engine(job_path: str) -> int:
    job = json.loads(Path(job_path).read_text(encoding="utf-8"))
    if installed_pin() != PIN:
        print(f"[review] engine is not at the pinned revision {PIN}", file=sys.stderr)
        return 1
    from skillopt_sleep.backend import build_backend
    from skillopt_sleep.config import DEFAULTS, SleepConfig
    from skillopt_sleep.cycle import run_sleep_cycle
    from skillopt_sleep.prompts import overrides_path
    from skillopt_sleep.replay import replay_batch
    from skillopt_sleep.tasks_file import load_tasks_file

    project, home, s = job["project"], job["home"], job["settings"]
    tasks, _meta = load_tasks_file(job["tasks_file"])
    data = dict(DEFAULTS)
    data.update(FROZEN)
    data.update(
        backend=s["backend"], model=s["model"] or "",
        optimizer_backend=s["optimizer_backend"] or "", optimizer_model=s["optimizer_model"] or "",
        target_backend=s["target_backend"] or "", target_model=s["target_model"] or "",
        codex_path=job["codex_path"], projects="invoked", invoked_project=project,
        target_skill_path=job["skill_path"], state_dir=os.path.join(home, "state"),
        claude_home=os.path.join(home, ".claude"), codex_home=os.path.join(home, ".codex"),
        pi_home=os.path.join(home, ".pi"), cursor_home=os.path.join(home, ".cursor"),
        max_tasks_per_night=len(tasks), _user_config_keys=[],
    )
    cfg = SleepConfig(data=data)
    backend = build_backend(
        backend=data["backend"], model=data["model"],
        optimizer_backend=data["optimizer_backend"], optimizer_model=data["optimizer_model"],
        target_backend=data["target_backend"], target_model=data["target_model"],
        codex_path=data["codex_path"], project_dir=project)
    calls = count_calls(backend)
    skill = Path(job["skill_path"]).read_text(encoding="utf-8")
    memory = Path(project, "CLAUDE.md").read_text(encoding="utf-8")

    outcome = run_sleep_cycle(cfg, seed_tasks=tasks, backend=backend)
    report = outcome.report
    proposed = Path(outcome.staging_dir, "proposed_SKILL.md") if outcome.staging_dir else None
    candidate = proposed.read_text(encoding="utf-8") if proposed and proposed.exists() else None

    test_tasks = [t for t in tasks if t.split == "test"]
    base_pairs = replay_batch(backend, test_tasks, skill, memory)
    cand_pairs = replay_batch(backend, test_tasks, candidate, memory) if candidate else [(t, None) for t in test_tasks]
    test = [{"id": t.id,
             "baseline": {"hard": b.hard, "soft": b.soft},
             "candidate": None if c is None else {"hard": c.hard, "soft": c.soft}}
            for (t, b), (_t, c) in zip(base_pairs, cand_pairs)]

    def edits(items):
        return [{"op": e.op, "target": e.target, "content": e.content, "rationale": getattr(e, "rationale", "")}
                for e in items]

    Path(job["result"]).write_text(json.dumps({
        "accepted": bool(report.accepted), "gate_action": report.gate_action,
        "no_edits_reason": report.no_edits_reason, "holdout_leaked": report.holdout_leaked,
        "val_baseline": report.baseline_score, "val_candidate": report.candidate_score,
        "edits": edits(report.edits), "rejected_edits": edits(report.rejected_edits),
        "candidate": candidate, "test": test, "notes": list(report.notes),
        "tokens": backend.tokens_used(), "calls": sum(calls.values()),
        "staging": outcome.staging_dir, "prompts_path": overrides_path(),
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    if report.holdout_leaked:
        print("[review] upstream reported a leaked holdout", file=sys.stderr)
        return 1
    return 0


def count_calls(backend) -> dict:
    """Count top-level model calls; internal retries are not visible here."""
    counts: dict = {}
    for name in ("attempt", "attempt_with_tools", "judge", "reflect", "mine"):
        original = getattr(backend, name, None)
        if not callable(original):
            continue

        def wrapped(*a, _name=name, _original=original, **kw):
            counts[_name] = counts.get(_name, 0) + 1
            return _original(*a, **kw)
        setattr(backend, name, wrapped)
    return counts


# ── entry point ──────────────────────────────────────────────────────────────

def main(argv: list[str]) -> int:
    if argv[:1] == ["_engine"]:
        return cmd_engine(argv[1])
    if argv[:1] == ["_pin"]:
        print(installed_pin())
        return 0
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("setup", "check", "run"):
        p = sub.add_parser(name)
        p.add_argument("--source", type=Path, default=default_source())
        p.add_argument("--workspace", default=None, help="review root (default: the canonical workspace)")
        if name in ("check", "run"):
            p.add_argument("--cases", type=Path, required=True)
            p.add_argument("--backend", default="mock")
        if name == "run":
            for opt in ("model", "optimizer-backend", "optimizer-model", "target-backend",
                        "target-model", "codex-path", "engine-python"):
                p.add_argument(f"--{opt}", default="")
            p.add_argument("--force", action="store_true", help="rerun even when nothing changed")
    args = parser.parse_args(argv)
    args.source = args.source.resolve()
    if not (args.source / "config" / "install-map.json").is_file():
        print(f"[review] {args.source} is not the harness source (no config/install-map.json)", file=sys.stderr)
        return 2
    try:
        return {"setup": cmd_setup, "check": cmd_check, "run": cmd_run}[args.command](args)
    except Rejected as exc:
        print(f"[review] {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
