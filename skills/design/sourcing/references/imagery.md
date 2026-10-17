# Source a selected image

Start with the project's originals. Search external imagery when it helps explain
the subject, then inspect one candidate before acquiring it. Keep its credit
with the file and verify its use in the finished work.

## Search and inspect

Use the maintained [image helper](../../scripts/assets.mjs) with Node's built-in
fetch. It supports Openverse, Wikimedia Commons, Art Institute of Chicago and
the Metropolitan Museum of Art. It has no upstream checkout dependency.

```text
node "<design>/scripts/assets.mjs" "<query>" --source openverse,commons,aic,met --json
node "<design>/scripts/assets.mjs" --inspect <provider:id> --json
```

Search returns at most five results per provider by default. `--limit` accepts
1-20. `--license safe` defaults to CC0, public domain, CC BY and CC BY-SA;
`pd`, `all` or explicit codes change the search filter. A filter does not establish
usage rights. `--width`, `--min-width` and `--orientation` control image selection.
Default search probes at most the first 128 KiB of each candidate from the bounded
provider response. Probed dimensions determine width and orientation filtering
before the result limit. Use `--no-check` for metadata only; unavailable dimensions
and orientation are `null`, and those candidates remain available for inspection.
Returned candidates report failed probes and their reasons in text and JSON.

Inspection refreshes one record's metadata without downloading its image. Search
and inspection write nothing. Results preserve provider errors rather than
treating a failed source as an empty successful search.

Public URL fields omit user information and recognised credential parameters in
queries and fragments. A
credential-bearing image URL is used only for its transient request; inspection
and the ledger retain its public link. Checked selection URLs must be public.

Open the source page and licence link. Inspect the actual image, its subject,
crop and relevant restrictions. Openverse's licence metadata requires verification
at the original source. Public-domain or CC0 metadata does not settle personality,
trademark, endorsement or other restrictions on a particular use.

## Record the checked selection

Save one selection in the task's existing evidence route. Copy `terms` from
inspection, add the check time, and record the intended use, subject relationship
and material edits. For example, this shape uses placeholders that must be
replaced with the inspected values:

```json
{
  "ref": "openverse:<inspected-id>",
  "intendedUse": "Historical reference beside the harbour study",
  "subjectRelationship": "Reference image; it does not depict our project",
  "terms": {
    "sourceUrl": "https://<inspected-source-page>",
    "licenseUrl": "https://<inspected-licence-page>",
    "checkedAt": "<ISO check timestamp>",
    "conditions": ["<every provider condition and any additional checked terms>"],
    "providerConditions": ["<copy the inspection array exactly>"],
    "requiredCredit": "<copy the inspected credit requirement>"
  },
  "edits": ["<material crops or edits, or no edits>"]
}
```

`providerConditions` is the exact snapshot of provider restrictions and licence
warnings. `conditions` must include those entries and may add terms found on the
source page. The helper compares fresh source URL, licence URL, full required credit
and provider conditions with this snapshot. Changed metadata requires a new
inspection and terms check. Changes that appear only on the source page cannot
be detected by the API comparison, so reinspect that page before acquiring or
using the image. The record is evidence of the check, not permission to use it.

## Acquire into the resolved working route

Acquisition requires Node 24 or later and the helper's locked Sharp dependency.
Set it up once in the source or installed design skill before use:

```text
npm ci --prefix "<design>/scripts" --omit=dev --include=optional
```

Search and inspection need only Node's built-in fetch. The helper never installs
dependencies during use; missing decoder setup holds acquisition without changing
the asset directory's prior bytes.

Resolve the project's asset root through the design router and read its asset
guide and README. Use its existing dated working directory, supplied as an
absolute path. The helper requires that directory to exist and reports its real
resolved path. It creates no asset tree and changes no originals or exports.

```text
node "<design>/scripts/assets.mjs" --get <provider:id> --selection <selection.json> --to <absolute-dated-working-dir>
node "<design>/scripts/assets.mjs" --credits --to <absolute-dated-working-dir>
```

Acquisition accepts one checked image with recognised rights metadata. A CC
licence needs its provider URL or a recognised explicit version; a missing version
does not imply CC 4.0. Raster formats are JPEG, PNG, WebP, GIF and AVIF. Unknown
rights, changed terms, unsupported MIME or mismatched image bytes fail before
publication. The full download is decoded with Sharp, including animated frames,
before staging. A GIF container check also requires complete blocks and a trailer
because its decoder tolerates incomplete containers. Decoder defaults apply;
nonfatal warnings are allowed, while reported errors hold acquisition. Saved image
bytes are unchanged. Use
`--name <unused-stem>` to resolve a filename conflict; existing files are never
overwritten. A repeat of the same selection with matching file metadata and
SHA256 validates the saved local image and returns `unchanged` without downloading
it again. An invalid saved image remains untouched for owner recovery.

The selected image and `credits.json` are the durable outputs. File paths in
the ledger are relative to the supplied directory. Each record retains the
source, creator, historical date, licence, image URL, actual bytes, retrieval
time, intended use, subject relationship, checked terms and edits. A corrupt
ledger stops acquisition and credit printing. An absent ledger starts empty.

## Place and verify credits

`--credits` prints escaped HTML with source and licence links, plus use and edit
notes. Include credits only for assets the work uses. Place required attribution
and any required change notice in the resulting work, keeping the links readable
and accessible. The ledger alone does not meet that requirement.

Inspect the finished work at its actual viewing sizes. Verify the credit links,
creator wording and any required edit notice against the checked terms. Confirm
the caption and surrounding copy describe the subject truthfully; a reference
image must not imply it depicts the project, client or a claimed result. Record
that visible inspection with the work's ordinary design evidence.

## Recover an interrupted acquisition

An exclusive `.taste-assets.lock` covers ledger read through commit. A second
invocation reports busy without writing or taking over. The lock names its
invocation, host, PID, start time, resolved directory and any planned temporary
files and image target. Only its creator removes it during normal completion.

Image and replacement ledger files are staged in that directory. The image is
published exclusively; the ledger rename is the commit point. Ordinary failed
writes remove only the invocation's new files and preserve previous bytes. A
process interruption or failed cleanup can leave new files and the lock behind.
This is an explicit owner recovery hold, not a successful acquisition.

The directory owner verifies that the named writer has stopped, checks the
existing ledger and the lock's named files, then reconciles the image and credit
record before removing the lock. Do not infer staleness from age or take over
automatically. Preserve files whose ownership is uncertain.

## Provider contracts

- [Openverse API](https://api.openverse.org/v1/) and its
  [licence verification warning](https://docs.openverse.org/api/reference/made_with_ov.html).
- [MediaWiki Imageinfo](https://www.mediawiki.org/wiki/API:Imageinfo) and
  [CommonsMetadata](https://www.mediawiki.org/wiki/Extension:CommonsMetadata).
- [Art Institute API](https://api.artic.edu/docs/), including public-domain
  metadata and the returned `config.iiif_url` image route.
- [Met Collection API](https://metmuseum.github.io/), including the bounded
  v1.1 search and public-domain image fields.

The selective source port and required MIT notice are recorded in
[third-party notices](../../../../THIRD_PARTY_NOTICES.md). Repository licensing
does not license an image returned by these providers.
