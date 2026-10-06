-- consent_events: two choices added on 2026-10-05
--
--   advertising_sensitive  the separate, explicit consent to advertising on pages
--                          about health topics (never given by "Accept all").
--   anonymous_opt_out      the visitor turned off WellPeps' anonymous usage
--                          statistics, which run by default.
--
-- Both default to false so rows written before this change stay valid.

alter table public.consent_events
  add column if not exists advertising_sensitive boolean not null default false,
  add column if not exists anonymous_opt_out     boolean not null default false;

alter table public.consent_events
  drop constraint if exists consent_events_health_ads_needs_advertising;
alter table public.consent_events
  add constraint consent_events_health_ads_needs_advertising check (not advertising_sensitive or advertising);

comment on column public.consent_events.advertising_sensitive is 'Separate consent to advertising on health-topic pages. Only possible while advertising is on.';
comment on column public.consent_events.anonymous_opt_out is 'True when the visitor turned off the anonymous usage statistics (on by default).';
