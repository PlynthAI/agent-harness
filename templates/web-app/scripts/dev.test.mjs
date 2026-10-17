import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  chooseMode,
  derivePort,
  isSameProcess,
  launchRecord,
  planStop,
  parsePortlessList,
  portlessRouteProblem,
  portlessVersionProblem,
  processTree,
  resolvePort,
  validateRecord,
} from "./dev.mjs";

const record = {
  pid: 4242,
  startTime: "2026-10-08T09:30:00.1234567Z",
  cwd: "/work/notes-app",
  url: "http://127.0.0.1:3412",
  log: "/work/notes-app/.cache/dev/server.log",
};

describe("derivePort", () => {
  it("gives the same folder the same port every time", () => {
    assert.equal(derivePort("notes-app"), derivePort("notes-app"));
  });

  it("stays inside 3000 to 3999", () => {
    for (const name of ["a", "notes-app", "notes-app-feature-x", "z".repeat(200)]) {
      const port = derivePort(name);
      assert.ok(port >= 3000 && port <= 3999, `${name} -> ${port}`);
    }
  });

  it("separates sibling worktrees", () => {
    assert.notEqual(derivePort("notes-app"), derivePort("notes-app-review"));
  });
});

describe("resolvePort", () => {
  it("uses PORT when it is set", () => {
    assert.equal(resolvePort({ PORT: "4100" }, "/work/notes-app"), 4100);
  });

  it("derives the port from the folder name otherwise", () => {
    assert.equal(resolvePort({}, "/work/notes-app"), derivePort("notes-app"));
  });

  it("refuses a PORT that is not a usable port number", () => {
    for (const value of ["abc", "0", "70000", "3000.5"]) {
      assert.throws(() => resolvePort({ PORT: value }, "/work/notes-app"), /PORT/);
    }
  });
});

describe("validateRecord", () => {
  it("accepts a complete record, with a port URL or a Portless route", () => {
    assert.deepEqual(validateRecord(record), { ok: true, record });
    const routed = { ...record, url: "http://notes-app.localhost" };
    assert.deepEqual(validateRecord(routed), { ok: true, record: routed });
  });

  it("names the first missing or malformed field", () => {
    const cases = [
      [null, "not an object"],
      [{ ...record, pid: "4242" }, "pid"],
      [{ ...record, pid: -1 }, "pid"],
      [{ ...record, startTime: "" }, "startTime"],
      [{ ...record, cwd: undefined }, "cwd"],
      [{ ...record, url: "localhost:3412" }, "url"],
      [{ ...record, log: 7 }, "log"],
    ];
    for (const [value, field] of cases) {
      const result = validateRecord(value);
      assert.equal(result.ok, false);
      assert.match(result.problem, new RegExp(field));
    }
  });
});

describe("isSameProcess", () => {
  it("matches only when the observed start time equals the recorded one", () => {
    assert.equal(isSameProcess(record, record.startTime), true);
    assert.equal(isSameProcess(record, "2026-10-08T10:00:00.0000000Z"), false);
    assert.equal(isSameProcess(record, null), false);
  });
});

describe("chooseMode", () => {
  it("routes through Portless when `portless --version` succeeds", () => {
    assert.equal(chooseMode({}, { status: 0, stdout: "0.15.7\n" }), "portless");
  });

  it("uses the derived port when Portless is missing or its binary fails", () => {
    const missing = { status: null, error: Object.assign(new Error("spawn"), { code: "ENOENT" }) };
    assert.equal(chooseMode({}, missing), "port");
    // cmd.exe answers 1 when portless.cmd is not on PATH.
    assert.equal(chooseMode({}, { status: 1, stdout: "" }), "port");
  });

  it("honours each of Portless's own opt-outs: PORTLESS=0, false or skip", () => {
    for (const value of ["0", "false", "skip", "FALSE", "Skip"]) {
      assert.equal(
        chooseMode({ PORTLESS: value }, { status: 0, stdout: "0.15.7\n" }),
        "port",
        value,
      );
    }
  });

  it("still routes through Portless for any other PORTLESS value", () => {
    assert.equal(chooseMode({ PORTLESS: "1" }, { status: 0, stdout: "0.15.7\n" }), "portless");
  });
});

