# Architecture decisions

Use this reference when the assignment concerns interfaces, coupling, testability
or a refactor. It is also the vocabulary of the [codebase audit](audit.md). Keep
the project's own names for domain concepts and use the words below for
structure.

## Vocabulary

Use these terms exactly, and do not substitute component, service, API or
boundary. Fixed words are what let a finding name one rule and let another agent
check it.

- **Module:** anything with an interface and an implementation, at any scale: a
  function, a class, a package or a slice across tiers. Avoid unit, component
  and service.
- **Interface:** everything a caller must know to use the module correctly: the
  type signature, and also invariants, ordering, error modes, required
  configuration and performance. Avoid API and signature, which name only the
  type-level surface.
- **Implementation:** the code inside a module.
- **Depth:** leverage at the interface, meaning how much behaviour a caller or
  test can exercise per unit of interface it has to learn. A module is **deep**
  when a lot of behaviour sits behind a small interface, and **shallow** when the
  interface is nearly as complex as the implementation. Depth is not a ratio of
  implementation lines to interface lines, which rewards padding.
- **Seam** (Michael Feathers): a place where behaviour can be changed without
  editing in that place; the location where a module's interface lives. Where
  the seam goes is a decision of its own, separate from what sits behind it.
- **Adapter:** a concrete thing that satisfies an interface at a seam. It names a
  role, not a size: a database repository is a small adapter with a large
  implementation, and an in-memory fake the reverse.
- **Leverage:** what callers get from depth: more capability per unit of
  interface, with one implementation paying back across many call sites and
  tests.
- **Locality:** what maintainers get from depth: change, defects, knowledge and
  verification concentrate in one place. Fix once, fixed everywhere.

"Boundary" is kept for a system boundary in the sense of
[boundary discipline](../../../principles-and-patterns/index.md): where data
enters or leaves the program. Between modules, say seam or interface.

## Rules

- **Depth belongs to the interface.** A deep module can be built from small,
  swappable parts; they are simply not part of its interface. It can have
  internal seams, used by its own tests, as well as the external seam at its
  interface. Do not expose an internal seam through the interface because a
  test uses it.
- **The deletion test.** Imagine deleting the module. If complexity vanishes, it
  was a pass-through. If complexity reappears across many callers, it was
  earning its keep.
- **The interface is the test surface.** Callers and tests cross the same seam.
  A test that has to reach past the interface says the module is the wrong
  shape.
- **One adapter means a hypothetical seam; two adapters mean a real one.**
  Introduce a seam only where something actually varies across it, typically
  production and test. A seam with one adapter is indirection.

[Design red flags](design-red-flags.md) name the four shapes to reject.

## Finding a worthwhile change

Start with the named pain point. For an open-ended scan, use recent changes and
caller friction to select an area worth improving; the
[codebase audit](audit.md) scopes a scan that way. A merely theoretical cleanup
is a weak candidate. Respect existing contracts and decisions; identify a real
benefit before proposing to revisit one.

Walk the area and note friction rather than following a checklist:

- Where does understanding one concept mean moving between many small modules?
- Where are modules shallow, with an interface nearly as complex as the
  implementation?
- Where have pure functions been extracted only for testability, while the real
  defects hide in how they are called (no locality)?
- Where do tightly coupled modules leak across their seams?
- Which parts are untested, or hard to test through their current interface?

Apply the deletion test to anything that looks shallow. Deepening is worth it
when deleting the module would concentrate complexity, not just move it. Ask
where knowledge is duplicated across callers and where one change requires
edits in many places.

Compare plausible designs when the choice matters (the useful core of
Ousterhout's "Design It Twice"). Show the caller's usage, what each design
hides, where changes concentrate, and the migration cost. Alternatives might
favor a smaller interface, the common caller or a genuinely needed variation. No
fixed number of alternatives or subagents is required for advice; when the
design will be implemented straight against the sketch,
[sketch first](sketch-first.md) fixes the floor at two structurally distinct
shapes. Recommend the smallest design that resolves the observed problem. A
sketch or before and after diagram is useful when relationships are hard to
explain in prose.

## Dependencies and verification

Name the dependency category of each candidate. The category decides how the
deepened module is tested across its seam.

1. **In-process:** pure computation or in-memory state, no I/O. Merge the
   modules and test through the new interface directly; no adapter is needed.
2. **Local-substitutable:** a dependency with a local stand-in that preserves the
   relevant semantics, such as an embedded database or an in-memory filesystem.
   Test with the stand-in in the suite; the seam stays internal.
3. **Remote but owned:** the project's own services across a network. Define a
   port at the seam so the logic sits in one deep module, inject the transport
   as an adapter, test with an in-memory adapter, and keep contract evidence
   for the transport.
4. **True external:** third-party services the project does not control. Take
   the service as an injected port and test with a controlled substitute,
   retaining integration or contract evidence for assumptions the substitute
   cannot prove.

Keep existing tests that still protect meaningful behaviour. Replace tests tied
to removed internals only after equivalent required coverage exists at the new
interface; interface tests do not automatically prove transport, concurrency or
integration behaviour.

## A candidate

Present each candidate with:

- **Files:** the modules involved.
- **Problem:** the friction observed, in the vocabulary above.
- **Change:** in plain words, what would change. Propose no interface yet.
- **Benefits:** in locality and leverage, and how the tests would improve.
- **Cost and uncertainty:** migration cost, callers affected and what is not
  known.
- **Dependency category:** one of the four above.
- **Strength:** `Strong` when the friction is observed in the tree or its
  history and the deletion test favours the change; `Worth exploring` when the
  friction is real but the change or its cost is unclear; `Speculative` when it
  is plausible from reading alone.
- **Decision conflict:** only when a candidate contradicts an ADR or accepted
  contract and the friction is real enough to reopen it; name the decision and
  why.

If the user requested implementation of a settled change, do not insert a
mandatory candidate-selection or questioning stage.
