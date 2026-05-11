-- =============================================
-- DeenGuide Admin Analytics RPC Functions
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Hourly activity breakdown (for Peak Hours chart)
create or replace function get_hourly_activity()
returns table(hour int, event_count bigint)
language sql security definer as $$
  select
    extract(hour from created_at at time zone 'UTC')::int as hour,
    count(*) as event_count
  from analytics_events
  group by hour
  order by hour;
$$;

-- 2. Weekly user signups (for Growth chart)
create or replace function get_weekly_signups()
returns table(week text, signups bigint)
language sql security definer as $$
  select
    to_char(date_trunc('week', created_at), 'Mon DD') as week,
    count(*) as signups
  from profiles
  where created_at >= now() - interval '12 weeks'
  group by date_trunc('week', created_at)
  order by date_trunc('week', created_at);
$$;

-- 3. Top bookmarked items per kind
create or replace function get_top_bookmarks(item_kind text, lim int default 10)
returns table(item_id text, item_data jsonb, bookmark_count bigint)
language sql security definer as $$
  select item_id, item_data, count(*) as bookmark_count
  from bookmarks
  where kind = item_kind
  group by item_id, item_data
  order by bookmark_count desc
  limit lim;
$$;

-- 4. Guest vs signed-in event ratio
create or replace function get_user_type_ratio()
returns table(user_type text, event_count bigint)
language sql security definer as $$
  select
    case when user_id is null then 'Guest' else 'Signed In' end as user_type,
    count(*) as event_count
  from analytics_events
  group by user_type;
$$;

-- 5. Top reciters played
create or replace function get_top_reciters()
returns table(reciter_name text, play_count bigint)
language sql security definer as $$
  select
    metadata->>'reciter_name' as reciter_name,
    count(*) as play_count
  from analytics_events
  where event_type = 'audio_played'
    and metadata->>'reciter_name' is not null
  group by reciter_name
  order by play_count desc
  limit 8;
$$;

-- 6. Admin-safe user list (no passwords, just profile data)
create or replace function get_admin_user_list(lim int default 50, offs int default 0)
returns table(
  id uuid,
  role text,
  created_at timestamptz,
  email text
)
language sql security definer as $$
  select
    p.id,
    p.role,
    p.created_at,
    u.email
  from profiles p
  join auth.users u on u.id = p.id
  order by p.created_at desc
  limit lim
  offset offs;
$$;

-- Grant execute to authenticated users (admin check is in the frontend + RLS)
grant execute on function get_hourly_activity() to authenticated;
grant execute on function get_weekly_signups() to authenticated;
grant execute on function get_top_bookmarks(text, int) to authenticated;
grant execute on function get_user_type_ratio() to authenticated;
grant execute on function get_top_reciters() to authenticated;
grant execute on function get_admin_user_list(int, int) to authenticated;
