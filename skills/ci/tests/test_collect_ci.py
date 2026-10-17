"""Synthetic tests only: no GitHub credentials or network requests required."""
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from collect_ci import (CollectionError, all_pages, collect, elapsed, job_execution,
                        job_row, parse_date, runs_in_window, step_rows, attempt_coverage,
                        write_json)


def windows_permission_error(code):
    error = PermissionError(13, "simulated Windows replace failure")
    error.winerror = code
    return error


class CollectorTests(unittest.TestCase):
    @unittest.skipUnless(sys.platform == "win32", "Windows sharing behavior")
    def test_transient_windows_reader_allows_atomic_json_replacement(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "collection.json"
            path.write_text('{"old": true}')
            replace = os.replace
            attempts = []

            def briefly_locked(source, destination):
                attempts.append(1)
                if len(attempts) == 1:
                    raise windows_permission_error(5)
                replace(source, destination)

            with patch("collect_ci.os.replace", side_effect=briefly_locked):
                write_json(path, {"complete": True})
            self.assertEqual(len(attempts), 2)
            self.assertEqual(json.loads(path.read_text()), {"complete": True})
            self.assertEqual(list(Path(temp).glob("*.tmp")), [])

    @unittest.skipUnless(sys.platform == "win32", "Windows sharing behavior")
    def test_persistent_windows_replace_failure_is_bounded_and_keeps_old_json(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "collection.json"
            path.write_text('{"complete": false}')
            with patch("collect_ci.os.replace", side_effect=windows_permission_error(32)) as replace, \
                    patch("collect_ci.time.sleep"):
                with self.assertRaises(PermissionError):
                    write_json(path, {"complete": True})
            self.assertGreater(replace.call_count, 1)
            self.assertLessEqual(replace.call_count, 10)
            self.assertEqual(json.loads(path.read_text()), {"complete": False})
            self.assertEqual(list(Path(temp).glob("*.tmp")), [])

    def test_unrelated_replace_failure_is_not_retried(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "collection.json"
            with patch("collect_ci.os.replace", side_effect=windows_permission_error(3)) as replace:
                with self.assertRaises(PermissionError):
                    write_json(path, {"complete": True})
            self.assertEqual(replace.call_count, 1)
            self.assertFalse(path.exists())
            self.assertEqual(list(Path(temp).glob("*.tmp")), [])

    def test_collection_failure_survives_failed_final_checkpoint(self):
        original = CollectionError("inventory unavailable")
        checkpoint = PermissionError("checkpoint unavailable")
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp) / "export"
            initial_write = write_json
            writes = 0

            def fail_final_write(path, value):
                nonlocal writes
                writes += 1
                if writes == 2:
                    raise checkpoint
                initial_write(path, value)

            with patch("collect_ci.write_json", side_effect=fail_final_write):
                with self.assertRaises(CollectionError) as caught:
                    collect("example/repo", parse_date("2026-09-21"),
                            parse_date("2026-09-22"), out,
                            lambda path, params: (_ for _ in ()).throw(original))
            self.assertIs(caught.exception, original)
            if hasattr(original, "add_note"):
                self.assertIn("checkpoint unavailable", " ".join(original.__notes__))
            else:
                self.assertIs(original.__context__, checkpoint)
            self.assertFalse(json.loads((out / "collection.json").read_text())["complete"])

    def test_successful_collection_reports_failed_final_checkpoint(self):
        checkpoint = PermissionError("checkpoint unavailable")
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp) / "export"
            initial_write = write_json
            collection_writes = 0

            def fail_final_write(path, value):
                nonlocal collection_writes
                if path.name == "collection.json":
                    collection_writes += 1
                    if collection_writes == 2:
                        raise checkpoint
                initial_write(path, value)

            with patch("collect_ci.write_json", side_effect=fail_final_write):
                with self.assertRaises(PermissionError) as caught:
                    collect("example/repo", parse_date("2026-09-21"),
                            parse_date("2026-09-22"), out,
                            lambda path, params: {"total_count": 0, "workflow_runs": []})
            self.assertIs(caught.exception, checkpoint)
            self.assertEqual(collection_writes, 2)
            self.assertTrue((out / "summary.json").exists())
            self.assertFalse(json.loads((out / "collection.json").read_text())["complete"])

    def test_elapsed(self):
        self.assertEqual(elapsed("2026-09-21T04:47:31Z", "2026-09-21T04:49:20Z"), 109)
        self.assertIsNone(elapsed(None, "2026-09-21T04:49:20Z"))
        self.assertIsNone(elapsed("2026-09-21T04:49:20Z", "2026-09-21T04:47:31Z"))

    def test_skipped_synthetic_negative_timestamps_are_zero(self):
        duration, note = job_execution({"conclusion": "skipped",
                                       "started_at": "2026-09-22T03:53:36Z",
                                       "completed_at": "2026-09-22T03:53:35Z"})
        self.assertEqual(duration, 0)
        self.assertIsNone(note)

    def test_running_and_invalid_completed_are_unknown(self):
        self.assertIsNone(job_execution({"status": "in_progress"})[0])
        self.assertIsNone(job_execution({"status": "completed", "conclusion": "failure"})[0])

    def test_cancelled_execution_kept(self):
        duration, _ = job_execution({"status": "completed", "conclusion": "cancelled",
                                    "runner_id": 42,
                                    "started_at": "2026-09-21T00:00:00Z",
                                    "completed_at": "2026-09-21T00:00:25Z"})
        self.assertEqual(duration, 25)

    def test_cancelled_without_assignment(self):
        self.assertEqual(job_execution({"status": "completed", "conclusion": "cancelled",
                                        "runner_id": None, "steps": []})[0], 0)

    def test_cancelled_started_but_no_allocation_evidence_is_unknown(self):
        duration, note = job_execution({"status": "completed", "conclusion": "cancelled",
                                        "runner_id": None, "steps": [],
                                        "started_at": "2026-09-21T01:00:00Z",
                                        "completed_at": "2026-09-21T01:00:15Z"})
        self.assertIsNone(duration)
        self.assertEqual(note, "cancelled_allocation_unknown")

    def test_multiple_pages(self):
        pages = {1: {"total_count": 101, "jobs": [{"id": i} for i in range(100)]},
                 2: {"total_count": 101, "jobs": [{"id": 100}]}}
        found = all_pages(lambda p, q: pages[q["page"]], "jobs", {}, "jobs")
        self.assertEqual(len(found), 101)

    def test_truncation_raises(self):
        with self.assertRaises(CollectionError):
            all_pages(lambda p, q: {"total_count": 3, "jobs": [{"id": 1}]}, "jobs", {}, "jobs")

    def test_crowded_window_split(self):
        start = parse_date("2026-09-21")
        calls = []
        def fake(path, params):
            calls.append(params)
            if len(calls) == 1:
                return {"total_count": 1000, "workflow_runs": []}
            second_half = "12:00:00Z" in params["created"].split("..")[0]
            return {"total_count": 1, "workflow_runs": [
                {"id": 2 if second_half else 1,
                 "created_at": "2026-09-21T13:00:00Z" if second_half else "2026-09-21T01:00:00Z"}]}
        runs = runs_in_window(fake, "example/repo", start, start + timedelta(days=1))
        self.assertEqual({r["id"] for r in runs}, {1, 2})
        self.assertEqual(len(calls), 3)

    def test_attempt_identity_not_inferred_from_latest_run(self):
        row = job_row("example/repo", {"id": 1, "run_attempt": 3},
                      {"id": 2, "status": "completed", "conclusion": "skipped"})
        self.assertIsNone(row["run_attempt"])

    def test_attempt_coverage_distinguishes_declared_observed_and_empty(self):
        coverage = attempt_coverage({"id": 8, "run_attempt": 3},
                                    [{"run_attempt": 1}, {"run_attempt": 3},
                                     {"run_attempt": None}])
        self.assertEqual(coverage["declared_attempts"], [1, 2, 3])
        self.assertEqual(coverage["observed_job_bearing_attempts"], [1, 3])
        self.assertEqual(coverage["attempts_without_observed_jobs"], [2])
        self.assertEqual(coverage["jobs_without_valid_attempt"], 1)
        empty = attempt_coverage({"id": 9, "run_attempt": 2}, [])
        self.assertEqual(empty["attempts_without_observed_jobs"], [1, 2])
        self.assertIsNone(attempt_coverage({"id": 10}, [])["declared_attempts"])

    def test_collection_preserves_all_attempt_jobs_and_does_not_export_actor(self):
        def fake(path, params):
            if path.endswith("/actions/runs"):
                return {"total_count": 1, "workflow_runs": [{"id": 1,
                    "created_at": "2026-09-21T01:00:00Z", "path": ".github/workflows/test.yml",
                    "run_attempt": 2, "actor": {"email": "not-exported@example.com"}}]}
            self.assertEqual(params["filter"], "all")
            return {"total_count": 2, "jobs": [{"id": attempt, "run_attempt": attempt,
                "status": "completed", "conclusion": "failure" if attempt == 1 else "success",
                "started_at": "2026-09-21T01:00:00Z", "completed_at": "2026-09-21T01:01:00Z",
                "steps": []} for attempt in (1, 2)]}
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp) / "export"
            result = collect("example/repo", parse_date("2026-09-21"), parse_date("2026-09-22"), folder, fake)
            self.assertTrue(result["complete"])
            self.assertEqual(result["job_count"], 2)
            self.assertNotIn("not-exported", (folder / "runs.jsonl").read_text())
            summary = json.loads((folder / "summary.json").read_text())
            self.assertEqual(summary["observed_execution_seconds_by_workflow"][".github/workflows/test.yml"], 120)

    def test_failed_collection_marks_incomplete(self):
        def broken(path, params):
            raise CollectionError("Synthetic permission failure")
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp) / "export"
            with self.assertRaises(CollectionError):
                collect("example/repo", parse_date("2026-09-21"), parse_date("2026-09-22"), folder, broken)
            self.assertFalse(json.loads((folder / "collection.json").read_text())["complete"])

    def test_output_overwrite_refused(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            (folder / "keep.txt").write_text("keep")
            with self.assertRaises(CollectionError):
                collect("example/repo", parse_date("2026-09-21"), parse_date("2026-09-22"), folder, lambda p, q: {})
            self.assertEqual((folder / "keep.txt").read_text(), "keep")

    def test_checkpoint_resume_skips_unchanged_completed_and_rebuilds_aggregate(self):
        start, end = parse_date("2026-09-21"), parse_date("2026-09-22")
        calls = []
        runs = [{"id": i, "created_at": "2026-09-21T01:00:00Z",
                 "updated_at": "2026-09-21T02:00:00Z", "status": "completed",
                 "run_attempt": 1, "path": "ci.yml"} for i in (1, 2)]
        def fake(path, params):
            calls.append(path)
            if path.endswith("/actions/runs"):
                return {"total_count": len(runs), "workflow_runs": runs}
            run_id = int(path.split("/")[-2])
            return {"total_count": 1, "jobs": [{"id": run_id * 10,
                "run_attempt": 1, "status": "completed", "conclusion": "success",
                "started_at": "2026-09-21T01:00:00Z",
                "completed_at": "2026-09-21T01:01:00Z"}]}
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp) / "export"
            partial = collect("example/repo", start, end, out, fake, max_runs=1)
            self.assertFalse(partial["complete"])
            self.assertEqual(partial["pending_runs"], 1)
            self.assertFalse((out / "summary.json").exists())
            first_snapshots = list((out / "snapshots").glob("*.json"))
            self.assertEqual(len(first_snapshots), 1)
            done = collect("example/repo", start, end, out, fake, resume=True)
            self.assertTrue(done["complete"])
            self.assertEqual(done["job_count"], 2)
            self.assertEqual(calls.count("repos/example/repo/actions/runs/1/jobs"), 1)
            self.assertEqual(calls.count("repos/example/repo/actions/runs/2/jobs"), 1)
            self.assertEqual(len(list((out / "snapshots").glob("*.json"))), 2)
            self.assertEqual(len((out / "jobs.jsonl").read_text().splitlines()), 2)
            # Repeating a completed collection refreshes inventory, not job pages.
            collect("example/repo", start, end, out, fake, resume=True)
            self.assertEqual(calls.count("repos/example/repo/actions/runs/1/jobs"), 1)
            self.assertEqual(len((out / "jobs.jsonl").read_text().splitlines()), 2)

    def test_changed_rerun_and_active_run_are_refreshed(self):
        start, end = parse_date("2026-09-21"), parse_date("2026-09-22")
        run = {"id": 1, "created_at": "2026-09-21T01:00:00Z",
               "updated_at": "2026-09-21T02:00:00Z", "status": "completed",
               "run_attempt": 1, "path": "ci.yml"}
        job_calls = []
        def fake(path, params):
            if path.endswith("/actions/runs"):
                return {"total_count": 1, "workflow_runs": [run.copy()]}
            job_calls.append(1)
            return {"total_count": len(job_calls), "jobs": [
                {"id": i, "run_attempt": i, "status": "completed",
                 "conclusion": "success", "started_at": "2026-09-21T01:00:00Z",
                 "completed_at": "2026-09-21T01:01:00Z"}
                for i in range(1, len(job_calls) + 1)]}
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp) / "export"
            collect("example/repo", start, end, out, fake)
            run.update(run_attempt=2, updated_at="2026-09-21T03:00:00Z")
            rerun = collect("example/repo", start, end, out, fake, resume=True)
            self.assertEqual(rerun["job_count"], 2)
            self.assertEqual(rerun["attempt_coverage"][0]["observed_job_bearing_attempts"], [1, 2])
            self.assertEqual(len(list((out / "snapshots").glob("*.json"))), 2)
            run.update(status="in_progress", updated_at="2026-09-21T04:00:00Z")
            collect("example/repo", start, end, out, fake, resume=True)
            collect("example/repo", start, end, out, fake, resume=True)
            self.assertEqual(len(job_calls), 4)

    def test_interrupted_run_page_resumes_from_finished_snapshot(self):
        start, end = parse_date("2026-09-21"), parse_date("2026-09-22")
        calls = []
        fail_second = [True]
        def fake(path, params):
            if path.endswith("/actions/runs"):
                return {"total_count": 2, "workflow_runs": [
                    {"id": i, "created_at": "2026-09-21T01:00:00Z",
                     "status": "completed", "run_attempt": 1} for i in (1, 2)]}
            run_id = int(path.split("/")[-2])
            calls.append(run_id)
            if run_id == 2 and fail_second[0]:
                fail_second[0] = False
                raise CollectionError("transient failure")
            return {"total_count": 0, "jobs": []}
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp) / "export"
            with self.assertRaises(CollectionError):
                collect("example/repo", start, end, out, fake)
            self.assertFalse(json.loads((out / "collection.json").read_text())["complete"])
            self.assertEqual(len(list((out / "snapshots").glob("*.json"))), 1)
            done = collect("example/repo", start, end, out, fake, resume=True)
            self.assertTrue(done["complete"])
            self.assertEqual(calls, [1, 2, 2])

    def test_resume_mismatch_and_interruption_invalidate_old_aggregate(self):
        start, end = parse_date("2026-09-21"), parse_date("2026-09-22")
        run = {"id": 1, "created_at": "2026-09-21T01:00:00Z",
               "updated_at": "2026-09-21T02:00:00Z", "status": "completed",
               "run_attempt": 1}
        def good(path, params):
            if path.endswith("/actions/runs"):
                return {"total_count": 1, "workflow_runs": [run]}
            return {"total_count": 0, "jobs": []}
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp) / "export"
            collect("example/repo", start, end, out, good)
            self.assertTrue((out / "summary.json").exists())
            with self.assertRaises(CollectionError):
                collect("other/repo", start, end, out, good, resume=True)
            self.assertTrue((out / "summary.json").exists())
            def broken(path, params):
                raise CollectionError("interrupted inventory")
            with self.assertRaises(CollectionError):
                collect("example/repo", start, end, out, broken, resume=True)
            self.assertFalse((out / "summary.json").exists())
            self.assertFalse(json.loads((out / "collection.json").read_text())["complete"])


if __name__ == "__main__":
    unittest.main()
