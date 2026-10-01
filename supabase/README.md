# WellPeps Supabase functions and tables

> **Nothing here has been deployed.** The three edge functions and their three
> migrations are written and tested (the pure logic, from `wellpeps-site`), but
> no function has been deployed, no migration has been run, and no Supabase
> project has been touched. The site's switches in
> `wellpeps-site/src/lib/privacy/config.ts` stay **off** until you have done the
> steps below. Every command in this file is for **you (the owner)** to run.

Project: `kwgwbupqzpusydzflyvi` (the host in the function URLs; it is public).
Function base URL: `https://kwgwbupqzpusydzflyvi.supabase.co/functions/v1`.

## What is here

| Path | What it is |
|---|---|
| `functions/consent-log/` | Records the consent choices the "Your Privacy Choices" control sends. |
| `functions/privacy-request/` | Receives the privacy request form and logs it as the record of the request. |
| `functions/analytics-event/` | Receives anonymous page-view, click and page-leave events (see `wellpeps-site/src/lib/analytics/README.md`). |
| `functions/_shared/` | The pure logic all three share: validation, due dates, CORS, size cap, rate limit. No Deno-only imports, so `npm test` in `wellpeps-site` runs it. |
| `migrations/` | One migration per table: `consent_events`, `privacy_requests`, `analytics_events`. |
| `analytics/example-views.sql` | Example reporting views over `analytics_events` (not a migration). |
| `config.toml` | Minimal CLI config: JWT checks off for the three public functions. |

The existing `notify-signup` function and `notify_signups` table were created
earlier and are **not** in this folder.

## What each function does

All three: `POST` and `OPTIONS` only; the browser's `Origin` must be in
`ALLOWED_ORIGINS` (a missing or other origin gets 403); body over 8 KB gets 413;
every field is checked for type, length, shape and allowed value and an unknown
field is refused (400); a per-source rate limit answers 429; errors are one of a
few generic words, never the reason; request bodies are never logged. The tables
have Row Level Security on and **no policies**, and the browser roles have all
privileges revoked, so nothing in a browser can read or write them. The function
uses the service-role key that Supabase injects.

### `consent-log`
Receives `ConsentLogEvent` (`wellpeps-site/src/lib/privacy/log.ts`) and inserts
a row in `consent_events`. Idempotent on `event_id`: a retry is ignored. Stores
the random consent id, the choice, the notice and banner version, the coarse
page class (`health` or `other`) and coarse browser family, plus the server's
receive time. **Not stored:** IP address, full user agent, page path, email. If
the browser's clock is more than 31 days behind or 1 day ahead, the server time
is used and the row is flagged `clock_suspect` (the event is still recorded).

### `privacy-request`
Receives the form payload (`wellpeps-site/src/lib/privacy/request.ts`) and
inserts a row in `privacy_requests`, answering `{ "ok": true, "request_no": "PR-261001-9F3A1C" }`.
It computes, from the **server's** receive time: `ack_due_at` (10 business days),
`act_by_due_at` (15 business days, opt-out style requests only), `due_at`
(45 calendar days, the legal response deadline) and `retain_until` (24 months,
the California record-keeping period). A filled honeypot (`honeypot` or
`homepage_url`) is accepted silently (200) and **not stored**.
**It sends nothing by email.** The form tells people "We will confirm it by email
within 10 business days", so someone must watch the table and send that
confirmation (see the checklist). An optional webhook can ping a channel (no
personal data in it) if you set `PRIVACY_REQUEST_NOTIFY_WEBHOOK_URL`; it is off
unless set. An hourly circuit breaker (default 60 requests an hour across all
visitors) answers 503 so the form shows the email fallback instead of letting a
flood fill the record.

