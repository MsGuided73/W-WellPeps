# GEN Health dashboard — build and data request

**Paste this whole document into the Claude extension while signed in to the
WellPeps GEN Health client dashboard as Client Admin.**

Prepared 2026-09-18 for the wellpeps.com → GEN Health cutover.

---

## Your mission

WellPeps runs a static marketing site at `wellpeps.com` that never handles PHI.
Every call-to-action links out to GEN Health. Your job this morning is to get the
backend to the point where four things work:

1. **A patient can log in to the portal** — already live, needs verification only
2. **Product buttons on wellpeps.com link to real GEN Health checkout** — needs
   four URLs that do not exist yet
3. **Checkout is testable in sandbox tomorrow** — needs Stripe test keys and a
   provider-network switch we do not control
4. **"Start Your Free Assessment" leads somewhere that is genuinely free** — needs
   a flow decision and a price check

There is also a **monthly membership fee — $49 the first month, then $79** — which
may not map onto anything GEN Health offers natively. That is the biggest unknown
and it has its own section (§6).

Filling in four constants in one config file is the entire website-side change:

| Constant | Needs |
| --- | --- |
| `SCRIPTFUL_STOREFRONT_URL` | Generic storefront / assessment entry point |
| `SCRIPTFUL_WEIGHT_PRODUCT_URL` | Weight Loss checkout link |
| `SCRIPTFUL_SEXUAL_PRODUCT_URL` | Sexual Wellness checkout link |
| `SCRIPTFUL_PEPTIDE_PRODUCT_URL` | Healthy Aging & Vitality checkout link (constant will be renamed) |

A fifth may be needed for the membership. See §6.

---

## Ground rules — read before clicking anything

**The tenant is new and nothing is live yet.** Many questions below will correctly
come back empty. That is not a failure; it means the step has not been built.

- **Read before you write.** Report current state before changing anything.
- **Never paste an API key, secret or token into your report** — including the
  Stripe `sk_test_` key. Confirm only that it was entered and whether the
  connection test passed.
- **Do not click the `None` processor tile.** It switches payment test mode on
  instantly with no confirmation, and it breaks hosted checkout entirely.
- **Do not click processor tiles exploratorily.** A tile that already holds saved
  credentials goes live the instant you click it.
- **Never submit a payment** during the Free Assessment walkthrough in §5.
- If a product needs activating to expose its checkout links, **ask first** —
  activating also changes what patients can browse.
- Where this document and anything in our repo disagree, **what you see on screen
  wins.** Report the discrepancy.

### One file in our repo is about a different tenant — ignore it

`telehealth/genhealth-api-report.docx` was written 11 Sep 2026 against the
**"Pep Rite"** tenant, and its own header says so. Its claim that the client model
is "Review Only" is **wrong for WellPeps**, which is **Review + Prescribe**.

Everything tenant-specific must be read fresh from this dashboard: client ID, API
key, storefront key, webhook URL, feature flags, products, formulary, lab panels.

The *platform* documentation — screens, routes, button labels — is still current
(the live guides read "Last updated August 24, 2026"), so the paths below should
match what you see.

---

## What we already know

| Fact | Status |
| --- | --- |
| Client model | **Review + Prescribe** (`gfe_prescribe`), non-affiliate — confirmed by the client |
| Patient portal | **Live** at `https://portal.wellpeps.com`, TLS valid to 15 Dec 2026 |
| Portal branding | Working — title, favicon, OG image all WellPeps. **One defect: see §7** |
| Email domain | **Active** — patient email sends from `notifications@wellpeps.com` via Postmark |
| URL slug | `wellpeps` — treat as permanent |
| Payment processor | **Stripe**, newly signed up, not yet connected |

Because the account is Review + Prescribe and non-affiliate:

- The **processor grid is visible**, so Stripe can be connected. On Affiliate it
  would be hidden and money would route through the provider network instead.
- WellPeps' own processor is **attempted first**; the network's is fallback only.
- WellPeps is **eligible** for `features.apiOrders`, which gates vault-charge
  billing. Eligible is not enabled — only GEN Health can turn it on.

---

## §1. Send two tickets FIRST — before touching the dashboard

These depend on other people and have overnight lead time. **If they go in at noon
instead of now, tomorrow slips.**

### Ticket 1 → the provider network

