# WellPeps — Task List

Last updated 2026-09-30. Status: **On hold** = parked by the client; **Blocked** = waiting on an answer or input; **Ready** = can start when approved.

## Uncommitted work in progress (as of 2026-09-30 evening)

Built, tests/typecheck/build passing, NOT committed or deployed:
- eBook sections: larger books; "Free" badge moved behind the "Smart Patient Guide(s)" eyebrow pill (waiting on Derek's notes before committing).
- One checkout: all 18 cards on GEN intake-first links (short-ID form, each verified to land on the right product); $29 deposit copy removed; Terms §8 "Payment" placeholder.
- Cards switched on: Oral Tirzepatide $229, MIC + B12 $119, Lipo-C $119; As Needed cards moved to 15-pill packs (Sildenafil $79, Tadalafil $85).
- Fifth Hair card: Topical Finasteride + Minoxidil + Tretinoin $149 (Vios foam, three strengths); Hair grid now 3 + 2 centered.
- New image `public/images/hair/product-finasteride-minoxidil-tretinoin-pair.webp` (dropper relabeled Finasteride, liposomal headers removed) — not used yet; use only if the product comes as solution too.
- docs/TASKS.md, docs/genhealth/WellPeps-Products-by-Topic-2026-09-30.xlsx.

Open questions for the client:
- Is the tretinoin topical foam only, or foam and solution? (decides card image/wording)
- Refund if the provider does not prescribe? (Terms §8; "Free Health Assessment" depends on it)
- Storefront key allowed origins set in GEN? (then re-test; next step: live price refresh)
- Add "15 tablets per month" to As Needed cards?

## On hold

| Task | Notes |
| :--- | :--- |
| **Install PostHog analytics** | Privacy-first setup for a healthcare site: no cookies/stored IDs, IP capture off, US cloud, session recording off (or fully masked), no autocapture of typed input. Named events only: page views, "Start Free Health Assessment" clicks (with product), eBook requests (with guide, never the email), UTM source. Update Privacy Policy (lawyer review). Needs: PostHog account + project API key (public key, OK to share); decide on BAA plan. Avoid Google Analytics. Cannot see inside the GEN Health checkout/portal. |
| **Derek's notes on the eBook sections** | Pending. The larger-books / "Free" badge-behind-eyebrow changes are built but uncommitted; fold Derek's edits into the same commit. |

## Ready (approve to start)

| Task | Notes |
| :--- | :--- |
| **Pull prices + links from GEN at build time** | `src/lib/genhealth.ts`: `GET https://api.gen-health.app/v2/client/products` (X-API-Key). Cards reference GEN products; each build reads price + assessment link. $0 or non-storefront products auto-show "Opening Soon". Needs `GENHEALTH_API_KEY` as a Coolify **Build Variable** (already in local `.env`). Prices are hand-copied from GEN as of 2026-09-30 until this lands. |
| **Price-change webhook → auto rebuild** | Depends on the task above. GEN webhook (Products events only) → Supabase Edge Function (verify signature, debounce) → Coolify deploy. Plus a nightly scheduled rebuild as backstop. Needs a Coolify deploy token and the GEN webhook secret stored as Supabase secrets (never in chat). No patient data involved. |
| **3-month / sublingual toggles on cards** | One card, option picker swaps price + link. As Needed cards are 15 tablets only (5- and 10-pill packs dropped 2026-09-30 as unprofitable; deactivate them in GEN): Sildenafil 15 $79 + 3-month $219; Tadalafil 15 $85; Semaglutide 3-month $449; Tirzepatide 3-month $649; Semaglutide oral drops $279; Sermorelin troche $99; NAD+ nasal $139. |
| **Save notify-signup Edge Function source in the repo** | Lives only in Supabase (v2, 2026-09-30, adds ebook_* sources). Add to version control. |
| **Commit + push the eBook size/badge changes** | After Derek's notes. |

## Done 2026-09-30

| Task | Notes |
| :--- | :--- |
| One checkout (intake-first) | All 18 cards use GEN intake-first links (short-ID form, each verified to land on the right product). $29 deposit copy removed; Terms §8 now has a "Payment" placeholder: client to state what happens to payment if the provider does not prescribe (needed for "Free Health Assessment"). |

## Blocked — waiting on client

| Task | Waiting on |
| :--- | :--- |
| Fix in GEN Health | Oral Tirzepatide is $0 but checkout-eligible; Semaglutide/Ondansetron ODT (Low Dose) same; "GLP-2" typo on Tirzepatide 3-month; Sildenafil 3-month set as 1-month supply; rename Minoxidil + Finasteride to "Topical Foam"; consistent pack naming (Tablets vs pills). |
| Lipo-C and MIC + B12 cards | Products created/active in GEN (cards show Opening Soon until then). |
| Tadalafil As Needed 15-pill pack | Product created in GEN. |
| Confirm card matches | Oral Semaglutide → "Sublingual or Tablets" ($229); Sildenafil → 5-tablet pack; NAD+ injectable vs nasal; Methylene Blue capsules vs therapeutic. |
| Hair product photos | Proper single-bottle shots for Oral Minoxidil and Minoxidil + Finasteride foam (current ones are crops); optional restyled Oral Finasteride. |
| Final eBook PDFs | Derek's approval; then set `pdf` per book in `src/data/ebooks.ts` so the guide opens after the email. |
| Phone number for legal pages | HIPAA Notice of Privacy Practices requires one; toll-free for opt-outs per lawyer. AI phone line not ready. |
| Rename oral GLP-1 cards "Compounded Oral …" | Client decision (compliance recommendation). |
| Home trust bar | Restore "You're in good hands / Trusted. Certified. Committed to You." (removed 2026-07-07)? |
| Merge home "Every WellPeps Program Includes" + "One Monthly Price" sections | Derek to choose cards. |
| Spironolactone for women (hair) | Post-launch, if time pre-launch. |
| Hormone Optimization program | Later: menu, rotating headline, product cards. |

## Deploy checklist (when ready)

1. Answer the Terms §8 payment question (refund if not prescribed?).
2. Checkout lock (built 2026-10-01, uncommitted): pages are public, assessment buttons ask for the access password (`CHECKOUT_LOCKED` in src/config.ts; password in local `.env` only). `SITE_GATE_HASH` is no longer needed. Before go-live: decide whether to make the GitHub repo private (the links are plaintext in config.ts there). At launch: set `CHECKOUT_LOCKED = false` and deploy.
3. `GENHEALTH_API_KEY` as a Coolify Build Variable: only once the build-time GEN price pull (Ready list) is built; today no site code reads it.
4. Deploy, then run the password-gate curl checklist in `wellpeps-site/README.md`.