describe("portlessVersionProblem", () => {
  it("accepts 0.15.4, the first release whose proxy listens only on loopback, and later ones", () => {
    for (const version of [
      "0.15.4\n",
      "0.15.7",
      "portless 0.16.0",
      "v0.15.5",
      "0.15.5-beta.1",
      "1.0.0",
    ]) {
      assert.equal(portlessVersionProblem(version), null, version);
    }
  });

  it("refuses an older release or unreadable output, naming the floor and both fixes", () => {
    for (const version of ["0.15.3", "0.14.9", "0.9.20", "", "unknown"]) {
      const problem = portlessVersionProblem(version);
      assert.match(problem ?? "", /0\.15\.4/, version);
      assert.match(problem ?? "", /PORTLESS=0/, version);
    }
    assert.match(portlessVersionProblem("0.15.3\n") ?? "", /Portless 0\.15\.3 is older than/);
  });

  it("refuses a pre-release of the floor itself", () => {
    assert.match(portlessVersionProblem("0.15.4-beta.1") ?? "", /0\.15\.4-beta\.1 is older than/);
  });

  it("reads the version only from a whole line, so other numbers in the output do not count", () => {
    assert.match(
      portlessVersionProblem("Update available: 0.16.1\nportless 0.15.3") ?? "",
      /0\.15\.3/,
    );
    for (const text of ["node 24.20.0 portless 0.15.3", "Update available: 0.16.1"]) {
      assert.match(portlessVersionProblem(text) ?? "", /Could not read a version/, text);
    }
  });

  it("says unreadable output is unreadable, not old", () => {
    for (const text of ["", "unknown", "node 24.20.0 portless 0.15.3"]) {
      const problem = portlessVersionProblem(text) ?? "";
      assert.match(problem, /Could not read a version from `portless --version`/, text);
      assert.doesNotMatch(problem, /older than/, text);
    }
  });
});

describe("portlessRouteProblem", () => {
  it("accepts a .localhost route, which resolves to loopback", () => {
    assert.equal(portlessRouteProblem("http://notes-app.localhost"), null);
    assert.equal(portlessRouteProblem("https://feature.notes-app.localhost:1355"), null);
  });

  it("refuses a route on any other name, as LAN mode gives, since the network can reach it", () => {
    for (const url of [
      "http://notes-app.local",
      "http://notes-app.test",
      "http://192.168.1.20:1355",
    ]) {
      assert.match(portlessRouteProblem(url) ?? "", /not a \.localhost route/, url);
    }
  });
});

describe("launchRecord", () => {
  it("returns the record stop will later accept", () => {
    assert.deepEqual(launchRecord(record), record);
  });

  it("refuses to record a server whose start time could not be read", () => {
    assert.throws(() => launchRecord({ ...record, startTime: null }), /start time of pid 4242/);
  });
});

describe("planStop", () => {
  const checkout = record.cwd;
  const ours = { ok: true, record };

  it("kills the recorded tree only while its start time still matches", () => {
    assert.deepEqual(planStop(ours, checkout, record.startTime), { action: "kill" });
  });

  it("drops a record whose process has exited or been replaced, without killing", () => {
    for (const observed of [null, "2026-10-08T10:00:00.0000000Z"]) {
      assert.equal(planStop(ours, checkout, observed).action, "drop");
    }
  });

  it("drops an unreadable record", () => {
    const unreadable = { ok: false, problem: "the record is not valid JSON" };
    assert.equal(planStop(unreadable, checkout, null).action, "drop");
  });

  it("leaves another checkout's record and process alone", () => {
    const plan = planStop(ours, "/work/other-checkout", record.startTime);
    assert.equal(plan.action, "keep");
    assert.match(plan.message ?? "", /another checkout/);
  });

  it("after the kill, removes the record only once the process is gone", () => {
    assert.equal(planStop(ours, checkout, null, { killed: true }).action, "drop");
    const survived = planStop(ours, checkout, record.startTime, { killed: true });
    assert.equal(survived.action, "fail");
    assert.match(survived.message ?? "", /still running.*4242/);
  });
});

describe("parsePortlessList", () => {
  // `portless list` as Portless 0.15.7 prints it: an alias and two app routes.
  const listing = [
    "",
    "Active routes:",
    "",
    "  http://docs.other-app.localhost  ->  localhost:4222  (alias)",
    "  http://notes-app.localhost  ->  localhost:4497  (pid 69548)",
    "  https://review.notes-app.localhost:1355  ->  localhost:4691  (pid 92428)",
    "",
  ].join("\r\n");

  it("returns each app route's URL and Portless pid, skipping aliases", () => {
    assert.deepEqual(parsePortlessList(listing), [
      { url: "http://notes-app.localhost", pid: 69548 },
      { url: "https://review.notes-app.localhost:1355", pid: 92428 },
    ]);
  });

  it("reads coloured output the same way", () => {
    const coloured =
      "  \u001b[36mhttp://notes-app.localhost\u001b[39m  ->  localhost:4497  \u001b[2m(pid 69548)\u001b[22m";
    assert.deepEqual(parsePortlessList(coloured), [
      { url: "http://notes-app.localhost", pid: 69548 },
    ]);
  });

  it("finds no routes when Portless lists none", () => {
    const empty = "No active routes.\nStart an app with: portless <name> <command>\n";
    assert.deepEqual(parsePortlessList(empty), []);
  });
});

describe("processTree", () => {
  // "pid ppid" lines: 100 started cmd 200, which runs Portless 300, which runs the app 400.
  const table = ["  100     1", "200 100", "300 200", "400 300", "500 1", "600 500", ""].join("\n");

  it("holds the root and every process below it", () => {
    assert.deepEqual([...processTree(table, 100)].sort(), [100, 200, 300, 400]);
  });

  it("leaves out processes outside the tree", () => {
    assert.equal(processTree(table, 100).has(600), false);
    assert.deepEqual([...processTree(table, 999)], [999]);
  });
});