Left menu → **Support** → **Create Support Ticket**. The first question asks who
the ticket is for: **GEN Health**, **OnlyScripts**, or the provider network by
name. **Choose the provider network** — the other two cannot action any of this.

Ask for all four:

1. **Sandbox mode enabled** on the WellPeps client for test orders on 19 Sep 2026
2. Written confirmation of when it is on, and the agreed time it is switched off
3. **"Patients can message providers directly"** enabled under Workflow
   permissions — it is **off by default** and the membership depends on it (§8)
4. Confirmation of **Review + Prescribe**, and which **lab vendors** are activated

> **Why sandbox mode matters and why you cannot set it.** It is a per-client
> switch that blocks every outbound integration — OnlyScripts receives no
> prescriptions, Junction receives no labs — while the account otherwise works
> normally, with visits carrying a sandbox badge. It is what stops a test order
> reaching a real pharmacy. It lives on the Client record in the *provider
> network's* dashboard. We have no access to it.

### Ticket 2 → GEN Health

1. Can **`features.apiOrders`** be enabled for this client? It gates vault-charge
   billing, which the monthly membership may require (§6)
2. If the provider network cannot activate a lab vendor, can GEN Health? Creating
   a lab panel is impossible until one is activated (§8)

**Report:** both ticket numbers and the exact text submitted.

---

## §2. The build order

GEN Health's own setup path, with dependencies corrected and our completed work
marked.

### The four hard blockers

The guide names exactly four things that stop a patient buying anything:

> **network link · payment processor · an active product · a form the patient can
> complete**

Everything else is polish. If tomorrow's test order fails, it is almost certainly
one of these four.

| Step | Page | Note |
| --- | --- | --- |
| 1 | `/integrations` — **link provider network** | **HARD BLOCKER.** Nothing clinical works without it. Verify via the Owner column on `/products` |
| 2 | `/settings/overview` — **account payment method** | Pays GEN Health's platform and lab processing fees. **Labs cannot be enabled or sold until this card is on file.** Separate from Stripe |
| 3 | `/billing` — **connect Stripe** | **HARD BLOCKER.** See §3 |
| 4 | `/dashboard` → Users — **team** | So Dana is not the only operator |
| 5 | `/settings/branding` | **Mostly done.** Only fix the navy — §7 |
| 6 | `/settings/patient-experience` | Checkout order, messaging switches, patient sidebar — §8, §9 |
| 7 | `/forms` — **intake, consents** | **HARD BLOCKER.** No intake, no review |
| 8 | `/products` | **HARD BLOCKER** — a product must be **Active** before checkout links exist — §4 |
| **12** | `/integrations` — **pharmacy** | ⚠ **Do this before step 9.** See trap below |
| 9 | `/formulary` | Which medication and pharmacy a product resolves to |
| 10 | `/labs` | Needs step 2 **and** an activated vendor — §8 |
| 11 | `/visits` | Only if offering live video visits |
| 13 | `/dashboard` — **go live** | One real test order end to end |

### ⚠ The ordering trap in their own numbering

GEN Health lists **Formulary as step 9** and **Integrations/pharmacy as step 12**.
But `/formulary` **does not exist until the pharmacy integration is complete** —
before then the route returns *Page not found*.

Step 9 is unreachable until step 12. **Connect the pharmacy before the formulary**
or you will lose time hunting a page that has not been created yet.

### Confirm the model while you are in `/billing` (60 seconds)

1. Confirm a **processor grid of nine tiles** is present. Report the exact subtitle
2. Confirm `/products` loads rather than 404s
3. Cross-check the `Client model:` line in the **V2 Guide** tab of the developer
   docs (§10)

**If the processor grid is hidden, STOP** — the account is not Review + Prescribe
after all, and Stripe cannot be connected.

---

## §3. Stripe — and the test-mode trap

### The trap

The `None` tile is labelled *"Test mode — no real charges."* It looks like the
obvious way to test. **It is not.** GEN Health's own documentation says:

> *"This is the state people refer to as 'demo mode'; **hosted checkout does not
> support it at all**."*

Hosted checkout links are our entire integration, so `None` breaks precisely the
thing we need to test.

### The answer: Stripe test keys

Stripe issues test keys (`pk_test_…` / `sk_test_…`) that work against the real
Stripe API with no money moving. The **Stripe tile is a real processor** as far as
GEN Health is concerned, so hosted checkout works normally and nothing is charged.

**This is the path for tomorrow.**

