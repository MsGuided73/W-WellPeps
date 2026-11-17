-- The Men's and Women's Hormone Therapy Smart Patient Guides get their own sign-up sources (2026-11-10).
-- NOT YET APPLIED. Apply together with the notify-signup function that lists the same sources (validate.ts),
-- before the site version that offers these two guides goes live; until then their forms fail with invalid_source.
alter table public.notify_signups drop constraint notify_signups_source_check;
alter table public.notify_signups add constraint notify_signups_source_check check (source = any (array[
  'hair_notify', 'waitlist', 'footer_newsletter',
  'ebook_glp1', 'ebook_sexual_wellness', 'ebook_hair_restoration', 'ebook_healthy_aging', 'ebook_nad',
  'ebook_modern_healthcare', 'ebook_mens_hormone', 'ebook_womens_hormone'
]));
