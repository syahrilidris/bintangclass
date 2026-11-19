-- Bintang Class: platform statistics for the platform admin.
-- The platform admin sees every centre's numbers but never children's names, records or recordings:
-- these functions return counts only, and refuse anyone who isn't in platform_admins.

create or replace function public.platform_centre_stats()
returns table (
  centre_id uuid, name text, slug text, city text, plan text, status text, created_at timestamptz,
  owner_name text, active_students int, classes int, teachers int, parents int,
  attendance_30d int, present_30d int, attendance_14d int,
  recordings_30d int, replied_30d int, progress_30d int,
  last_activity timestamptz, stage text, next_follow_up date
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not private.is_platform_admin() then raise exception 'platform admins only'; end if;
  return query
  select c.id, c.name, c.slug, c.city, c.plan, c.status, c.created_at,
    (select m.display_name from memberships m where m.centre_id = c.id and m.role = 'owner' limit 1),
    (select count(*)::int from students s where s.centre_id = c.id and s.status = 'active'),
    (select count(*)::int from classes k where k.centre_id = c.id),
    (select count(*)::int from memberships m where m.centre_id = c.id and m.role in ('teacher', 'admin')),
    (select count(*)::int from memberships m where m.centre_id = c.id and m.role = 'parent'),
    (select count(*)::int from attendance a where a.centre_id = c.id and a.day > current_date - 30),
    (select count(*)::int from attendance a where a.centre_id = c.id and a.day > current_date - 30 and a.present),
    (select count(*)::int from attendance a where a.centre_id = c.id and a.day > current_date - 14),
    (select count(*)::int from submissions x where x.centre_id = c.id and x.created_at > now() - interval '30 days'),
    (select count(*)::int from submissions x where x.centre_id = c.id and x.created_at > now() - interval '30 days' and x.reviewed_at is not null),
    (select count(*)::int from progress p where p.centre_id = c.id and p.created_at > now() - interval '30 days'),
    greatest(
      (select max(a.created_at) from attendance a where a.centre_id = c.id),
      (select max(x.created_at) from submissions x where x.centre_id = c.id),
      (select max(p.created_at) from progress p where p.centre_id = c.id),
      c.created_at),
    ca.stage, ca.next_follow_up
  from centres c
  left join crm_accounts ca on ca.centre_id = c.id
  order by c.created_at desc;
end $$;

-- One row per day for the last `days` days, across all centres.
create or replace function public.platform_daily_activity(days int default 30)
returns table (day date, attendance int, recordings int, progress int, signups int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not private.is_platform_admin() then raise exception 'platform admins only'; end if;
  return query
  with d as (select generate_series(current_date - (least(days, 180) - 1), current_date, interval '1 day')::date as day)
  select d.day,
    (select count(*)::int from attendance a where a.day = d.day),
    (select count(*)::int from submissions x where (x.created_at at time zone 'Asia/Kuala_Lumpur')::date = d.day),
    (select count(*)::int from progress p where (p.created_at at time zone 'Asia/Kuala_Lumpur')::date = d.day),
    (select count(*)::int from centres c where (c.created_at at time zone 'Asia/Kuala_Lumpur')::date = d.day)
  from d order by d.day;
end $$;

revoke all on function public.platform_centre_stats() from public, anon;
revoke all on function public.platform_daily_activity(int) from public, anon;
grant execute on function public.platform_centre_stats() to authenticated;
grant execute on function public.platform_daily_activity(int) to authenticated;

-- CRM notes record who wrote them.
alter table public.crm_notes alter column created_by set default auth.uid();