| Field | Value |
| --- | --- |
| Publishable Key | `pk_test_…` today, `pk_live_…` at launch |
| Secret Key | `sk_test_…` today, `sk_live_…` at launch |
| Webhook Secret | Optional — GEN Health registers the webhook automatically |

The dialog closes with **Cancel**, **Test connection**, **Verify and save**. Run
**Test connection** first — it validates without committing.

**Before entering anything, report:**

- Which tile carries the green **Active** chip
- Whether any tile shows an amber **"Missing keys"** chip (Active + Missing keys
  means checkout is broken — activated before credentials were saved)
- Whether the Stripe tile already holds credentials
- Whether the **NMI** tile is active — the portal shell loads
  `secure.nmi.com/token/Collect.js`, so someone may have configured it
- The read-only **Webhook URL** shown in the Stripe dialog

**Then, with Dana's go-ahead,** enter the Stripe **test** keys and run Test
connection.

> Flag for launch day: confirm whether GEN Health re-registers the Stripe webhook
> when keys change. A stale test-mode webhook would silently drop live orders.

---

## §4. Products and checkout links

### 4a. Inventory

Go to `/products`. For **every** row, capture:

| Field | Where |
| --- | --- |
| Name | Name column |
| Status | No badge = **active**. Grey *"Inactive"* text = off sale |
| *"Hidden from storefront"* | Sub-line, present or not |
| Price | Price column |
| **Assessment price** | Row editor → Overview tab |
| Payment column | **Red icon** = *"Set up a payment processor before patients can purchase this product"* |
| Paired formulary | *"{n} medications"* / *"Needs pairing"* / *"No pharmacy"* |
| Unavailable states | Row editor → Overview, bottom |
| Owner | Should show the provider network name |

We need products matching these site programs:

**All four programs are launching** (confirmed 2026-09-18):

1. **Weight Loss**
2. **Hair Restoration**
3. **Sexual Wellness**
4. **Healthy Aging and Vitality**

⚠ **Naming mismatch to resolve.** The website currently calls the fourth program
**"Peptides & More"** at `/peptides` (slugged `wellness-longevity` internally).
Its content is already Healthy Aging–themed. We are treating **"Healthy Aging and
Vitality"** as the correct name and will rename the site to match the dashboard.

**Name the GEN Health products to match the four above** — the site will be
changed to fit, not the other way round. If products already exist under other
names, report the exact names rather than renaming them.

⚠ **Every price on the website is out of date.** Do not cross-check dashboard
prices against wellpeps.com — they will not agree and the site is wrong. Prices
are being set from actual formulary costs. Just report what the dashboard holds.

Flag any of the first three that are missing, inactive, or showing a red payment
icon. Each blocks a checkout link.

> *"Hidden from storefront"* is **not** a fault. An active-but-hidden product still
> sells through a direct link — that is how a link-only offer is run. Only
> **Inactive** disables the links.

### 4b. The three checkout links

On each product row, click the link icon labelled **"Checkout links for {product}"**.
Three variants appear, each with **Copy** and **Open**:

| Flow | What the patient does |
| --- | --- |
| **Product-first** | Pays for the product first, then onboarding, intake, scheduling |
| **Assessment-first** | Completes intake and forms first, then pays **for the visit only**. Product payment not collected |
| **Intake-first** | Completes intake and forms first, then checks out to pay for the product |

If the icon is greyed out the product is inactive — tooltip: *"Activate this
product before sharing checkout links."*

**Copy all three variants for all four programs — twelve URLs.** We will
pick one flow and apply it consistently, but we want to see all three first.

### 4c. ⚠ Report the hostname

For each URL note the **host**:

- `portal.wellpeps.com/...` — our branded domain. Ideal.
- `app.genhealthehr.com/...` or `*.gen-health.app/...` — GEN's shared host.

If they come out on a GEN host, **say so and do not assume it is broken.** We have
verified that every path on `portal.wellpeps.com` returns the branded WellPeps
shell over valid TLS — including `/checkout`, `/products`, `/store`, `/assessment`
and `/intake`. The branded host very likely serves the same checkout route and we
can swap the hostname. We will test that, not guess it.

### 4d. Storefront entry point

We need one generic entry URL for the nav button, home hero and several CTAs that
are not program-specific. Check **Manage categories** and **Show on storefront**,
then find the patient-facing storefront address.

**Report:** the storefront URL and whether it is branded.

