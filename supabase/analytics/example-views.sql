-- Example reporting views over public.analytics_events.
--
-- NOT a migration: nothing runs this automatically, and it has NOT been run
-- against any database. Paste it into the Supabase SQL editor when you want the
-- views (it is safe to run more than once), then read them from the SQL editor or
-- the Table editor. They are for people with dashboard access.
--
-- WHERE THEY LIVE. The views are created in a separate schema, `reporting`, that
-- the Supabase Data API does not expose, and every privilege on it is revoked
-- from the browser roles. Each view is `security_invoker`, so even a role that
-- could see the view would still be refused by the table's Row Level Security.
-- Do not move them into `public` and do not grant anything on them to anon or
-- authenticated: that would publish your numbers.
--
-- WHAT THE NUMBERS ARE. Counts of single events. Every event stands alone (there
-- is no visitor or session id), so these are PAGE VIEWS and CLICKS, not people,
-- and nothing joins a click to the view before it. See
-- wellpeps-site/src/lib/analytics/model.ts for what can and cannot be inferred.
-- Each view looks at the last 30 days; change the interval to suit.

create schema if not exists reporting;
revoke all on schema reporting from public, anon, authenticated;

-- 1. Top pages: page views per path, most viewed first.
create or replace view reporting.top_pages with (security_invoker = true) as
select page_path,
       page_template,
       count(*) as page_views
  from public.analytics_events
 where event_type = 'page_view'
   and event_hour >= now() - interval '30 days'
 group by page_path, page_template
 order by page_views desc;

-- 1b. Page views per day (UTC), with where they came from.
create or replace view reporting.daily_page_views with (security_invoker = true) as
select date_trunc('day', event_hour at time zone 'utc') as day,
       count(*) as page_views,
       count(*) filter (where referrer_class = 'search') as from_search,
       count(*) filter (where referrer_class = 'social') as from_social,
       count(*) filter (where referrer_class = 'direct') as direct,
       count(*) filter (where referrer_class = 'internal') as from_this_site,
       count(*) filter (where referrer_class = 'other') as from_other_sites
  from public.analytics_events
 where event_type = 'page_view'
   and event_hour >= now() - interval '30 days'
 group by 1
 order by 1 desc;

-- 2. Click-through by data-track target. Clicks on a target, next to the page views
--    of the same page template, so "clicks_per_100_views" reads as "for every 100
--    views of a program page, how many clicks on cta-assessment". It is NOT a
--    conversion rate: one visitor can click twice, and nothing links a click to a view.
create or replace view reporting.click_through_by_target with (security_invoker = true) as
with views as (
  select page_template, count(*) as template_views
    from public.analytics_events
   where event_type = 'page_view' and event_hour >= now() - interval '30 days'
   group by page_template
), clicks as (
  select page_template, click_target, count(*) as clicks
    from public.analytics_events
   where event_type = 'click' and event_hour >= now() - interval '30 days'
   group by page_template, click_target
)
select c.click_target,
       c.page_template,
       c.clicks,
       coalesce(v.template_views, 0) as template_views,
       round(100.0 * c.clicks / nullif(v.template_views, 0), 1) as clicks_per_100_views
  from clicks c
  left join views v using (page_template)
 order by c.clicks desc;

-- 3. Scroll-depth distribution per page template: of the viewing stretches that ended
--    on a page of this template, the share whose deepest point was 0, 25, 50, 75 or
--    100%. Depth is measured by the BOTTOM edge of the window, so the first screen
--    already counts: most pages show almost everyone at 25 or more, and a page
--    shorter than the window is 100. Read the 75 and 100 rows for engagement.
--    A visitor who switches tabs and comes back can produce more than one stretch.
create or replace view reporting.scroll_depth_by_template with (security_invoker = true) as
select page_template,
       max_scroll,
       count(*) as page_leaves,
       round(100.0 * count(*) / sum(count(*)) over (partition by page_template), 1) as pct_of_template_leaves
  from public.analytics_events
 where event_type = 'page_leave'
   and event_hour >= now() - interval '30 days'
 group by page_template, max_scroll
 order by page_template, max_scroll;

-- 3b. The same, cumulative: the share that reached AT LEAST each depth.
create or replace view reporting.scroll_reach_by_template with (security_invoker = true) as
select page_template,
       count(*) as page_leaves,
       round(100.0 * count(*) filter (where max_scroll >= 25) / count(*), 1) as pct_reached_25,
       round(100.0 * count(*) filter (where max_scroll >= 50) / count(*), 1) as pct_reached_50,
       round(100.0 * count(*) filter (where max_scroll >= 75) / count(*), 1) as pct_reached_75,
       round(100.0 * count(*) filter (where max_scroll >= 100) / count(*), 1) as pct_reached_100
  from public.analytics_events
 where event_type = 'page_leave'
   and event_hour >= now() - interval '30 days'
 group by page_template
 order by page_leaves desc;

-- 3c. Visible time on page, by template.
create or replace view reporting.time_on_page_by_template with (security_invoker = true) as
select page_template,
       time_bucket,
       count(*) as page_leaves,
       round(100.0 * count(*) / sum(count(*)) over (partition by page_template), 1) as pct_of_template_leaves
  from public.analytics_events
 where event_type = 'page_leave'
   and event_hour >= now() - interval '30 days'
 group by page_template, time_bucket
 order by page_template, array_position(array['0-10s', '10-30s', '30-60s', '1-3m', '3m+'], time_bucket);

-- 4. Entry-to-exit style drop-off by page template, as an ESTIMATE.
--    entries          page views that did not come from this site (a visit that started here)
--    onward_views     page views whose previous page was this template (visits that went on)
--    estimated_exits  views minus onward views: roughly the visits that ended here
--    Thrown off by the back button, reloads, new tabs, a browser that hides the referrer,
--    and visitors who agreed to analytics part-way through a visit. Use it to compare
--    templates with each other, not as an exact count.
create or replace view reporting.drop_off_by_template with (security_invoker = true) as
with views as (
  select page_template,
         count(*) as views,
         count(*) filter (where referrer_class <> 'internal') as entries
    from public.analytics_events
   where event_type = 'page_view' and event_hour >= now() - interval '30 days'
   group by page_template
), onward as (
  select from_template as page_template, count(*) as onward_views
    from public.analytics_events
   where event_type = 'page_view' and from_template is not null and event_hour >= now() - interval '30 days'
   group by from_template
)
select v.page_template,
       v.views,
       v.entries,
       coalesce(o.onward_views, 0) as onward_views,
       greatest(v.views - coalesce(o.onward_views, 0), 0) as estimated_exits,
       round(100.0 * greatest(v.views - coalesce(o.onward_views, 0), 0) / nullif(v.views, 0), 1) as estimated_exit_rate_pct
  from views v
  left join onward o using (page_template)
 order by v.views desc;

-- 4b. Where visits go next: previous template -> this template, page views per pair.
create or replace view reporting.page_transitions with (security_invoker = true) as
select from_template as from_page_template,
       page_template as to_page_template,
       count(*) as page_views
  from public.analytics_events
 where event_type = 'page_view'
   and from_template is not null
   and event_hour >= now() - interval '30 days'
 group by from_template, page_template
 order by page_views desc;

-- Keep every view closed to the browser roles, including any added later in this schema.
revoke all on all tables in schema reporting from public, anon, authenticated;
alter default privileges in schema reporting revoke all on tables from public, anon, authenticated;
