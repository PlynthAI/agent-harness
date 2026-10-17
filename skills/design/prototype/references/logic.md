# Logic and state

The logic mode of the prototype method. One self-contained page that lets anyone
drive a state model by pressing buttons. Use it when the question is about
business logic, state transitions or data shape - the kind of thing that looks
reasonable on paper and only feels wrong once it is pushed through real cases.

Because it is one file with nothing to install, it can go to a non-developer - a
designer, a project manager, a person who knows the subject - and let them feel
the model for themselves. So it speaks their language rather than the code's.

## When this is the right shape

- "I am not sure this state machine handles the case where X then Y."
- "Does this data model actually let me represent the case where..."
- "I want to feel out what the API should look like before writing it."
- Anything where someone wants to press buttons and watch state change.

When the question is "what should this look like", that is the other mode: read
[visual.md](visual.md).

## Process

### 1. State the question

Write down the state model and the question before writing code: one paragraph at
the top of the demo, visible in the page rather than buried in a comment. A logic
prototype that answers the wrong question is pure waste, and making the question
explicit is what lets it be checked later, whether the user is watching now or
returning to it afterwards.

### 2. Isolate the logic in a portable module

Put the logic that answers the question in a single script block, written as a
small pure module that could be lifted into the real codebase. The page around it
is throwaway; this module is not.

The right shape follows the question:

- **A pure reducer**, `(state, action) => state`, when actions are discrete events
  and state is a single value.
- **A state machine** with explicit states and transitions, when "which actions
  are even legal right now" is part of the question.
- **A small set of pure functions** over a plain data type, when there is no
  implicit current state, only transformations.
- **A class or module with a clear method surface**, when the logic genuinely owns
  ongoing internal state.

Pick the shape that fits the question, not the one that is easiest to wire to a
page. Keep it pure: no DOM, no document, no button handlers reaching inside. The
page calls into it and nothing flows back, which is what lets the validated module
lift into the real code once the question is answered.

### 3. Build the shareable page

One file, plain HTML, CSS and JavaScript, everything inline, with no framework and
no build step, so it opens by double-click and survives being passed around. Where
a project's own runner already makes a scratch surface trivial, the same demo may
live there instead; its shape and its content do not change. The recipient opening
that one file directly stays the handover; your own check of it is a different
step, and it is served from a loopback address over HTTP rather than trusted from
disk (step 4). That local check server is not an application the demo depends on.

Write it for a non-developer. Every label is in the language of the business
rather than the code: buttons and state read like the subject, not like the
reducer. Explain in plain words what is happening. Lay it out top to bottom:

1. **Title and one-line explanation** of what the demo lets someone explore - the
   question from step 1.
2. **Current state**, the full relevant state rendered as a readable panel of
   labelled fields rather than a raw data dump, re-rendered after every click and
   calling out what just changed where that helps someone follow.
3. **Free-play buttons**, one per action and always available, so anyone can poke
   at the model in any order.
4. **Guided walkthroughs**, one tab per scenario. Each tab carries a short
   plain-language description of the situation it sets up and what to watch for,
   then the ordered buttons to press. Each step is a real button that performs
   that action and moves the walkthrough on, and starting a scenario resets to a
   known initial state so it runs the same way every time.

Choose scenarios that demonstrate the awkward cases - the happy path, a tricky
edge case, an attempt at something that should be illegal. Keep it restrained:
clean typography, generous spacing, one accent colour, and nothing that competes
with the state and the buttons.

### 4. Verify and hand over

Serve the file from a loopback address and check it over that address, which is
the harness's route for a generated local page: a local server started for the
check and stopped afterwards, not a dependency the demo carries. Press every
action and step through every scenario, and confirm the state panel matches what
the model actually did. Where browser tooling is available, use it and collect
what it shows. Record what you checked and what you could not. Then hand the file
over - or a running address - and let the user click through it whenever they get
to it. The interesting moments are "wait, that should not be possible" and "I
assumed X would be different": those are bugs in the idea, which is the point of
the demo. If they want new actions or another scenario, add them.

### 5. Capture the answer and the prototype

Once the question is answered, record the question, the verdict and the evidence
where the project keeps its task state - its own task, issue or workspace notes -
and leave the prototype itself where the project's retention rules put working
artifacts. The validated reducer, machine or function set then lifts into the real
module as the decision, and that integration goes through the project's normal
validation and review. Nothing here forces a branch, a commit or a clean-up pass:
how an artifact is retained is the project's convention, and a one-line note
pointing from the answer to the file is usually all it takes.

## Anti-patterns

- Turning the demo into a test harness. It answers one question by hand; the
  project's own checks and the real change's validation belong with the real
  change, not with the throwaway page.
- Wiring it to the real database. Use in-memory state, or a scratch store where
  the project's own rules allow one, unless the question is specifically about
  persistence.
- Generalising. No "what if we wanted to support X later" - the prototype answers
  one question.
- Blurring the logic and the page together. If the pure module touches the DOM or
  the document, or button handlers reach inside it, it is no longer liftable.
- Reaching for an application server, a framework or a build step for the
  shareable demo. One file the recipient opens directly; a build step defeats
  that. Serving that same file from a loopback address for your own check is fine,
  because the demo does not depend on it.
- Shipping the page into production. It is optimised for being clicked through by
  hand, and the module behind it is the part worth keeping.