> For a product to appear in the storefront it needs **Active** on, **Show on
> storefront** on, a **Price** set, and the patient's state absent from
> **Unavailable states**. A product with no price is silently excluded with no
> warning on the row.

---

## §5. The Free Assessment

**"Free Assessment"** / **"Start Your Free Online Assessment"** appears in roughly
twenty places across wellpeps.com — nav, every program hero, every product card,
every bottom CTA, the Learning Center, the assistant.

That is a pricing claim on a healthcare site, so it has to be literally true.

| Flow | Is the assessment free? |
| --- | --- |
| Product-first | **No.** Pays for the product before reaching intake |
| Assessment-first | **Only if Assessment price is $0** — this flow charges for the visit |
| Intake-first | **Yes.** Intake first; payment is for the product at the end |

**Intake-first is our working recommendation** — it is the flow that makes the
existing copy honest. But it hinges on the **Assessment price** field, which we
have not seen.

**Report, for each of the four programs:**

1. **Assessment price**
2. **Price**
3. Whether **"Offer included visits"** is on
4. Whether **"Requires sync visit"** or **"Requires labs"** is on

**Then walk the flow.** Open the **Intake-first** link for Weight Loss and go as
far as the first payment screen — **without submitting payment**. Capture:

- What the patient is asked, screen by screen
- Whether any charge appears before intake is complete
- What the first payment screen says, and the amount
- Whether pages are WellPeps-branded, and on which hostname
- Anything that contradicts the words "Free Assessment"

Repeat more briefly for **Assessment-first** so we can compare.

> If neither flow makes the assessment genuinely free, say so. The site copy has to
> change before launch and that is a twenty-file edit we need to schedule.

---

## §6. The monthly membership — highest-risk unknown

**Decided 2026-09-18: $49 for the first month, then $79 for every month after.**

That is an intro-rate subscription — the same structure Ro ($39 → $149), Hims
($39 → $149), Mochi ($39 → $79) and Eden ($39 → $99) all use, so the market
accepts it. It covers ongoing care and support, access to low-cost labs, and
possibly shipping.

Medication prices will be set from **actual formulary costs**, not from our
earlier pricing memo — so do not expect the site's current prices to match
anything. The site is on old pricing throughout and will be updated separately.

**That is two recurring charges per patient**, and GEN Health may have no native
object for the first one.

### ⚠ Extra question: can GEN Health express an intro rate at all?

A flat recurring price is one thing. **"$49 first period, $79 thereafter" is
materially harder**, and nothing we have read says GEN Health supports it.

Find out which of these is true, in this order:

1. **Does the subscription mechanism itself support a different first-period
   price?** When Subscription product is enabled, or on whatever plan editor
   exists, look for an intro / first-period / trial price field. Report the exact
   field names.
2. **If not, can Promo Codes do it?** There is a **Promo Codes** manager on the
   `/products` toolbar, shared with `/labs`. Report whether a promo code can
   apply to **only the first billing cycle** of a subscription, or whether it is
   one-time / order-level only. This is the likely fallback and we need to know
   its limits.
3. **If neither**, report that plainly. The options then are a $79 flat fee with
   a separately-sold first-month offer, or billing the membership in Stripe
   outside GEN Health — and that is a decision for Dana, not a workaround to
   improvise.

**Do not build the membership product until this is answered.** Setting it up as
a flat $79 and bolting an intro rate on afterwards may not be possible.

### The contradiction we need resolved

| Source | Says |
| --- | --- |
| Platform guide | *"You cannot locate a Subscriptions button. **There is none.** Subscriptions are a per-product switch, not a separate manager."* That switch is *"Refill this product automatically on a recurring cadence"* — medication auto-refill |
| Our API review | Five endpoints at `/v2/client/subscriptions` — recurring plans with price, cadence, `billingMode: invoice \| vault_charge`, and "plans can be created in the admin UI" |

Both cannot be right.

### ⚠ The vault_charge gate

Billing a stored card on a cadence is `billingMode: vault_charge`. On
`/settings/payments` the **Vault charge orders** card reads:

> *"Requires API Orders to be enabled for this client. Contact your Gen Health
> administrator to enable API Orders first."*

**Only GEN Health can turn API Orders on** (ticket 2, §1). Finite installment
billing needs it too, plus vault charges enabled first.

### Answer these five

1. **Is there any admin surface for creating a recurring plan** other than the
   per-product switch? Check the left menu, `/settings`, and try `/subscriptions`
   directly. Report what loads or 404s.
