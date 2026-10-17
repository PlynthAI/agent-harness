# Tracing

A trace records a whole flow for debugging: every action, a DOM snapshot before
and after each, screenshots, network activity and console messages.

```bash
playwright-cli open
playwright-cli tracing-start
playwright-cli goto https://example.com
playwright-cli click e1
playwright-cli fill e2 "test"
playwright-cli tracing-stop
```

Start tracing before the problem, not at the failing step, so the trace holds the
whole path to it. Output goes to `.playwright-cli/traces/`:

- `trace-{timestamp}.trace`: the action log with DOM snapshots, screenshots,
  timing, console messages and source locations.
- `trace-{timestamp}.network`: every request and response with headers, bodies
  and timing, including failures.
- `resources/`: cached images, fonts, styles and scripts used to rebuild the
  page.

Traces capture request and response bodies and typed values. Treat one as
sensitive when the flow used credentials, keep it out of reports, and delete old
ones:

```bash
find .playwright-cli/traces -mtime +7 -delete
```

Traces add overhead and can be large. Use a screenshot for a single state and a
trace when the sequence or the network matters.
