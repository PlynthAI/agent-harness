# Evidence contract

Complete this before implementation. Keep each answer short and ground it in the
project's types, real fixtures or live data.

## Analytical intent

- Question: which exact question must the view answer?
- Decision: what can a user decide or investigate after reading it?
- Primary comparison: position, length, slope, area, colour or text - which
  judgement must be easiest?
- Relationship: temporal, categorical, ranked, distributional, compositional,
  correlative, geographic, hierarchical, flow or target-relative.

## Evidence

- Metric definition and denominator
- Units and number format
- Geography and reference population
- Time period, vintage and update cadence
- Source and trust state
- Aggregation or normalisation method
- Missing, suppressed, partial, stale and unavailable semantics
- Estimate, projection, confidence, sample size and uncertainty semantics
- Comparison baseline, target, threshold or prior vintage

## Encoding

- The approved library, block or chart family resolved from the project's
  component registry, such as `COMPONENTS.md`, and the rule that approves it
- The strongest available channel for the primary comparison
- Whether series sharing a domain and axis are merged into one layered chart
- Honest scale, and disclosure of any transformation such as indexing to a base
- Distinct treatment for observations, estimates, projections and thresholds
- Redundant encoding wherever colour distinguishes a series or a state

## Narrative

- A factual, insight-led title where the finding is stable and supported
- Period, geography, filter, unit and comparison context nearby
- The smallest number of annotations that explain the pattern
- What the data shows, kept separate from interpretation or recommendation

## Interaction, responsive behaviour and the accessible equivalent

- What remains visible without hover
- Keyboard, touch, focus, tooltip and selection behaviour
- Compact and expanded information priorities
- The narrow-width fallback: reduced density, direct labels or a table
- The semantic summary and the accessible values