2. **State of the Vault charge orders switch** — on, off, or disabled with the
   "Requires API Orders" helper text? Same for **Finite installment billing**.
3. **Open a product → Overview → Subscription product.** When enabled, what fields
   appear? Can a **cadence** be set (monthly/quarterly)? Is the recurring amount
   the product Price or separately settable?
4. **Could a membership be its own product?** i.e. "WellPeps Membership" at $49–79,
   Subscription product on, no pharmacy pairing, no medication. **Do not create
   it** — report whether the editor would permit a product with no formulary
   pairing, and whether such a product is buyable through a checkout link.
5. **In the V2 Guide (§10), find the Subscriptions section.** Report what it says
   about creating plans and about `order.subscriptionBilling: "gen"`. Specifically:
   **is `billingMode: invoice` available?** Invoice mode may sidestep the API
   Orders gate entirely.

**Verdict to report:** testable tomorrow / blocked on API Orders / neither.

> If neither, the fallback is billing the membership directly in Stripe outside
> GEN Health. We would rather not — it splits the patient's billing across two
> systems and our marketing site has no server to host a Stripe checkout on.

---

## §7. Fix the brand navy

The portal sets `theme-color` to **`#012576`**. WellPeps brand navy is
**`#082B59`**. `#012576` matches nothing in our design tokens — it looks like a
near-miss typed into the branding form. It tints mobile browser chrome, so patients
see it.

Go to `/settings/branding` and check every colour field:

| Token | Correct value |
| --- | --- |
| Navy — headlines, nav, footer | `#082B59` |
| Navy deep — footer base | `#061F42` |
| Brand blue — CTAs, links, icons | `#1576C4` |
| Blue hover | `#115E9C` |
| Blue soft — accents | `#2EA8F7` |

**Report what each field holds before changing anything**, correct any that are
wrong, and report what changed.

Also confirm on that page:

- **URL slug** is `wellpeps` — permanent; renaming breaks any link already shared
  as `?brand=wellpeps`
- **Custom Domain** badge reads **Active** for `portal.wellpeps.com`
- **Email Domain** badge reads **Active** for `notifications@wellpeps.com`

---

## §8. Can we deliver what the membership sells?

The membership sells three things. **Two are off by default or controlled by
someone else.** If a member pays and any of these does not work, that is a refund
and a complaint.

### 8a. Doctor messaging — off by default, not ours to switch on

**Gate 1 — the provider network.** The toggle **"Patients can message providers
directly"** sits in their Workflow permissions: *"Patients may pick an eligible
assigned Provider. The care team retains visibility, but only that Provider
receives the unread alert."* The guide is explicit: **"Every switch is off unless
somebody turned it on."** With it off, patients reach the WellPeps care team, not a
doctor — a different product from the one being sold. This is ticket 1, §1.

**Gate 2 — our own settings**, `/settings/patient-experience` → **Patient
messaging**:

| Switch | Why it matters |
| --- | --- |
| **Allow patients to send messages** | Off = read-only history. Membership is dead |
| **Allow messaging without an order** | **Critical.** A member paying for access *before or without* ordering medication cannot message at all unless this is on |
| **Client care team** | Default destination — routes to WellPeps staff, not a provider |

If every destination is off: *"Select at least one destination so patients can send
messages."*

**Report:** every switch state, especially "Allow messaging without an order";
which destinations are enabled; whether **Messages** is ticked in the patient
sidebar (Patient dashboard → Sidebar menu) and not marked HIDDEN; and the heading
and sub-line on `/messages`.

> Dashboard, Forms and Wallet cannot be turned off in the patient sidebar.
> **Messages can be** — confirm it is not.

### 8b. Labs — the pass-through has a fee inside it

