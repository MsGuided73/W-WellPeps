# Triage playbook

For runs with a stated deadline. Read this instead of improvising a work order.

## The principle

Under a one-week window the register is not a report, it is a **work queue**. Order the
report by `(blocks_application, owner, effort)` so four people can work in parallel,
and keep the standard-organised view as a secondary section for the application itself.

Two things that are easy to get wrong:

1. **Do not spend the week on the claim sweep.** Sentence-level work is the sibling
   skill's, it is slower, and it is not what stalls applications. Absence of required
   disclosures is.
2. **Fixing something in `src/` does not fix it.** Nothing counts until it is deployed
   and the `--live` pass agrees. Build the deploy into the plan, not after it.

## Day plan

**Day 1 — register first, because it unblocks everyone else.**
Run `triage`, publish `REGISTER.md`. Hand `owner: you-provide` and `owner: lawyer`
items over immediately; those have the longest lead times and none of them are
engineering work.

**Day 1-2 — the two blockers that need no audit to justify.**
- The draft banner. All five legal pages publicly say they are not live legal notices,
  with internal instructions visible. **Either finish the pages or pull them from the
  footer.** Never leave that banner where an analyst lands. Pulling them is a one-line
  change and is strictly better than shipping visible placeholders.
- The HTTPS downgrade. `absolute_redirect off;` in `wellpeps-site/nginx.conf`, then
  redeploy and re-run `--live` to confirm zero downgrades.

**Day 2-3 — the missing pages.** States served, refund/cancellation, shipping, contact.
These are small builds whose content comes from `you-provide` and `lawyer`, which is
why day 1 hand-off matters.

**Day 3-5 — the partner disclosure block** on `/why-wellpeps`. One build, evidence for
Standards 1, 4, 7 and 8. Needs pharmacy names and licensure, not addresses.

**Day 5-6 — evidence pack, `verify` run, deploy, re-run `--live`.**

## What to cut

- Standard 3 — no site surface, cannot be resolved by the web team.
- The 45-article Learning Center sweep — `full` mode work.
- eBooks and social — `full` mode work.
- Self-hosting Google Fonts — S3, does not block submission.

## Decisions that need a human, not a default

Put these in front of the user early; each can stall a day if it arrives late.

**The draft legal pages.** Finish, or unpublish? Unpublishing is fast and safe;
finishing needs the lawyer. Do not let this sit undecided — it is the single biggest
application risk.

**"Licensed Providers in All 50 States."** Simultaneously the Standard 5 disclosure and
an unverified Standard 1/8 claim that the repo already flags internally. The worst
possible outcome is leaving the claim in the footer while publishing a states page that
lists fewer than fifty. Get the real coverage from Scriptful and make both match.
Certified physicians under the enterprise certification is not the same fact as
licensure in all fifty states.

**`ASSESSMENTS_PAUSED = true`.** Every CTA reads "Opening Soon". Nothing can be
mis-sold, which is good — but the reviewer also cannot evaluate the prescription flow,
which can itself delay approval. Decide deliberately and record the reasoning.

**The AI assistant.** `Assistant.astro` plus the `knowledge.ts` corpus answers clinical
questions live with no reviewer-visible control. Its full answer space cannot be
audited in a week. The defensible position is to gate or narrow it during review —
recommend that explicitly rather than claiming it was swept.

## Honest reporting

If something will not be done by the review date, say so in the report and mark it
`in-progress` with a date, rather than quietly leaving it `open`. An applicant with a
dated remediation plan reads better than one with unexplained gaps — and much better
than one whose site contradicts its own application.