### `analytics-event`
Receives a batch (`{"v":1,"events":[...]}`, up to 20 events) of anonymous
events and inserts one row each in `analytics_events`. Stores only the sanitized
page path (no query), page template, viewport class, referrer class, a
`data-track` label, scroll and time buckets, and the **hour** the event arrived.
No identifier of any kind, and it does not store the IP address or user agent
(see "Design decisions" below for what the hosting platform's own logs may keep).

## Secrets and environment

| Name | Needed by | Set how |
|---|---|---|
| `ALLOWED_ORIGINS` | all three | `supabase secrets set ALLOWED_ORIGINS="https://wellpeps.com"`. Comma separated, exact origins (`scheme://host[:port]`), no paths, no `*`. Empty or unset = every browser request is refused. Add the client preview origin (the Coolify preview URL) if you want it to log, and `http://localhost:4321` only while testing locally. |
| `PRIVACY_REQUEST_NOTIFY_WEBHOOK_URL` | privacy-request (optional) | An `https` URL. Unset = no notification. The body holds the request number, dates and request types, never a name, email or details. |
| `PRIVACY_REQUEST_HOURLY_CAP` | privacy-request (optional) | Default 60. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | all three | Injected by Supabase. Do not set them and never put the service-role key in a file, the repo or the site. |

## Deploy (you run these; I have not)

You need the Supabase CLI and to be logged in (`supabase login`). Run from the
repository root (the folder that contains `supabase/`).

```bash
supabase link --project-ref kwgwbupqzpusydzflyvi

# 1. Secrets
supabase secrets set ALLOWED_ORIGINS="https://wellpeps.com"

# 2. Tables (see the note below if this complains about migration history)
supabase db push

# 3. Functions. --no-verify-jwt: visitors have no Supabase session.
supabase functions deploy consent-log      --no-verify-jwt
supabase functions deploy privacy-request  --no-verify-jwt
supabase functions deploy analytics-event  --no-verify-jwt
```

**If `supabase db push` refuses** with a message about remote migrations missing
locally: the project already has tables made earlier (for example
`notify_signups`) without migration files here. Either run `supabase db pull`
first to record the existing schema as a baseline and then `supabase db push`, or
skip the CLI and paste each file from `migrations/` into the Dashboard SQL editor
in order (they are written to be safe to run once). Do not use `--include-all`
without reading what it will apply.

**Optional daily purge.** Each migration ends with a commented `cron.schedule`
line. Enable `pg_cron` (Dashboard, Database, Extensions) and run those lines in
the SQL editor, or run `select public.purge_expired_consent_events();` (and the
`privacy_requests` and `analytics_events` equivalents) by hand now and then.

## Post-deploy checklist

Set `FN=https://kwgwbupqzpusydzflyvi.supabase.co/functions/v1` first. Every test
row below is yours to delete afterwards (SQL given).

1. **Refusals work.** Each should return the status shown and store nothing:
   - `curl -i -X GET $FN/consent-log -H "Origin: https://wellpeps.com"` returns 405
   - `curl -i -X POST $FN/consent-log -H "Origin: https://evil.example" -d '{}'` returns 403
   - `curl -i -X POST $FN/consent-log -d '{}'` (no Origin) returns 403
   - `curl -i -X POST $FN/consent-log -H "Origin: https://wellpeps.com" -d 'not json'` returns 400
   - `head -c 9000 /dev/zero | tr '\0' a | curl -i -X POST $FN/consent-log -H "Origin: https://wellpeps.com" --data-binary @-` returns 413
   - Pre-flight: `curl -i -X OPTIONS $FN/privacy-request -H "Origin: https://wellpeps.com" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type"` returns 204 with `access-control-allow-origin: https://wellpeps.com`
2. **consent-log.** Use the current time in `occurred_at`:
   ```bash
   curl -i -X POST $FN/consent-log -H "Origin: https://wellpeps.com" -H "Content-Type: text/plain;charset=UTF-8" \
     --data '{"event_id":"11111111-1111-4111-8111-111111111111","consent_id":"22222222-2222-4222-8222-222222222222","occurred_at":"2026-10-01T12:00:00.000Z","action":"reject_all","analytics":false,"analytics_sensitive":false,"advertising":false,"gpc_detected":false,"notice_version":"2026-10-01.1","banner_version":"1","page_class":"other","user_agent":"Chrome"}'
   ```
   Expect `200 {"ok":true}`. Send it twice: still 200 and still **one** row.
   Add `,"ip_address":"1.2.3.4"` to the JSON: expect 400. Clean up:
   `delete from consent_events where consent_id = '22222222-2222-4222-8222-222222222222';`
3. **privacy-request.**
   ```bash
   curl -i -X POST $FN/privacy-request -H "Origin: https://wellpeps.com" -H "Content-Type: application/json" \
     --data '{"fullName":"Test Person","email":"test@example.com","state":"CA","types":["opt_out","access"],"details":"deploy test","agent":null,"honeypot":"","submitted_at":"2026-10-01T12:00:00.000Z"}'
   ```
   Expect `200` with a `request_no`. In the SQL editor confirm one row with
   `due_at` 45 days after `received_at`, `ack_due_at` 10 business days after,
   and `retain_until` 24 months after. With `"honeypot":"x"` expect 200 and **no**
   new row. Clean up: `delete from privacy_requests where full_name = 'Test Person';`
4. **analytics-event.**
   ```bash
   curl -i -X POST $FN/analytics-event -H "Origin: https://wellpeps.com" -H "Content-Type: text/plain;charset=UTF-8" \
     --data '{"v":1,"events":[{"event_type":"page_view","page_path":"/_deploy-check","page_template":"other","viewport_class":"desktop","referrer_class":"direct"}]}'
   ```
   Expect `200`; one row in `analytics_events` whose `event_hour` is the top of
   the hour. Add `"visitor_id":"x"` inside the event: expect 400. The test row uses
   the marker path `/_deploy-check`, so cleaning up cannot touch real data:
   `delete from analytics_events where page_path = '/_deploy-check';`
5. **Check the tables are closed.** With the project's *anon* key, from a
   terminal: `curl "https://kwgwbupqzpusydzflyvi.supabase.co/rest/v1/consent_events?select=*" -H "apikey: <anon key>"`
   (and `privacy_requests`, `analytics_events`) must return an error or an empty
   list, never rows.
6. **Check the rate limit sees you as one source.** The limit picks its bucket
   from the `cf-connecting-ip` header that Supabase's edge adds. Send the same
   valid `privacy-request` call 6 times in a row (the limit is 5 an hour; delete
   the test rows afterwards): the 6th must return `429` with a `retry-after`
   header. Then send one more from a different network (a phone on mobile data):
   it must succeed. If the 6th is accepted, or the other network is refused too,
   the header is not arriving as expected: tell the developer, because every
   visitor would then share one bucket. (The counter is per function instance, so
   a single instance answering all six is the normal case but not guaranteed.)
7. **Flip the matching switch** in `wellpeps-site/src/lib/privacy/config.ts`, one
   function at a time, and redeploy the site:
   - `consent-log` passes: set `CONSENT_LOG_ENABLED = true`.
   - `privacy-request` passes: set `PRIVACY_REQUEST_ENDPOINT` to `${FUNCTIONS}/privacy-request`.
   - `analytics-event` passes: set `ANALYTICS_ENDPOINT` to `${FUNCTIONS}/analytics-event`.
     The analytics tool is still off after this; it has its own switch and
     conditions (counsel approval, Cookie notice update). See
     `wellpeps-site/src/lib/analytics/README.md`.
8. **Decide who watches `privacy_requests`.** Nothing is e-mailed. Someone must
   check `select request_no, received_at, ack_due_at, due_at, status from privacy_requests where status in ('received','acknowledged','in_progress') order by due_at;`
   every business day and send the confirmation the form promises. Or set the
   webhook secret so a channel is pinged (a dead webhook writes
   `[privacy-request] notify failed` to the function logs, so look there if the
   pings stop). If staff export the table to a spreadsheet, escape any cell that
   starts with `=`, `+`, `-` or `@` (names and emails starting that way are
   already refused, but the free-text details are not).
9. **Browser test:** submit the real form on the deployed site, change a switch
   in the privacy panel, and confirm the rows appear.

## Design decisions to confirm

- **IP addresses.** The functions read the source address only to choose a
  rate-limit bucket; it is hashed with a random salt that lives in memory and is
  replaced every UTC day, kept only in memory, and never stored, logged or
  returned. No table has an address column. Supabase's own platform logs
  (API gateway and function logs) can still record each request's IP address and
  user agent for their own retention period, whatever these functions store.
  "We do not store your IP address" is true of the WellPeps tables, not of the
  hosting provider, so check the retention in the project's log settings and word
  the Privacy Policy and the Cookie notice accordingly.
- **Rate limiting is best effort.** Counters are per function instance, in
  memory. Instances are many and short-lived, so a distributed flood is not
  stopped by this code. An IPv6 address counts as its whole /64 network, and when
  the table of sources fills up the oldest counters are evicted. The real
  backstops are the size cap, strict validation, the privacy-request hourly
  circuit breaker and Supabase project limits; add a CDN or WAF rule (or a
  bot-check such as Cloudflare Turnstile) in front of the functions if abuse
  appears. Offices and mobile carriers share addresses, so limits are generous
  for analytics (300 per ten minutes) and consent (30), and tight for privacy
  requests (5 per hour).
- **Consent log retention** is set to 5 years as a working default; counsel to
  confirm. Privacy requests are kept 24 months and then purged once closed.
  Analytics is kept 13 months.
- **`act_by_due_at`** (15 business days for opt-outs) is stored as well as the
  45-day `due_at` you specified, because `request.ts` already computes it and
  it is the stricter deadline for opt-out requests.
- **A missing `Origin` header is refused**, not only a wrong one. Real browsers
  always send it on these requests; command-line tests must add it, as above.
- **Request numbers** are `PR-<yymmdd>-<6 random hex>`, not a counter, so they do
  not reveal how many requests exist.
- **Anyone can post fake events** to the public endpoints (that is true of any
  browser-facing endpoint; the Origin check stops browsers on other sites but a
  script can send any header). Treat analytics as indicative; the consent log and
  request log are protected by validation, the origin check and the limits above.
- **No global write cap on `consent-log` and `analytics-event`.** Only
  `privacy-request` has a database-level circuit breaker. A distributed flood of
  small rows could eventually fill the project's disk (and Supabase makes a
  project read-only at its disk quota, which would also stop `notify-signup`).
  Set a disk-usage alert in the Dashboard and add a WAF rule if abuse shows up.
