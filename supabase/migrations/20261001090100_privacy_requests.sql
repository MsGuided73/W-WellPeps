-- privacy_requests
--
-- PURPOSE
--   The log of record for privacy requests made through the website form: opt out
--   of sale/sharing, limit sensitive information, withdraw consent, unsubscribe,
--   access, correct, delete, copy, appeal. Written only by the `privacy-request`
--   edge function. Nothing is e-mailed automatically: staff must watch this table
--   and acknowledge each request by `ack_due_at`.
--
-- DEADLINES (computed by the function from the received time; working defaults,
-- counsel confirms each period by state)
--   ack_due_at     received + 10 business days (confirm receipt)
--   act_by_due_at  received + 15 business days, only for opt-out style requests
--   due_at         received + 45 calendar days (the legal response deadline; a
--                  one-time extension of up to 45 more days needs notice to the person)
--
-- PERSONAL DATA HELD
--   Name, email, optional two-letter state, free-text details (the form tells
--   people not to include health details), and the authorized agent's name and
--   email when an agent is acting. DELIBERATELY NOT STORED: IP address, user
--   agent, browser or device details, page path, the browser's own timestamp.
--
-- RETENTION
--   `retain_until` = received + 24 months (California requires request records to
--   be kept for 24 months). public.purge_expired_privacy_requests() deletes
--   CLOSED requests (completed, denied, withdrawn) past that date; an open
--   request is never purged. Schedule it (pg_cron example at the bottom) or run
--   it by hand.
--
-- ACCESS
--   Row Level Security is ON and there are NO policies, so no browser or API key
--   can read or write this table. Only the service role (the edge function, and
--   staff in the Supabase dashboard) can.

create table if not exists public.privacy_requests (
  id                     bigint generated always as identity primary key,
  -- Shown to the visitor, e.g. PR-261001-9F3A1C. Date plus a random suffix, so request
  -- numbers do not reveal how many requests exist.
  request_no             text        not null default (
    'PR-' || to_char(now() at time zone 'utc', 'YYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  ),
  received_at            timestamptz not null default now(),
  status                 text        not null default 'received',
  full_name              text        not null,
  email                  text        not null,
  state                  text,
  request_types          text[]      not null,
  details                text,
  agent_name             text,
  agent_email            text,
  agent_proof_confirmed  boolean     not null default false,
  ack_due_at             timestamptz not null,
  act_by_due_at          timestamptz,
  due_at                 timestamptz not null,
  -- Filled in by staff.
  acknowledged_at        timestamptz,
  closed_at              timestamptz,
  staff_notes            text,
  retain_until           timestamptz not null default (now() + interval '24 months'),

  constraint privacy_requests_request_no_key unique (request_no),
  constraint privacy_requests_request_no_shape check (request_no ~ '^PR-[0-9]{6}-[0-9A-F]{6}$'),
  constraint privacy_requests_status_known check (status in (
    'received', 'acknowledged', 'in_progress', 'completed', 'denied', 'withdrawn'
  )),
  constraint privacy_requests_name_length check (char_length(full_name) between 1 and 200),
  -- The checks on personal text are deliberately LOOSER than the function's validation. A failed
  -- CHECK makes Postgres write the whole failing row (name, email, details) to its server log, so
  -- the function must always refuse a bad value first; these only guard against a bypass.
  constraint privacy_requests_email_shape check (char_length(email) between 3 and 254 and position('@' in email) > 1),
  constraint privacy_requests_state_shape check (state is null or state ~ '^[A-Z]{2}$'),
  constraint privacy_requests_types_known check (
    cardinality(request_types) between 1 and 9
    and request_types <@ array[
      'opt_out', 'limit_sensitive', 'withdraw_consent', 'unsubscribe_email',
      'access', 'correct', 'delete', 'copy', 'appeal'
    ]::text[]
  ),
  constraint privacy_requests_details_length check (details is null or char_length(details) <= 2000),
  constraint privacy_requests_agent_complete check (
    (agent_name is null and agent_email is null and not agent_proof_confirmed)
    or (agent_name is not null and agent_email is not null and agent_proof_confirmed)
  ),
  constraint privacy_requests_agent_length check (
    (agent_name is null or char_length(agent_name) between 1 and 200)
    and (agent_email is null or char_length(agent_email) <= 254)
  ),
  constraint privacy_requests_deadlines_ordered check (due_at >= received_at and ack_due_at >= received_at),
  constraint privacy_requests_retention_after_receipt check (retain_until > received_at)
);

comment on table public.privacy_requests is
  'Privacy requests from the website form (written only by the privacy-request edge function); the log of record. Holds name, email, optional state, details, optional agent. Stores no IP address or user agent. Closed rows are purged after retain_until (24 months).';
comment on column public.privacy_requests.due_at is 'Legal response deadline: received + 45 calendar days.';
comment on column public.privacy_requests.ack_due_at is 'Confirm receipt by this time: received + 10 business days.';
comment on column public.privacy_requests.act_by_due_at is 'Opt-out style requests only: received + 15 business days.';
comment on column public.privacy_requests.retain_until is 'Keep the record until this time: received + 24 months (California record-keeping rule).';

-- The working queue: open requests, soonest deadline first.
create index if not exists privacy_requests_queue_idx on public.privacy_requests (status, due_at);
create index if not exists privacy_requests_email_idx on public.privacy_requests (email);
create index if not exists privacy_requests_received_idx on public.privacy_requests (received_at);

alter table public.privacy_requests enable row level security;
-- No policies on purpose. Also take away the default table privileges.
revoke all on table public.privacy_requests from anon, authenticated;

create or replace function public.purge_expired_privacy_requests()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed bigint;
begin
  delete from public.privacy_requests
   where retain_until < now()
     and status in ('completed', 'denied', 'withdrawn');
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.purge_expired_privacy_requests() from public, anon, authenticated;

-- Optional daily purge. pg_cron must be enabled first (Dashboard > Database > Extensions),
-- then run once in the SQL editor (left commented so this migration changes nothing else):
--   select cron.schedule('purge-privacy-requests', '27 3 * * *', $$select public.purge_expired_privacy_requests()$$);
