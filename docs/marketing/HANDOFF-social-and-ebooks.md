# Handoff: WellPeps Social Media Plan and eBook Program

Written 2026-09-02 at the end of the session that produced the Month 1 social
calendar and the five visual template systems. Read this before touching either.

---

## 1. Where things stand

### Delivered and committed (main, commits d3cbb90 and c598bd9)

| Asset | Path | Notes |
|---|---|---|
| Month 1 calendar | `docs/marketing/WellPeps Social Calendar - Month 1.xlsx` | 25 posts, 5 tabs: Calendar, Stories & Community, Template Specs, Compliance Rules, Learning Center Links |
| Template renders | `docs/marketing/social-templates/*.png` | Six finals: Myth vs Fact, 30 Seconds of Wellness, WellPeps 101, carousel cover, carousel inner, Lifestyle/Brand |
| Template source | `docs/marketing/social-templates/templates.html` | Single HTML file. All six frames, CSS built from the site's tokens, auto-fit script. Regenerate PNGs with Playwright (see section 5) |
| Template assets | `docs/marketing/social-templates/assets/` | Copies of site photos and logos the HTML references |

### Not committed

- The generator script for the spreadsheet (`build_calendar.py`) and the
  Playwright shooter (`shoot.mjs`) lived in the session scratchpad and are
  gone. The xlsx is the source of truth now. If the calendar needs regenerating
  from code, rebuild the script from the xlsx contents.
- Everything else untracked in the repo root (Home Page, Logo, Learning Center,
  knowledge-base, the acquisition PDF) was untracked before this session and
  was left that way deliberately.

### The strategy the calendar follows

Pre-LegitScript posture. Build credibility first, education as the backbone,
six recurring franchises, no prescription-product promotion until
certification. First medication-class post is Day 23 (GLP-1 education).
Four differentiator posts were added at Days 3, 11, 18, 26 from the client's
notes (Everything Included, Made in America, Why Monitoring Matters, Real Care
Not Just Medication).

---

## 2. Client preferences established this session (do not relitigate)

1. **Never crop a person.** No half-bodies, no faces sliced at the frame edge.
   The Lifestyle/Brand template was rebuilt so the photo card takes its size
   from the photo (no letterbox, no crop). Saved to memory as
   `wellpeps-no-cropped-people`.
2. **No ragged headlines.** Balanced line wrapping plus auto-fit to a line cap
   on every headline and statement. No lone word on the last line. If it still
   breaks badly, shorten the copy.
3. **Every slide must say something.** A tagline alone is not a post. The
   Lifestyle/Brand template carries a claim headline plus a supporting line.
   Tagline-only is allowed on Day 1 (welcome) and the Day 30 end frame only.
4. **The raised photo card is liked.** Rounded 28px card with drop shadow on a
   navy gradient field. Keep it.
5. **Alternate formats.** Not a feed of blue text cards. Photography,
   carousels, video, graphics in rotation.

---

## 3. Compliance guardrails baked into the calendar

- All intake CTAs on the site are stubbed (`#assessment-stub`) until launch.
  Social links go to Why WellPeps or a Learning Center article, never the
  assessment.
- Hair Restoration is gated (`HAIR_COMING_SOON = true` in
  `wellpeps-site/src/config.ts`). Day 1 says "hair restoration on the way".
- "Made in America" must carry the site's qualifier: "when applicable, sourced
  from trusted U.S. pharmacies and manufacturers."
- "Labs included with GLP-1" is a pricing claim and is held for
  post-certification. "Why monitoring matters" as pure education is in.
- NAD+, glutathione, peptides: educate on the molecule, never say WellPeps
  sells it, no efficacy claims.
- Expect Meta/TikTok moderation on ED content. Keep "ED" off graphics; have a
  no-ED variant ready.
- No medication names in Month 1. Drug class (GLP-1) allowed from Day 23.

---

## 4. Learning Center facts you will need

- Lives in Supabase project **wellpeps-blog** (`kwgwbupqzpusydzflyvi`), tables
  `blog_categories` and `blog_articles`. Site reads `status = 'published'`
  ordered by `position`.
- 46 published articles across weight-management, sexual-wellness,
  hair-restoration, peptides-wellness, wellness-foundations,
  telehealth-resources.
- URL pattern: `https://wellpeps.com/wellness-learning-center/<slug>`.
- Slugs are referenced by the social calendar. Treat them as fixed.
- Local source material: `Learning Center/` folder in the repo root (Word docs
  per category, blog guide, mockups).

