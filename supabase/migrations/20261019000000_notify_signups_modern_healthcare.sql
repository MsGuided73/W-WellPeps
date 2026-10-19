-- The Modern Healthcare Smart Patient Guide gets its own sign-up form (2026-10-19).
alter table public.notify_signups drop constraint notify_signups_source_check;
alter table public.notify_signups add constraint notify_signups_source_check check (source = any (array[
  'hair_notify', 'waitlist', 'footer_newsletter',
  'ebook_glp1', 'ebook_sexual_wellness', 'ebook_hair_restoration', 'ebook_healthy_aging', 'ebook_nad',
  'ebook_modern_healthcare'
]));
