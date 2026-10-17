# The unslop catalogue

Adapted from pstack's `unslop` skill. Rule numbers are stable ids that other
skills and review notes cite. A retired rule leaves a gap; a new rule takes the
next unused number.

Break any rule here sooner than write a sentence that is clumsy, unclear or
wrong. When obeying a rule makes a sentence worse, fix it another way or leave
it.

## Content

3. **Superficial -ing phrases.** "highlighting...", "ensuring...",
   "reflecting...", "showcasing...". Delete them or replace them with the real
   claim and its source.
5. **Vague attributions.** "Experts believe", "industry reports suggest". Name
   the source or delete the claim.

## Language

7. **AI vocabulary.** Additionally, crucial, delve, enduring, enhance, fostering,
   garner, interplay, intricate, landscape (abstract), pivotal, showcase,
   tapestry (abstract), testament, underscore, vibrant. Use the plain word.
8. **Fancy ways to say "is".** "serves as", "stands as", "boasts", "features".
   Say "is" or "has".
9. **"Not just X, but Y."** State the point directly.
10. **Rule of three.** Ideas forced into groups of three. Use the natural number.
11. **Synonym cycling.** One thing called by four names in a paragraph. Pick one
    name and repeat it.
12. **False ranges.** "from X to Y" where X and Y are not on a real scale. List
    the items.

## Style

13. **Em dashes.** None in deliverables; this is the same rule as the "Talking to
    me" section of the user-level AGENTS.md. End the sentence or use a comma,
    and use a colon only before a list or an example. Do not swap in an en dash
    or a spaced hyphen as a stand-in.
14. **Colon overuse.** A colon before a list or an example is fine. A colon used
    as a mid-sentence connector usually props up a comparison the sentence does
    not need; rewrite so the point stands alone.
15. **Boldface overuse.** Do not bold every proper noun or acronym.
16. **Inline-header lists.** A bold label and colon that restates the line
    ("**Performance:** Performance improved...") becomes prose. A bold lead-in
    that ends in a full stop, names the item and is followed by new detail is
    fine.
17. **Title case headings.** Use sentence case.
18. **Decorative emojis.** Remove them from headings and bullets.
19. **Curly quotes.** Use straight quotes.

## Communication artifacts

20. **Chatbot phrases.** "I hope this helps", "Let me know if...", "Certainly",
    "Found the smoking gun". Remove them.
22. **Sycophantic tone.** "Great question", "You're absolutely right". Respond
    directly.

## Filler

23. **Filler phrases.** "In order to" becomes "to"; "due to the fact that"
    becomes "because"; "it is important to note that" goes.
24. **Excessive hedging.** "could potentially possibly be argued that it might"
    becomes "may".
25. **Generic conclusions.** "The future looks bright." State the specific plan
    or fact, or stop.

## Jargon

26. **Abstract metaphor nouns.** Substrate, wedge, vector, locus, vantage,
    nexus, primitive (as a noun), harness (as a metaphor), surface (as in "API
    surface"), bedrock, scaffolding (as a metaphor), modality, paradigm,
    gold-plating, ratchet (as a metaphor), evacuate (for moving code), endgame,
    north star, flywheel. Use the concrete word: "base" for substrate, "add" for
    wedge in, "a limit that only tightens" for ratchet, "move out" for evacuate.
    A word that is the real name of a product or component is not a metaphor;
    leave it.

## Plain speech

27. **Say what it does, not how it feels.** "types that follow your schema"
    names a feeling; "a column rename fails the build" names the mechanism.
    If a sentence cannot be restated as an instruction, a fact or a number, cut
    it. If it could appear unchanged in another project's docs, it says nothing
    about this one.
28. **Dense sentences.** If the reader has to backtrack, split the sentence or
    drop clauses. One idea per sentence.
29. **Passive voice.** Name the actor: "the compiler validates queries", not
    "queries are validated". Keep the passive only when the actor is unknown or
    does not matter.
30. **Adverbs propping up a verb.** "runs quickly" becomes "is fast" or the
    number; "significantly improves" becomes the measured change.
31. **The fancier word.** "utilize" becomes "use", "leverage" becomes "use",
    "facilitate" becomes "help", "numerous" becomes "many", "in the event that"
    becomes "if".
32. **Mannered prose.** Aphorisms, rhetorical fragments, personified code and
    figurative verbs ("rides along", "stands on") where a literal phrase exists.
    Say what you mean; rule 26 covers the nouns.
33. **Over-compression.** Dropped articles, verbless fragments, arrows and
    unexplained abbreviations. "Parser rejects bad date → exit 2, no write"
    becomes "The parser rejects a bad date, exits with code 2 and writes
    nothing."
34. **Stock figures of speech.** Phrases met so often in print that the reader
    no longer sees the picture: "low-hanging fruit", "move the needle", "at the
    end of the day", "a double-edged sword", "paves the way". "This fix is
    low-hanging fruit" becomes "This fix takes an hour and closes three bug
    reports." A fresh figure that shows what the literal phrase cannot is fine,
    and so is a figure that has become the field's own term, such as "technical
    debt" or "bottleneck". Rules 26 and 32 cover metaphor nouns and figurative
    verbs.
