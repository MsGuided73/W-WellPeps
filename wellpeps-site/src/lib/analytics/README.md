# Anonymous analytics (W6)

> **Status: built and tested, registered OFF, nothing deployed.** The tool is not
> in the production tracker registry (`ANALYTICS_ENABLED = false` in
> `src/lib/privacy/config.ts`), so the first-visit privacy bar does not appear and
> not one request is sent. The server function it talks to (`analytics-event`) is
> written but not deployed. This file tells the web team how the tool works, how
> to mark buttons for it, what it can and cannot tell you, and the exact steps to
> switch it on.

## What it is

A first-party, anonymous counter. It runs by default and visitors can turn it off
with the **Anonymous usage statistics** switch in "Your Privacy Choices" (consent
rules changed 2026-10-05: truly de-identified data needs notice, not consent). It answers: which pages are viewed, which labelled buttons and
links are clicked, and how far down a page visitors get before they leave.

It sets **no cookie**, uses **no localStorage, sessionStorage or IndexedDB**,
creates **no identifier** (not even a random one), and never records a URL query
string, a form value, or any text from the page. The `analytics-event` function
does **not store the IP address or user agent** of the request. Each event stands
alone: nothing in the data ties a click to the page view before it, or one page
view to the next.

Two honest limits on "anonymous":

* Every web request reveals the visitor's IP address and browser to the server
  that receives it, and **the hosting provider's own logs (Supabase's API
  gateway and function logs) may keep them** for their retention period. "We do
  not store your IP address" is true of the WellPeps tables, not of the
  provider's logs. Check the retention in the project's log settings and word the
  Privacy Policy and Cookie notice accordingly.
* A database administrator can read Postgres's internal row metadata, which shows
  approximate arrival order, and the events of one page view arrive in one
  request. At very low traffic, adjacent rows may be one visit. The tool is
  anonymous in its data model, in what the browser sends and in the reports, not
  against someone with direct database access who studies row internals.

Because it is anonymous in that sense, the consent rules let it run by default on
every page, health-topic pages included, independent of the analytics switches
(`anonymous: true` in the registry, `allowed()` in `consent.ts`), and it does not
by itself make the consent banner appear. Global Privacy Control does not turn this
tool off (GPC governs sale, sharing and advertising). A visitor who turns it off,
chooses Reject all or withdraws gets nothing more: the tool is stopped in the same
visit, anything not yet sent is thrown away, the opt-out is remembered (also across
a notice-version change), and a change made in another tab is picked up before the
page's last event can go.

## What one event contains

| Event | When | Fields |
|---|---|---|
| `page_view` | the tool starts on a page | path, template, viewport class, referrer class, previous-page template (internal referrers only) |
| `click` | a click on an allow-listed `data-track` target, or on the site header or footer | path, template, viewport class, target label |
| `page_leave` | each time the page is hidden or closed | path, template, viewport class, deepest scroll bucket and visible-time bucket **of that viewing stretch** |

A visitor who switches tabs and comes back (or returns through the browser's
back/forward cache) starts a new viewing stretch on the same page: clicks count
again and the next hide sends another `page_leave`; no new `page_view` is sent.
So `page_leave` counts are "viewing stretches that ended", a little more than
page views.

* **path**: the page path with no query or hash, lower-cased, **only for a page
  this site is known to have** (the lists in `sanitize.ts`). Any other path, and
  any path with odd characters, five or more segments, or six or more digits
  (even split by hyphens, as in `415-555-1234` or `1990-01-15`) is sent as
  `/_unmatched`. Text typed into the address bar can therefore not be reported.
  With `ANALYTICS_PATH_DETAIL = 'section'` (the default), health-topic pages are
  reported by their section only (`/wellness-learning-center`, not one article).
* **template**: `home`, `program`, `learning_center_index`,
  `learning_center_article`, `legal`, `privacy_choices`, `plan`, `about`, `other`.
* **viewport class**: `mobile` (under 768 px), `tablet` (under 1024), `desktop`.
* **referrer class**: `internal`, `search`, `social`, `direct`, `other`. The
  referrer URL is read in the browser, classified, and thrown away.
* **scroll bucket**: `0`, `25`, `50`, `75`, `100`, measured by the **bottom edge**
  of the window as a share of the page, so the first screen already counts and
  almost every stretch reaches 25; read the 75 and 100 rows for engagement.
  **Time bucket**: `0-10s`, `10-30s`, `30-60s`, `1-3m`, `3m+` (time the page was
  visible during that stretch).