Go to `/labs` (headed **Labs**, *"Manage patient lab access. Both public and
signed-in access are enabled by default."*).

**⚠ The pricing finding.** The lab editor has two money fields:

> *"**Cost** is what you get charged, shown in the editor as a breakdown like
> **'$0.00 lab + $20.00 processing'**. **Patient total** is the single price the
> patient pays. **Keep Patient total higher than Cost or every order loses you
> money.**"*

So "cost" is **not** the lab's price — it is the lab price **plus a GEN Health
per-order processing fee**, around $20 in their own example. Our pricing memo
models labs as a clean pass-through with zero margin impact. **If Patient total is
set to the lab price alone, WellPeps eats that fee on every lab order.**

**Report for every panel:** name · **Cost, with the full breakdown** · Patient
total · Active · Storefront · vendor · target audience · unavailable states.

Then state plainly: **what is the per-order processing fee**, and **is Patient
total above Cost on every panel?**

**Three things that stop labs working entirely:**

1. **Account payment method on file** — a *"Set up payment method"* banner shows
   until the card is saved and **labs cannot be enabled or sold until then**. It is
   at `/settings/overview` and is **separate from Stripe**. Report whether it is on
2. **An activated lab vendor** — if Create Lab says *"No activated labs are
   available. A Super Admin must activate a lab in Integrations,"* that is ticket
   1 or 2. Report which vendors are activated
3. **Held orders** — unpaid platform fees push lab orders to **Pending
   (Processing)** with *"N orders on hold — a $X processing fee is due."* The
   patient has paid and the lab was never ordered. Report any currently held

Also report whether **patient-uploaded results** are permitted (order reads
**Results Awaiting Review**; staff must Accept or Decline — a membership benefit
and a staffing cost), and the **Labs** checkout order, which is set separately
from Products.

> **Sandbox caveat:** sandbox mode blocks **Junction**, the lab integration. Lab
> ordering **cannot be tested end to end** while sandbox is on. Plan to test labs
> separately.

### 8c. 24/7 portal access — mostly verified

The portal is live and branded with a valid certificate. **Report only:**

- **Sidebar menu** — the full list and which rows are ticked (Dashboard, Visits,
  Messages, Prescriptions, Products, Labs, Orders, Forms, Wallet, Knowledge base,
  Support)
- **Dashboard sections** on (TODAY, ORDERS, DAILY HEALTH, WEARABLES & APPS)
- **Portal layout** (Navigation style, Border style, Layout width)

A member paying for 24/7 access should find Messages, Labs, Prescriptions and
Orders in their menu. Flag anything hidden.

---

## §9. Checkout order

`/settings/patient-experience` → the **Portal experience** card controls portal
navigation, dashboard modules, **checkout flow order** and notifications.

**Report:** the tenant-wide checkout order for **Products** and for **Labs** (set
separately), and the **Public checkout disclaimer** setting (Hidden / Text /
Checkbox).

> ⚠ A single product's Overview tab has *"When I send this product to a patient
> manually, I want them to… (Pay for the product first / Complete intake forms
> first)"*, which **silently overrides the tenant-wide order for that one
> product.** If one product behaves differently during testing, check there first.

---

## §10. Developer documentation and keys

`/settings/developers` → **Documentation** opens a new tab at
`/{client-id}/api-docs` with six tabs: V2 API, V2 Guide, V1 API, Webhooks, Hosted
Checkout, Patient Migration. No sign-in needed, so the link is shareable.

**Report:** the documentation URL and the **client ID** in it.

- **V2 Guide** → the `Client model:` line (independent confirmation)
- **V2 Guide** → the **Subscriptions** section (§6, question 5)
- **Hosted Checkout** → what it says about launching checkout and the iframe
  contract. Knowing whether
  `POST /v2/client/storefront/checkout/sessions` and the `X-Storefront-Key` header
  are available shapes whether we can embed checkout later

### WellPeps needs its own keys

This is a new tenant, so every credential is new. Report **presence and type
only**:

| Credential | Used by | Present? |
| --- | --- | --- |
| **X-API-Key** | Server-to-server. Never in browser code | |
| **X-Storefront-Key** | Browser checkout. Needs origin allow-listing | |
| **Webhook URL** | GEN Health → us | |
| **Webhook signing secret** | Verifying those calls | |

If the storefront key needs an **origin allowlist**, report which origins are
registered. `wellpeps.com` and `www.wellpeps.com` must be on it before embedded
checkout works.

---

## What is realistic for tomorrow

**Achievable:** a product test order end to end, Stripe test keys, sandbox on.

**Not achievable, and worth knowing now:**

- **Labs** — sandbox blocks Junction, so lab ordering cannot be tested end to end
- **The membership** — unless §6 finds it works as a subscription product or via
  `billingMode: invoice`. If it needs `apiOrders`, that is ticket 2 and will not
  land overnight

Tell us immediately if either turns out differently.

---

## Report back in this format

```
TICKETS
  Provider network ticket #: [...]   submitted to: [network name]
  GEN Health ticket #:       [...]

MODEL (expect Review + Prescribe)
  Processor grid present:  [expect YES — if hidden, STOP]
  /billing subtitle:       "..."
  /products loads:         [yes / 404]
  V2 Guide client model:   [...]

BUILD PROGRESS
  1  Provider network linked:      [done / not done]
  2  Account payment method:       [on file / not — BLOCKS LABS]
  3  Stripe connected:             [test keys in / not]
  4  Team users added:             [...]
  5  Branding:                     [see BRANDING below]
  6  Portal experience:            [see MESSAGING / CHECKOUT ORDER]
  7  Forms:                        [exist / none — HARD BLOCKER]
  8  Products active:              [count]
  12 Pharmacy connected:           [done / not]
  9  Formulary:                    [page exists / 404]
  10 Labs:                         [see LABS]
  11 Visits:                       [...]

STRIPE
  Active tile before:      [...]
  NMI tile active:         [yes / no]
  Missing-keys chip:       [yes / no — which]
  Stripe webhook URL:      [...]
  Test connection:         [pass / fail / not attempted]

PRODUCTS
  | Product | Active | Hidden | Price | Assessment price | Payment icon | Formulary | Unavail. states | Owner |

CHECKOUT LINKS
  Weight Loss      Product-first / Assessment-first / Intake-first: [URLs]
  Sexual Wellness  [same three]
  Peptides         [same three]
  Hostname used:   [portal.wellpeps.com / app.genhealthehr.com / other]

STOREFRONT
  URL: [...]   Branded: [yes / no]

FREE ASSESSMENT
  Per product: Price / Assessment price / included visits / sync visit / labs
  Intake-first walkthrough:     [steps; first payment screen amount + wording]
  Assessment-first walkthrough: [steps; first payment screen amount + wording]
  Is "Free Assessment" accurate?  [yes — which flow / no]

MEMBERSHIP ($49 first month -> $79 thereafter)
  INTRO RATE supported natively:  [yes — field names / no]
  Promo code, first cycle only:   [yes / no — one-time only / unclear]
  If neither, say so:             [...]
  Admin surface for plans: [route + what loads, or "none found"]
  Vault charge orders:     [on / off / disabled — helper text]
  Finite installments:     [on / off / disabled]
  Subscription product:    [fields when enabled; cadence settable?]
  Membership-as-product:   [permitted without formulary? buyable by link?]
  V2 Guide subscriptions:  [what it says; is billingMode: invoice available?]
  VERDICT:                 [testable tomorrow / blocked on API Orders / neither]

MESSAGING
  Allow patients to send messages:    [on / off]
  Allow messaging without an order:   [on / off]   <- critical
  Destinations enabled:               [...]
  Messages in patient sidebar:        [visible / HIDDEN]
  Network-side "patients can message
   providers directly":               [on / off / ticket raised]
  VERDICT: can a member reach a doctor? [yes / no — care team only]

LABS
  Account payment method on file:     [yes / no — blocks all labs]
  Activated lab vendors:              [...]
  Per-order processing fee:           [$...]
  | Panel | Cost breakdown | Patient total | Above cost? | Vendor | Active |
  Panels priced below cost:           [...]
  Orders currently held:              [yes / no]
  Patient uploads permitted:          [yes / no]

PORTAL
  Sidebar rows ticked:                [...]
  Dashboard sections on:              [...]
  Portal layout:                      [nav / border / width]
  Anything hidden a member expects:   [...]

BRANDING
  theme-color before:      [...]      Other colour fields: [...]
  Changed to:              [...]
  URL slug:                [...]
  Custom Domain badge:     [...]      Email Domain badge: [...]

CHECKOUT ORDER
  Products:                [intake first / payment first]
  Labs:                    [intake first / payment first]
  Public disclaimer:       [hidden / text / checkbox]
  Per-product overrides:   [...]

DEVELOPER
  Docs URL: [...]          Client ID: [...]
  X-API-Key present:       [yes / no]
  X-Storefront-Key:        [yes / no]   Origins registered: [...]
  Webhook URL:             [...]        Signing secret: [yes / no]
  Hosted Checkout notes:   [...]

BLOCKS A TEST ORDER TOMORROW:
  [...]

BLOCKS SELLING THE MEMBERSHIP:
  [...]

ANYTHING ON SCREEN THAT CONTRADICTS THIS DOCUMENT:
  [...]
```
