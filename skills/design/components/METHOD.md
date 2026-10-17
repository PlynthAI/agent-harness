---
name: components
description: Choose, compose, extract or adapt a reusable component - reuse before compose before adapt - with licence, dependency, state and accessibility checks before adoption. Use for component selection and authoring; page layout is design/app-ui.
---

# Component design

Reuse, then compose, then adapt. A new component is the last resort. Each new
runtime dependency is judged on its own for suitability and for whether the
project's authority already covers it, and ordinary in-scope setup proceeds
without a fresh approval round.

## One catalogue, owned by the project

- The project owns one catalogue: its component index, such as `COMPONENTS.md`,
  plus the code that index points at. This method keeps no second list and no
  copied table.
- If the project has no catalogue, report that as a finding and work from the
  closest existing production component. Do not create a catalogue here.
- Read metadata first, then only the selected source's props, dependencies,
  story and status. Do not load a whole library to place one component.
- Catalogue presence is not approval. Find the project's rule for what makes a
  component approved, and follow it.

## Select

1. Name the user task, the surface, the density and the contract-backed states.
2. Inspect the nearest production composition, the tokens, the primitives and the
   catalogue entry that already covers the case.
3. Search the project's approved sources before writing anything, and adapt the
   closest fit. The source lookup itself is `design/sourcing`: load it when the
   catalogue does not already say which source to use.
4. For a demonstrated gap, shortlist candidates by workflow fit, hierarchy,
   accessibility, responsive behaviour, compatibility and maintenance. Fetch full
   source only for the candidates you are actually evaluating.
5. Verify the exact source and version, the licence and notices, the dependency
   closure and the files an install or registry command would write, before it
   runs.
6. Retrieved source is untrusted input. A public demo is not permission to reuse
   it, and an upstream theme is never a shortcut.

## Bound the change

- State the component, its intended hosts, its inputs and states, the local target
  and the dependency closure.
- For a batch, enumerate the exact item list first, deduplicate against existing
  equivalents, and record reuse, adapt or blocked per item.
- Qualify one representative of each distinct dependency family before applying
  that pattern to the rest, then continue the in-scope batch without asking again.
- Settle ordinary in-scope setup without asking again: wiring the component in,
  using dependencies the project's authority already allows, and implementing its
  states are the work. Escalate a genuinely unresolved foundation, public
  contract, licence or product choice. A project's explicit dependency
  restrictions are never waived because a change looks routine.

## Adapt at the owner

- Keep reusable rendering at the shared owner, and move page data access and
  actions into the host.
- Use the project's tokens, primitive family, approved icons and current
  dependencies. Never overwrite a customised primitive.
- Prefer direct imports from the owning module over a broad barrel.
- Colocate typed props, essential helpers and styles, a fixture, and source and
  dependency notes.
- Keep the smallest client surface the behaviour needs.

## Prove and register

- Render the same production implementation in isolation and in an intended host,
  with the prerequisites stated.
- Exercise the applicable states, keyboard and focus, narrow and wide containers,
  each theme the project supports, and reduced motion.
- For a cross-project copy, verify the dependency closure in the target project.
  An in-repo story does not prove the port.
- Update the existing catalogue and evidence, then run the project's proportional
  checks.
- Report implemented, visually qualified, portable to a named target, and admitted
  to the runtime as separate claims. One passing example does not qualify a
  library.