On the server the time is kept only to the **hour**, and rows are deleted after
**13 months** (`supabase/migrations/20261001090200_analytics_events.sql`).

## What it can and cannot tell you

(The full version is the doc comment at the top of `model.ts`.)

**Can:** page views per page and template; where visits come from (class only);
clicks on each labelled target per 100 views of a page template; the spread of
scroll depth and time on page per template; mobile versus desktop; and an
**estimate** of drop-off by template (page views of a template minus the page
views whose previous page was that template, with entry pages being those that did
not come from this site).

**Cannot:** how many different people there were (these are page views, not
visitors); what one person did in order; returning visitors, cohorts or
retention; exact drop-off (the back button, reloads, new tabs and hidden referrers
distort it); what happens after someone leaves for GEN Health, beyond the click on
the button; anything about visitors who declined or whose browser blocks the
request. Counts are a sample of those who agreed, and anyone can post fake events
to the public endpoint, so treat them as indicative. Do not add a workaround that
would answer these (a session id, a cookie, a fine timestamp, a fingerprint): it
would turn this into a different tool that needs a different notice and consent.

## Marking buttons and links: `data-track`

Only two things are ever reported for a click, and never the element's text, id,
class or link address:

1. the nearest ancestor (or the element itself) with a `data-track="label"`
   attribute whose label is on the allow-list `CLICK_TARGETS` in `model.ts`, and