---

## 5. Regenerating the template PNGs

Playwright is installed in `wellpeps-site/node_modules`. The script must run
from inside `wellpeps-site` or Node cannot resolve the module.

```js
// save as wellpeps-site/.shoot.tmp.mjs, run: node .shoot.tmp.mjs, then delete
import { chromium } from 'playwright';
const dir = 'C:/dev/W/docs/marketing/social-templates';
const names = { f1:'1-myth-vs-fact', f2:'2-30-seconds-of-wellness', f3:'3-wellpeps-101',
                f4:'4a-carousel-cover', f5:'4b-carousel-inner', f6:'5-lifestyle-brand' };
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 2000 } });
await p.goto('file:///' + dir + '/templates.html', { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
for (const [id, n] of Object.entries(names)) await p.locator('#' + id).screenshot({ path: `${dir}/${n}.png` });
await b.close();
```

Google Fonts (Lora, Inter) load over the network; the render needs internet.
Do not pipe node output through `head`, it kills the process after the first
frame.

---

## 6. Design tokens used (from `wellpeps-site/src/styles/tokens.css`)

Navy `#082B59`, navy deep `#061F42`, blue `#1576C4`, blue hover `#115E9C`,
sky `#2EA8F7`, gold `#D8A53A` (sparingly), pale `#F2F7FC`, light sky `#E8F1FB`,
cool `#E1ECF8`, body text `#4B5C73`, muted `#7A8899`, on-dark `#EAF1FB`,
on-dark muted `#9DB0CC`. Serif Lora 600 for titles, Inter for body and UI.
White transparent logo: `Logo/all-white-logo-transparent.png`. Dark-on-light
logo: `wellpeps-site/public/images/logo-full.png`.

---

## 7. Next task: the eBooks

The client will present the eBooks in the next session. What is known:

- **Three eBooks exist.** One is in final, professionally styled format. The
  other two are content only.
- **The ask:** assess whether the two content-only eBooks can be produced in
  the same professional styling as the finished one, then do it if feasible.
- **No eBook files were found in the repo** as of this session. Searched for
  `*ebook*` and `*e-book*` at depth 3. They will arrive with the client.

### Suggested approach

1. Get all three files. Confirm formats (PDF, InDesign, Canva, Docx, Google
   Doc). The finished one's *source* matters more than its PDF: if it is a
   Canva or InDesign file, replicate in that tool; if only a PDF exists, the
   styling must be rebuilt from scratch, which is a bigger job.
2. Extract the style system from the finished eBook: page size, margins,
   grid, type scale, heading treatments, color usage, chapter openers, pull
   quotes, callouts, image treatment, cover pattern, footer/page numbers,
   disclaimer placement.
3. Audit the two content-only eBooks against it: word count, chapter
   structure, whether they have or need imagery, whether the content already
   maps onto the finished book's page types.
4. Run the same compliance pass as the social calendar. eBooks are lead
   magnets and will be read pre-certification. Same rules apply: no
   medication offers, no pricing, qualifiers on Made in America, no efficacy
   claims for compounded products.
5. Production options in rough order of fidelity: rebuild in the original
   tool; HTML-to-PDF with the same token approach used for the social
   templates (Playwright can print to PDF); the `anthropic-skills:docx` or
   `anthropic-skills:pdf` skills for a Word or PDF pipeline. The Canva MCP is
   connected and can create designs from brand templates if the finished
   eBook is a Canva file.
6. Tie back to the social calendar: the plan's notes call for eBook promo
   posts. Two promo posts plus a Story sequence are unwritten and waiting on
   the eBook titles and download mechanism. The site captures emails via the
   `notify-signup` Supabase Edge Function but has no delivery path for a file
   yet, so the eBook download flow is also unbuilt.

### Questions to ask the client early

- Which tool made the finished eBook, and is the source file available?
- Are the two others final on content, or do they need editing too?
- Where will the eBooks be delivered from (site download, email, both)?
- Do they carry the same disclaimer language as the site footer?

---

## 8. Memory entries relevant to this work

In `C:\Users\benso\.claude\projects\C--dev-W\memory\`:

- `wellpeps-no-cropped-people` (feedback)
- `wellpeps-typography-conventions` (project)
- `wellpeps-learning-center-blog` (project)
- `wellpeps-product-card-standard` (project)
- `wellpeps-social-calendar-status` (project, written with this handoff)