- **The `privacy-request` breaker can be tripped on purpose.** 60 fake requests in
  an hour make real visitors see the email fallback (and each stored fake starts a
  legal clock). The fallback keeps the right to make a request available; a
  bot-check on the form is the proper fix if it happens.
- **A database administrator can see approximate arrival order.** `analytics_events`
  has no column that orders or links events, but Postgres's internal row metadata
  (heap order, ctid, xmin) does show roughly the order rows arrived, and the events
  of one page view arrive in one request and one transaction. At very low traffic,
  adjacent rows may well be one visit. The analytics tool is therefore anonymous
  in the data model and in everything exposed to the browser and reports, not
  against someone with database-administrator access who studies row internals.
  Keep `track_commit_timestamp` off, and do not add an auto-increment id or a
  precise timestamp to the table.
- **Consent ids** are accepted in the same shape the browser's cookie parser
  accepts (letters, digits, hyphen, up to 64), not only UUIDs, so a tampered or
  older cookie still gets its choice logged.
- **Names and emails that start with `=`, `+`, `-` or `@` are refused** by
  `privacy-request` (spreadsheet formula injection when staff export). The
  browser form does not check this, so such a person is shown the email fallback.
- **Dependencies are pinned**: `npm:@supabase/supabase-js@2.110.7` (the version the
  site uses) and `jsr:@supabase/functions-js@2` for types. Deno is not installed
  on the build machine this was written on, so no `deno.lock` is committed; after
  your first deploy run `deno cache --lock=deno.lock --lock-write supabase/functions/*/index.ts`
  (or let `supabase functions deploy` write it) and commit the lock file.

## Keeping the browser and the functions in step

The site cannot import this folder (its Docker build context is `wellpeps-site/`
only), so the contract is written twice and `npm test` in `wellpeps-site` fails
if the copies drift:

- `src/lib/edge/consent-event.test.ts` drives the real consent gate and checks
  every event it logs is accepted by `consent-log`.
- `src/lib/edge/privacy-request.test.ts` runs the form's validator and due-date
  code against the function's.
- `src/lib/analytics/contract.test.ts` does the same for analytics.
- `src/lib/edge/migrations.test.ts` checks Row Level Security is on, no policy
  exists and no address or identifier column exists, and reads every CHECK
  constraint (action lists, page templates, id and path patterns, limits) out of
  the SQL and compares it with the TypeScript, so the SQL cannot silently fall
  behind the code.

**Not tested** (needs a real Supabase project): the Deno wiring in each
`index.ts`, the supabase-js calls, the SQL itself running, `verify_jwt = false`
taking effect, CORS as a browser sees it, and `pg_cron`. The post-deploy
checklist above covers exactly those.
