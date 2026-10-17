# The interview method

One branch at a time, highest risk first, until the important branches are
resolved. This is the detail behind the one-question-at-a-time section of the
skill.

## Order the branches

List what is genuinely open, then sort by risk: what would be expensive or
embarrassing to get wrong, and what blocks the most other answers. Ask about the
first one. Typical branches, in rough risk order:

- the problem being solved, and who it is for;
- ownership, placement and who decides;
- contracts, data shape and interfaces other people depend on;
- failure modes, rollback and what happens when it is wrong;
- ordering and dependencies, including what can safely wait;
- scale, performance and cost assumptions;
- what is deliberately out of scope.

## Ask one question

For each branch, in one short turn:

1. state the open question in a line;
2. say what the evidence already settles, and where that came from;
3. give one recommended answer and why you recommend it;
4. ask the person to confirm, correct or reject that recommendation;
5. record the answer as it actually is.

A recommendation is not a decision. "My recommendation is X, because Y - does
that match your intent?" is a question. Recording X as agreed before any answer is
not.

If the answer is vague, push once with a concrete scenario: "if the supplier
cancels the week before, does the event still run?" Then record whatever the
answer is, even when that answer is still unsure.

## Keep the running structure

Update three short lists after each branch:

- Resolved - the decisions actually made, and who made them.
- Open - what is still unanswered, and which branch it blocks.
- Blocked - what cannot move until something outside this discussion lands.

Keep it to a few lines in the conversation. It is a working aid rather than a
document, and it survives the session only if the person asks for it to.

## A non-software example

"Should the launch event be in the studio or at a venue?" Evidence first: the
studio's capacity and the guest list are facts to read, not questions to ask.
Then the branches, highest risk first - the budget ceiling, the date, whether the
venue is reachable for every guest, who signs the contract - one question each,
with a recommendation and a reason. The brief then records what was decided, what
is still open and what was ruled out, without pretending the unanswered parts are
settled.

## Stop

Stop when the important branches are resolved, when the person says the direction
is clear enough, or when a branch is blocked on something outside the discussion.
Do not manufacture questions to look thorough.
