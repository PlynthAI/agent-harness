# Critique

Read the brief, the layered design direction, the references, the drawing spec
and the parameter schema, then judge the image, not the source.

## What to evaluate

- The dominant read first, then brief compliance, reference and style fidelity,
  composition, hierarchy, craft, depth and material, colour and tone, and
  technical output integrity where relevant.
- Locate every defect spatially - a region, a layer, an edge - and say whether
  it is systemic or isolated.
- Recommend the smallest changes likely to produce the largest visible
  improvement, mapped to existing parameter paths where possible. Propose recipe
  or capability changes only when a parameter cannot solve the issue.
- Judge fidelity to the project's style separately from the drawing's craft in
  its medium, and check that it still reads with the colour removed: a strong
  drawing does not rest on its accent.
- When two variants excel in genuinely different ways, keep the ambiguity rather
  than forcing a winner.

## Structured form

When structured output is wanted, return:

    {
      "summary": "dominant read and overall assessment",
      "strengths": ["visible strengths"],
      "issues": [
        { "location": "specific region or layer",
          "observation": "what is visibly wrong",
          "impact": "why it matters" }
      ],
      "edits": [
        { "priority": 1,
          "parameterPath": "/style/lineWeight",
          "change": "specific proposed adjustment",
          "reason": "expected visible effect" }
      ]
    }

## Pairwise comparison

For a blinded comparison, choose the result that better satisfies the brief and
its references overall, and keep the structured critique separate from that
preference. A renderer failure is invalid evidence, not a quality loss. Speed,
source size and cache behaviour never enter the preference. Critique does not
promote, overwrite or delete any artifact.

A judge anchored on a reference pool rewards that pool's density and devices,
and an optimizer against it converges on one idea. Choose references of the
brief's genre that pass the house conventions, and let a person's choice
outrank an automated ranking.
