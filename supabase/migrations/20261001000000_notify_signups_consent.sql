-- notify_signups: record the consent given on a health-topic signup form.
--
-- NOT APPLIED. Run by the owner before deploying the updated notify-signup function
-- (supabase/functions/notify-signup). Safe to run on the live table: every column is nullable
-- and has no default, so existing rows read as "consent not recorded" (they were collected
-- before the consent boxes existed) and the live function keeps working unchanged.
--
-- Why: Washington (RCW 19.373) and Nevada (NRS 603A) treat an email address tied to a health
-- topic as consumer health data. Consent to collect it, and any consent to send marketing, must
-- be separate and provable. These columns hold what the person ticked, the wording version they
-- saw (wellpeps-site/src/lib/form-consent.ts, FORM_CONSENT_VERSION) and when.
--
-- Deliberately not stored: the IP address or any browser identifier. Row Level Security stays on
-- with no policies, so only the edge function (service role) can read or write this table.

alter table public.notify_signups
  add column if not exists consent_collect      boolean,
  add column if not exists consent_marketing    boolean,
  add column if not exists consent_text_version text,
  add column if not exists consented_at         timestamptz;

comment on column public.notify_signups.consent_collect is
  'The person ticked the required box: collect and keep email, first name and health topic to send what they asked for. NULL = collected before the box existed.';
comment on column public.notify_signups.consent_marketing is
  'The person also ticked the optional box for follow-up emails about the topic. Only true when consent_collect is true.';
comment on column public.notify_signups.consent_text_version is
  'Which consent wording was shown (FORM_CONSENT_VERSION on the site). A "draft" version means counsel had not yet approved the text.';
comment on column public.notify_signups.consented_at is
  'When the consent was given (server time).';
