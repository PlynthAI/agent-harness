# Technical writing

Adapted from pstack's `technical-writing` skill (see the root notice file for
the pin). Use it for any document a person reads to act on or understand a
system: READMEs, guides, tutorials, API and CLI reference, RFCs and design
docs, runbooks, changelogs and release notes. When agents also consume the
document, add [agent instructions](agent-instructions.md).

The goal is writing a tired engineer understands on the first read. Four
layers get there, one question each: what kind of document is this, how do
sentences address the reader, how much does each sentence carry, and can any
sentence be read two ways. Apply all four.

## Find the owner first

Find the existing owner of the subject through the project's `AGENTS.md`,
`PROJECT.md` or equivalent map. Edit that document, or create the smallest new
one at the project's designated route. Check the behaviour before documenting
it as intended. Link to the maintained source of detailed facts instead of
copying inventories that drift. Remove stale guidance when replacing it. Use
the project's template when it fits; a small correction needs none.

## Preserve the meaning when revising

When editing or summarising, keep every claim, uncertainty, obligation,
condition, exception, quantity, unit and step order. Never turn a possibility
into a fact or a recommendation into a requirement: "The migration may have
failed" keeps its "may". Keep code, identifiers, commands, interface labels,
citations and quoted wording intact unless the task changes them. Do not
invent actors, causes, thresholds, capabilities or verification steps to make
a passage sound complete. Resolve an ambiguity from context; otherwise keep it
and flag it briefly.

## Rules above the layers

- **Cut every word that does no work.** "In order to" is "to". "It is
  important to note that" is nothing.
- **Use the short, everyday word.** "Use", not "utilize". "Help", not
  "facilitate". A long word has to buy its length with precision.
- **When a rule makes a sentence worse, fix the sentence another way or leave
  it alone.** A sentence that obeys every rule and sounds machine-written has
  failed.
- **No construction is banned outright.** There is no approved-word
  dictionary and no blanket ban on the passive, "-ing" forms or contractions.
  A construction that carries timing, state or nuance stays: "the worker is
  processing the file" while it still is.

The codebase is the word list. Write the real symbol, file, flag or command,
not a synonym or a description of it. Use the words a developer would say out
loud; unslop's rule 26 lists the abstract metaphors to avoid. A named pattern
is fine when the document says what it means the first time.

## Pick the mode first (Diátaxis)

One document, one mode. Two questions pick it: does the reader need to act or
to understand, and are they learning or working? Use the same compass on a
whole document or on one sentence.

| Reader | Learning | Working |
| --- | --- | --- |
| Acting | Tutorial | How-to |
| Understanding | Explanation | Reference |

- **Tutorial: learning by doing.** The learner's success is your job. Open
  with what they will build. Every step produces a visible result; say what
  they should see. Keep explanation to a clause and a link. Write as "we", in
  commands.
- **How-to: steps to a goal.** Solve a problem the reader has, not an
  operation the machine can perform. Assume competence, allow forks ("If you
  want x, do y") and name the guide by the task.
- **Reference: facts for lookup.** Describe, only describe: options, limits
  and errors, dry, complete and without hedging, in the structure of the thing
  described. Generate it from code where possible.
- **Explanation: understanding and why.** One bounded topic that tolerates an
  implicit "About..." in front of its title: decisions, history, constraints
  and alternatives. The only mode that carries opinion. An RFC or design doc
  is an explanation that ends in a decision.

Do not mix modes. Split and link instead.

## Write sentences to the reader (Google developer style)

- Address the reader as "you", in the present tense. "Will" only for things
  that genuinely happen later.
- Say who does what: "the compiler checks", not "is checked". Passive only
  when the actor is unknown or beside the point.
- Write instructions as commands. Put the condition before the instruction:
  "To delete the document, click **Delete**." Common case first.
- No buzzwords, no "please" in instructions, and never "simply", "easy" or
  "quickly" in a procedure. Do not pre-announce future support.
- Link text says where the link goes. Never "click here".
- Headings carry the point, in sentence case. A task heading is a bare verb
  phrase; a concept heading is a noun phrase. One h1, no skipped levels.
- Numbered lists for sequences, bullets otherwise. Introduce a list with a
  complete sentence and keep items parallel.
- Code in code font, UI elements in bold, serial commas. Drop "etc." and say
  up front that a list is partial.

## Make statements load one at a time (STE)

- One instruction per sentence; one thought per sentence elsewhere. Split
  instructions over about 20 words and other sentences over about 25.
- Put the warning or condition before the step it guards.
- Keep "the" and "a": "Remove backup file" reads two ways.
- Give each word one meaning and each action one word, then keep them.
- Write procedures as direct commands, never narration or passive.
- Avoid "-ing" words where a plainer form exists.

## Leave no sentence open to two readings (Global English)

- Keep "only" and "not" next to the word they change.
- Break up long noun strings: "the proto import budget check script" becomes
  "the script that checks the proto-import budget".
- Make every "it", "they" and "this" point at one obvious thing; repeat the
  noun when in doubt. Never let "this" or "which" point at a whole clause.
- Do not drop verbs or the small words that show structure ("Ensure that the
  switch is off").
- Repeat the article in a series when the items are two things: "the client
  and the host".
- Periods, not semicolons. No em dashes, no slashes ("a, b, or both"), no
  "(s)" plurals, and text in parentheses is a full unit or its own sentence.
- Call each thing by one name everywhere, and do not reword unchanged
  sentences between edits.
- Skip idioms, Latin abbreviations and metaphors. Non-native readers,
  translators and agents parse plain constructions best.

## Vary the rhythm

A document can obey every layer and still read machine-written.

- Mix sentence lengths on purpose. Split the sentence that carries two
  thoughts; keep the long sentence that carries one.
- Have a view where the mode allows it. Explanation weighs trade-offs and says
  what it makes of them. Reference stays dry.
- Be specific over sterile: not "schema changes can cause issues" but "a
  column rename fails the build".

Hand back the deliverable itself, without a style audit, a mode announcement
or an explanation of the process.

## Neighbouring deliverables

- **PR bodies and commit messages** follow delivery's
  [PR writing](../../delivery/references/pr-writing.md). Every layer here
  except Diátaxis applies to their sentences.
- **Product UI strings** are not documentation. Use the project's copy or
  voice guide through [design](../../design/SKILL.md).
- Make every count or tree claim true at the commit that lands it, and give
  the command that regenerates it.

## Worked example

Before:

> Configuration of the proto import ratchet budget script parameters is
> performed via budget.json. Note that it's important to remember that running
> with --write, which updates the committed budget to reflect the current
> count, should only be done when lowering it. If exceeded, CI fails.

After:

> `budget.mjs` reads the committed budget from `budget.json` and counts the
> files that import protos. If the count exceeds the budget, CI fails. Run
> `budget.mjs --write` only to lower the budget.

Sources: diataxis.fr; developers.google.com/style; ASD-STE100 Issue 9 (2025);
Kohl, *The Global English Style Guide* (SAS Press). Fetched upstream
2026-07-18.
