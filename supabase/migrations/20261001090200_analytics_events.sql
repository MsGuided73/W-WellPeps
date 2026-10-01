-- analytics_events
--
-- PURPOSE
--   Anonymous, opt-in site analytics: which pages are viewed, which labelled
--   buttons and links are clicked, and how far visitors scroll before they leave.
--   Written only by the `analytics-event` edge function, and only for visitors who
--   turned analytics on in "Your Privacy Choices". Each row is one event that
--   stands alone.
--
-- DELIBERATELY NOT STORED
--   No visitor, session or device identifier of any kind (not even a random one),
--   so one visitor's events cannot be linked to each other. No IP address, no
--   user agent, no URL query string or hash, no referrer URL (only a class:
--   internal / search / social / direct / other), no element text, no form values.
--   The time is kept only to the hour. The primary key is a random UUID, not an
--   incrementing number, so no COLUMN orders or links events. Do NOT add an
--   auto-increment id, a precise timestamp, or any identifying column: that would
--   undo the anonymity this design depends on.
--   One honest limit: a database administrator can read Postgres's internal row
--   metadata (heap order, ctid, xmin), which shows approximate arrival order, and
--   the events of ONE page view (its view, clicks and leave) arrive in one request
--   and one transaction. At very low traffic, adjacent rows may be one visit. Keep
--   track_commit_timestamp off. No column, and nothing in the data model, links
--   different page views.
--
-- RETENTION
--   13 months: `retain_until` is set to the event hour + 13 months, which keeps one
--   full year for year-over-year comparison. Rows past `retain_until` are removed
--   by public.purge_expired_analytics_events(). Schedule it (pg_cron example at the
--   bottom) or run it by hand.
--
-- ACCESS
--   Row Level Security is ON and there are NO policies, so no browser or API key
--   can read or write this table. Only the service role (the edge function, and
--   staff in the Supabase dashboard) can. Reporting views live in a separate,
--   non-API schema: see supabase/analytics/example-views.sql.

create table if not exists public.analytics_events (
  id              uuid        primary key default gen_random_uuid(),
  -- The hour the event arrived (UTC), never finer.
  event_hour      timestamptz not null default (date_trunc('hour', now() at time zone 'utc') at time zone 'utc'),
  event_type      text        not null,
  page_path       text        not null,
  page_template   text        not null,
  viewport_class  text        not null,
  -- page_view only
  referrer_class  text,
  from_template   text,
  -- click only: a label from a data-track attribute, never element text
  click_target    text,
  -- page_leave only
  max_scroll      smallint,
  time_bucket     text,
  retain_until    timestamptz not null default (
    (date_trunc('hour', now() at time zone 'utc') at time zone 'utc') + interval '13 months'
  ),

  constraint analytics_events_type_known check (event_type in ('page_view', 'click', 'page_leave')),
  -- Neither a path nor a label may hold six or more digits, even split by single - _ or / (a phone number, birth date or id).
  constraint analytics_events_path_shape check (
    char_length(page_path) <= 120 and page_path ~ '^/$|^/[a-z0-9_-]+(/[a-z0-9_-]+){0,3}$' and page_path !~ '([0-9][-_/]?){6,}'
  ),
  constraint analytics_events_template_known check (page_template in (
    'home', 'program', 'learning_center_index', 'learning_center_article',
    'legal', 'privacy_choices', 'plan', 'about', 'other'
  )),
  constraint analytics_events_viewport_known check (viewport_class in ('mobile', 'tablet', 'desktop')),
  constraint analytics_events_referrer_known check (
    referrer_class is null or referrer_class in ('internal', 'search', 'social', 'direct', 'other')
  ),
  constraint analytics_events_from_template_known check (
    from_template is null or from_template in (
      'home', 'program', 'learning_center_index', 'learning_center_article',
      'legal', 'privacy_choices', 'plan', 'about', 'other'
    )
  ),
  constraint analytics_events_from_needs_internal check (from_template is null or referrer_class = 'internal'),
  constraint analytics_events_target_shape check (
    click_target is null or (click_target ~ '^[a-z0-9][a-z0-9_-]{0,39}$' and click_target !~ '([0-9][-_/]?){6,}')
  ),
  constraint analytics_events_scroll_known check (max_scroll is null or max_scroll in (0, 25, 50, 75, 100)),
  constraint analytics_events_time_known check (time_bucket is null or time_bucket in ('0-10s', '10-30s', '30-60s', '1-3m', '3m+')),
  -- Each event type carries exactly its own fields.
  constraint analytics_events_shape check (
    (event_type = 'page_view'  and referrer_class is not null and click_target is null and max_scroll is null and time_bucket is null)
    or (event_type = 'click'   and click_target is not null and referrer_class is null and from_template is null and max_scroll is null and time_bucket is null)
    or (event_type = 'page_leave' and max_scroll is not null and time_bucket is not null and referrer_class is null and from_template is null and click_target is null)
  )
);

comment on table public.analytics_events is
  'Anonymous opt-in analytics events (written only by the analytics-event edge function). No visitor/session/device identifier, no IP address, no user agent, no query string, no element text. Time kept to the hour. Retained 13 months (retain_until).';
comment on column public.analytics_events.event_hour is 'The UTC hour the event arrived; deliberately not a precise timestamp.';
comment on column public.analytics_events.click_target is 'A label from an allow-listed data-track attribute (for example cta-assessment); never element text or a URL.';
comment on column public.analytics_events.from_template is 'Page template of the previous page on this site (page_view with an internal referrer). Aggregate-only transition data; no identifier links it to a visitor.';

create index if not exists analytics_events_hour_idx on public.analytics_events (event_hour);
create index if not exists analytics_events_type_template_idx on public.analytics_events (event_type, page_template);
create index if not exists analytics_events_retain_until_idx on public.analytics_events (retain_until);

alter table public.analytics_events enable row level security;
-- No policies on purpose. Also take away the default table privileges.
revoke all on table public.analytics_events from anon, authenticated;

create or replace function public.purge_expired_analytics_events()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed bigint;
begin
  delete from public.analytics_events where retain_until < now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.purge_expired_analytics_events() from public, anon, authenticated;

-- Optional daily purge. pg_cron must be enabled first (Dashboard > Database > Extensions),
-- then run once in the SQL editor (left commented so this migration changes nothing else):
--   select cron.schedule('purge-analytics-events', '37 3 * * *', $$select public.purge_expired_analytics_events()$$);
