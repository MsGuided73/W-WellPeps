-- consent_events
--
-- PURPOSE
--   The record of what a visitor chose in the "Your Privacy Choices" control and
--   which version of the notice they saw: accept, reject, custom choice,
--   withdrawal, an automatic Global Privacy Control opt-out, and the re-prompts
--   after a choice expires or the notice changes. Written only by the
--   `consent-log` edge function; it lets WellPeps show later what a visitor was
--   told and what they chose.
--
-- DELIBERATELY NOT STORED
--   No IP address. No full user-agent string (only a coarse browser family chosen
--   by the browser itself). No page path, no query string (only a coarse page
--   class: 'health' or 'other', so a consent id is never tied to a health-topic
--   page). No email address, no name. `consent_id` is a random value created in
--   the visitor's browser; it is not linked to any account.
--
-- RETENTION
--   `retain_until` defaults to 5 years after the event (a working default so the
--   record can answer a complaint or inquiry; COUNSEL/OWNER TO CONFIRM the period).
--   Rows past `retain_until` are removed by public.purge_expired_consent_events().
--   Schedule it (see the pg_cron example at the bottom) or run it by hand.
--
-- ACCESS
--   Row Level Security is ON and there are NO policies, so no browser or API key
--   can read or write this table. Only the service role (used by the edge
--   function, and by staff in the Supabase dashboard) can.

create table if not exists public.consent_events (
  id                   bigint generated always as identity primary key,
  -- Created in the browser per event; makes a retried send idempotent.
  event_id             text        not null,
  consent_id           text        not null,
  -- The browser's clock, replaced by the server time when implausible (see clock_suspect).
  occurred_at          timestamptz not null,
  received_at          timestamptz not null default now(),
  clock_suspect        boolean     not null default false,
  action               text        not null,
  analytics            boolean     not null,
  analytics_sensitive  boolean     not null,
  advertising          boolean     not null,
  gpc_detected         boolean     not null,
  notice_version       text        not null,
  banner_version       text        not null,
  page_class           text        not null,
  browser_family       text        not null,
  retain_until         timestamptz not null default (now() + interval '5 years'),

  constraint consent_events_event_id_key unique (event_id),
  constraint consent_events_event_id_shape check (
    event_id ~* '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32})$'
  ),
  -- Same shape the browser's cookie parser accepts (letters, digits, hyphen; up to 64).
  constraint consent_events_consent_id_shape check (consent_id ~ '^[A-Za-z0-9-]{1,64}$'),
  constraint consent_events_action_known check (action in (
    'accept_all', 'reject_all', 'custom', 'withdraw', 'gpc_auto_optout',
    'gpc_conflict_allow', 'gpc_conflict_keep_off',
    'reprompt_after_expiry', 'reprompt_after_version_change'
  )),
  constraint consent_events_versions_shape check (
    notice_version ~ '^[A-Za-z0-9._-]{1,40}$' and banner_version ~ '^[A-Za-z0-9._-]{1,40}$'
  ),
  constraint consent_events_page_class_known check (page_class in ('health', 'other')),
  constraint consent_events_browser_family_known check (browser_family in ('Chrome', 'Edge', 'Firefox', 'Safari', 'Other')),
  constraint consent_events_health_needs_analytics check (not analytics_sensitive or analytics)
);

comment on table public.consent_events is
  'Consent choices and the notice version shown (written only by the consent-log edge function). Stores no IP address, no full user agent, no page path, no email. Retained until retain_until (default 5 years, owner/counsel to confirm).';
comment on column public.consent_events.consent_id is 'Random id made in the visitor''s browser. Not linked to an account, email or device.';
comment on column public.consent_events.page_class is 'Coarse class only (health or other); never the page path.';
comment on column public.consent_events.browser_family is 'Coarse family chosen by the browser (Chrome, Edge, Firefox, Safari, Other); the full user agent is never sent or stored.';
comment on column public.consent_events.clock_suspect is 'True when the browser clock was implausible and occurred_at was replaced by the server time.';

create index if not exists consent_events_consent_id_idx on public.consent_events (consent_id, occurred_at);
create index if not exists consent_events_retain_until_idx on public.consent_events (retain_until);

alter table public.consent_events enable row level security;
-- No policies on purpose. Also take away the default table privileges, so the
-- table is unreachable even if a policy were added by mistake.
revoke all on table public.consent_events from anon, authenticated;

create or replace function public.purge_expired_consent_events()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed bigint;
begin
  delete from public.consent_events where retain_until < now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.purge_expired_consent_events() from public, anon, authenticated;

-- Optional daily purge. pg_cron must be enabled first (Dashboard > Database > Extensions),
-- then run once in the SQL editor (left commented so this migration changes nothing else):
--   select cron.schedule('purge-consent-events', '17 3 * * *', $$select public.purge_expired_consent_events()$$);
