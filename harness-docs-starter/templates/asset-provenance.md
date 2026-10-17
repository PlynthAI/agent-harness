# Asset provenance

Fill this in beside an asset when someone other than its creator will use it.
Every field is optional except the first two, and `unknown` is a real answer: a
filename establishes neither ownership nor licence.

| Field | What to write |
|---|---|
| Project | The resolver's `project.id` that owns this copy, not the folder name. |
| Source or reference | Where the file came from: a URL, a publication, a supplied file, or `created here`. |
| Original or derivative | `original` for a file kept as supplied, `derivative` for anything produced from another input, `export` for an approved output. |
| Parent input | For a derivative, the asset path or task artifact it was produced from. |
| Author or generator | The person, or the tool and its version, when that is known. |
| Licence or permission | The licence or permission and where it is recorded, or `unknown` when nothing establishes it. |
| Intended export or use | Where an approved copy is meant to go and what consumes it. |
| Created | `<date>` |

Keep the record compact and keep it beside the asset rather than in a second
ledger. An export that someone approved is not disposable: it stays until its
owner retires it.