2. if there is none, an untagged link or button inside the **site header** (the
   element marked `data-nav`, in `NavBar.astro`) or the **site footer**
   (`footer.footer`), reported as the coarse role `nav` or `footer`. Other
   headers, footers and navs (an article's contents list, the chat widget) are not
   site chrome and count for nothing.

Everything else is ignored, including a `data-track` value that is not on the
list (a typo or an unreviewed label can never leak).

```html
<!-- the assessment button (rendered by AssessmentCta.astro) -->
<a href="..." class="btn btn--primary" data-track="cta-assessment">See If You Qualify</a>

<!-- a whole product card that is one link -->
<a href="..." class="pcard" data-track="product-card"> ... </a>

<!-- legal links in the footer -->
<a href="/privacy-policy" data-track="footer-legal">Privacy Policy</a>
```

Current labels: `cta-assessment`, `cta-ebook`, `cta-waitlist`,
`cta-newsletter`, `product-card`, `program-card`, `article-card`, `assistant`,
`privacy-choices`, `footer-legal`, `nav`, `footer`.

To measure something new:

1. add the label to `CLICK_TARGETS` in `model.ts` (lower-case letters, digits,
   hyphen or underscore, at most 40 characters, no six or more digits),
2. add `data-track="label"` to the markup,
3. run `npm test` (the contract test checks the server will accept it; the
   function and the database accept any label of that shape, so no redeploy is
   needed),
4. add the label to the Cookie notice description only if the *meaning* of the
   tool changes.

Tag the **action**, not the content: `cta-assessment`, not the program name or
button text, and never anything that names a person, a condition or a product a
visitor chose. Where a click matters per program, use the page template or path
that is already on the event.

`AssessmentCta.astro` carries a comment showing where the `cta-assessment`
attribute will go. No other component has been changed; adding the attributes is
for the web team.

**New pages.** A page is only counted by its own path if it is listed in
`sanitize.ts` (`PROGRAM_PATHS`, `LEGAL_PATHS` and the other routes in
`pageTemplateOf`). `routes.test.ts` walks `src/pages` and fails until a new page
is added there; until then it would be reported as `/_unmatched`.

## How it is built

| File | Role |
|---|---|
| `model.ts` | The event model and constants, and the "what it can and cannot tell you" comment. |
| `sanitize.ts` | Pure functions: path normalization (uses `normalizePath` from `consent.ts`) and the known pages, template, referrer class, click target, scroll, time and viewport buckets. |
| `collector.ts` | Listens for views, clicks, scroll, hide, pagehide and pageshow through a small `CollectorEnv` interface; emits sanitized events. Reads nothing from the page until it starts. |
| `browser-env.ts` | The real page behind `CollectorEnv`; reads only the path, referrer, window size, scroll position, page height and visibility. |
| `transport.ts` | Batches in memory (no storage) and sends with `fetch` (`keepalive`, credentials omitted, no referrer; `sendBeacon` only as a fallback because a beacon always carries credentials), drops on failure, does **nothing** with an empty endpoint. |
| `tracker.ts` | `anonymousAnalyticsTracker({ endpoint })`, the registry entry: `anonymous: true`, no cookies, no storage keys. |
| `contract.test.ts` | Fails if the browser model and `supabase/functions/_shared/analytics-event.ts` ever disagree. |
| `no-identifiers.test.ts` | Fails if the source starts using storage, random ids, device details, page text or query strings, or sends anything outside `transport.ts`. |
| `routes.test.ts` | Fails if a page in `src/pages` is not known to the tool. |

The registry (`privacy/registry.ts`) adds the tool only when `ANALYTICS_ENABLED`
is true, and the production build contains none of this code while it is false
(checked by `scripts/privacy-prod-check.mjs`). `privacy/browser.ts` re-reads the
saved choice first whenever the page is hidden or closed, so a withdrawal made in
another tab stops the tool before it sends a last event.

## Switching it on (all must be done, in this order)

Nothing below has been done.

1. **Deploy the function and its table.** Follow `supabase/README.md`: set
   `ALLOWED_ORIGINS`, run the migration, deploy `analytics-event`, and pass the
   curl checks for it.
2. **Point the site at it.** In `src/lib/privacy/config.ts` set
   `ANALYTICS_ENDPOINT` to `` `${FUNCTIONS}/analytics-event` ``.
3. **Counsel approves** use on health-topic pages, and decides
   `ANALYTICS_PATH_DETAIL`: `'section'` (the default) reports health-topic pages
   by section only; `'full'` also reports which Learning Center article was read.
4. **Notice updates (W7).** Name the tool in the Cookie notice tool table and in
   the Privacy Policy: what it records, the host `kwgwbupqzpusydzflyvi.supabase.co`,
   that it sets no cookie and creates no identifier, 13-month retention, that it
   can run on health-topic pages, how to turn it off, and (accurately) that the
   hosting provider's logs may keep IP addresses. Add `wellpeps-anonymous-stats`
   to `NOTICE_TOOL_IDS.analytics` in `privacy/cookie-notice-inventory.ts`, and bump
   `NOTICE_VERSION` in `privacy/consent.ts` (this re-prompts every visitor). Have
   counsel review the visitor-facing text in `tracker.ts` (`name`, `description`).
   Also list the privacy control's own once-per-session flag: whenever the first-visit
   bar shows, `ui.ts` writes `wp_reprompt_logged` to sessionStorage (it is the
   control, not the analytics tool, and it is not set today because the bar never
   shows while the registry is empty).
5. **Check the headers (W4).** The Content-Security-Policy must allow
   `connect-src https://kwgwbupqzpusydzflyvi.supabase.co`, or the browser blocks
   the requests. The `Referrer-Policy` must be `strict-origin-when-cross-origin`
   (or `same-origin`): `no-referrer`, `origin` and `strict-origin` hide the previous
   page and break the drop-off estimate.
6. **Flip the switch.** Set `ANALYTICS_ENABLED = true` in `privacy/config.ts`.
7. **Update the tests that describe today's state.** `npm test` will fail on
   purpose until step 4 is done (`notice-inventory.test.ts` and
   `analytics/production-off.test.ts`), and `registry.test.ts` ("currently lists
   no non-essential tool") and `scripts/privacy-prod-check.mjs` (which expects
   "No analytics tool runs today") must be edited to expect the tool under the
   "Anonymous usage statistics" row. The banner still does not appear for this
   tool alone. Then run `npm test`, `npm run build`,
   `node scripts/privacy-prod-check.mjs` and `node scripts/privacy-e2e.mjs`, and
   look at the banner at the six window sizes with
   `node scripts/banner-overlap-check.mjs`.
8. **Verify in a browser.** Open the deployed site (the tool is on by default), and in
   DevTools check: requests to `analytics-event` appear after a few seconds and
   on leaving a page, sent with no cookie header; `document.cookie` holds only
   `wp_consent`; Application storage holds nothing from the analytics tool; no
   cookie appears for the Supabase host; turning "Anonymous usage statistics" off
   sends nothing more, and neither does withdrawing in a second tab. Then check rows in
   `analytics_events`.
9. **Tag the buttons** (the section above) and, when you want reports, run
   `supabase/analytics/example-views.sql` in the SQL editor.

To switch it off again, set `ANALYTICS_ENABLED = false` and redeploy; the tool
stops loading everywhere. Existing rows are removed by the 13-month purge or by
deleting from `analytics_events`.
