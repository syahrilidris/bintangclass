create schema if not exists private;
grant usage on schema private to anon, authenticated;

alter function public.is_platform_admin() set schema private;
alter function public.has_role(uuid, text[]) set schema private;
alter function public.is_member(uuid) set schema private;
alter function public.is_staff(uuid) set schema private;
alter function public.is_manager(uuid) set schema private;
alter function public.is_guardian(uuid) set schema private;
alter function public.can_write(uuid) set schema private;
alter function public.same_centre_check() set schema private;
alter function public.progress_moves_student() set schema private;

create or replace function private.is_staff(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select private.has_role(c, array['owner', 'admin', 'teacher'])
$$;
create or replace function private.is_manager(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select private.has_role(c, array['owner', 'admin'])
$$;

revoke execute on function private.same_centre_check() from public, anon, authenticated;
revoke execute on function private.progress_moves_student() from public, anon, authenticated;
