# Finding schema

`findings.json` is a single JSON array and is the **source of truth**. `report.md` and
`REGISTER.md` are rendered from it, never the other way round.

Why one array rather than front-matter-per-file: a future web app consumes this with
one `json.load` / `fetch`. Per-file front matter means a directory walk plus a parser
plus one record per file, and it cannot hold a nested `evidence[]` array cleanly.

The trade-off is that a model emits JSON less reliably than prose. The mitigation is
that `disclosure_scan.py --validate` checks the file and the run **fails** on a schema
violation. Fix the findings file; never relax the schema.

## Record

```json
{
  "id": "LS4-PHARMACY-NAMED",
  "standard": 4,
  "title": "Dispensing pharmacy is never named on the site",
  "severity": "S1",
  "blocks_application": true,
  "status": "open",
  "owner": "pharmacy-partner",
  "evidence": [
    {
      "kind": "file",
      "path": "wellpeps-site/src/data/content.ts",
      "line": 38,
      "quote": "licensed U.S. pharmacies"
    },
    {
      "kind": "url",
      "path": "https://wellpeps.com/why-wellpeps/",
      "note": "no partner section present"
    }
  ],
  "current_state": "The site refers only to unnamed licensed U.S. pharmacies.",
  "required_state": "Each dispensing pharmacy named, with the states it is licensed in.",
  "remediation": {
    "action": "Add the partner disclosure block to /why-wellpeps.",
    "effort": "M",
    "depends_on": ["LS4-PARTNER-ROSTER"]
  },
  "handoff": null,
  "evidence_pack_item": "partner-certification-attestation",
  "first_seen": "2026-09-22",
  "last_seen": "2026-09-22",
  "run_id": "2026-09-22-triage"
}
```

## Fields

| Field | Type | Notes |
|---|---|---|
| `id` | string | From the register in `standards.md`, or `-X<n>` for a novel finding. Required. |
| `standard` | int 1-9 | Required. |
| `title` | string | One line, states the defect. Required. |
| `severity` | `S1` \| `S2` \| `S3` | Required. |
| `blocks_application` | bool | Orthogonal to severity. Required. |
| `status` | enum | See below. Required. |
| `owner` | enum | `you-provide` \| `web-team` \| `lawyer` \| `pharmacy-partner` \| `provider-group`. Required. |
| `evidence` | array | May be empty only when `status` is `not-applicable`. |
| `current_state` | string | What is true now. Required. |
| `required_state` | string | What LegitScript needs. Required. |
| `remediation` | object | `action`, `effort` (`S`/`M`/`L`), `depends_on` (array of IDs). |
| `handoff` | object \| null | `{skill, mode, target}` when the fix is a wording change. |
| `evidence_pack_item` | string \| null | Links the finding to a document in `evidence-pack.md`. |
| `first_seen` | date | **Carried from the previous run.** Never regenerate. |
| `last_seen` | date | This run. |
| `run_id` | string | `<date>-<mode>`. |

### `evidence[]` entries

`kind` is `file` (with `path`, `line`, `quote`), `url` (with `path`, optional `note`,
optional `quote`), or `doc` (with `path` — a repo document, for evidence-pack items).

**`url` evidence outranks `file` evidence when they disagree**, because a reviewer sees
production, not the repo. A fix in `src/` is not resolved until it is deployed.

### `status`

| Value | Meaning |
|---|---|
| `open` | Confirmed gap, nothing done. |
| `in-progress` | Work started, not live. |
| `resolved` | Verified fixed, in production where applicable. |
| `accepted-risk` | Deliberately shipped as-is. **Requires `decided_by` and `decided_on`** — without them people silently close items. |
| `not-applicable` | Genuinely does not apply. Requires a `current_state` explaining why. |

### `severity`, re-anchored for certification

Same vocabulary as `wellpeps-compliance-review` — do not invent a second scale for the
same client — but anchored to the application rather than to a claim:

- **S1** — likely rejection or a remediation letter.
- **S2** — an analyst will probably ask about it.
- **S3** — hygiene.

`blocks_application` is a separate axis on purpose. A dead footer link is S3 and blocks
submission; self-hosting fonts is S3 and does not.

## ID rules

This is the part most likely to be got wrong, and the part the future app depends on.

1. **Format `LS<standard>-<REQUIREMENT-SLUG>`.**
2. **The slug names the requirement, never the defect.** `LS5-STATES-DISCLOSED`, not
   `LS5-NO-STATE-LIST`. A requirement-named ID survives the defect changing shape,
   moving file, or being half-fixed, and lets one record flip `open` → `resolved`
   rather than one record dying and another being born.
3. **The ID set is pre-enumerated** in `standards.md`. Set `status` on known IDs; do
   not invent. A genuinely novel finding gets `-X<n>` (e.g. `LS9-X1`) and a note to
   promote it into the register if it recurs.
4. **Never encode `file:line` in an ID.** Lines move; `evidence[]` absorbs that churn.
5. **`first_seen` is preserved by reading the previous run before writing the new one.**
   If IDs or `first_seen` churn between runs, the register has failed and the app
   downstream will break.

## Re-run contract

Running `triage` twice with no changes in between must produce a byte-identical
`findings.json` except for `run_id` and `last_seen`. That property is what makes
`verify` a cheap delta instead of a full re-read, and it is the single best test that
the schema is being applied correctly.
