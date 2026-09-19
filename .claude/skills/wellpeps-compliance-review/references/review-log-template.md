# Compliance review log template

Save as `docs/compliance/reviews/<YYYY-MM-DD>-<mode>.md`. One log per run.
Snapshot of pre-review content goes in `docs/compliance/snapshots/<YYYY-MM-DD>/`.

```markdown
# Compliance review — <mode> — <YYYY-MM-DD>

Reviewer: <agent + model>
Scope: <what was reviewed, e.g. "12 weight-management articles" or "peptides page">
Snapshot: docs/compliance/snapshots/<date>/<file>
Branch: compliance-review/<date>

## Summary

| Verdict | Count |
|---------|-------|
| PASS    | n |
| REVISE  | n |
| FLAG    | n |

Flags by severity: S1 n · S2 n · S3 n

Republish needed: <reseed articles / rebuild site / rebuild ebooks / re-render posters / none>

## Items

### <item id or slug> — <title> — VERDICT

<For PASS: one line, "No material issue." Nothing else.>

<For REVISE, one block per passage:>

**Location:** <field or section, e.g. body_html > "How NAD+ works">
**Rule:** <rule number and short name> · **Severity:** S<1-3>
**Before:**
> original passage, verbatim
**After:**
> revised passage, verbatim
**Why:** <one sentence>

<For FLAG, one block per passage:>

**Location:** <field or section>
**Rule:** <rule number> · **Severity:** S<1-3>
**Original language:**
> verbatim
**Compliance concern:** <brief>
**Recommended revision:** <replacement language, or "none defensible without verification">
**Human verification needed:** <exactly what must be confirmed and by whom>

## Flags requiring a decision

<Repeat every FLAG here as a checklist so an owner can tick them off.>

- [ ] <slug> — <location> — <one-line concern>
```

Rules for the log:
- Every changed passage appears with verbatim before and after. No summaries
  in place of quotes.
- PASS items are listed so the run is auditable, but get one line only.
- Do not merge two edits into one block; one passage, one block.
- If a batch was interrupted, say which items were not reached.
