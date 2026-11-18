-- Bintang Class: week 1 hardening.
-- Closes gaps found by supabase/tests/rls_test.sql:
--   * owners could set their own plan/status (billing bypass); platform admin could not suspend a centre
--   * admins could create other admins; only the owner may now manage admins
--   * attendance could be recorded in another user's name
--   * a non-member could be linked as a child's guardian; invites could point at another centre's child
--   * a removed parent kept access to their child through the guardians row
-- Also: policies split per command and scoped to `authenticated`, auth.uid() wrapped in a sub-select
-- (evaluated once per query, not per row), missing foreign-key indexes, anon loses table access entirely.

-- ---------- helpers ----------
create or replace function private.can_manage_role(c uuid, r text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when r in ('teacher', 'parent') then private.has_role(c, array['owner', 'admin'])
    when r = 'admin' then private.has_role(c, array['owner'])
    else false  -- nobody manages the owner row through the API
  end
$$;

-- ---------- centres: billing fields belong to the platform ----------
create or replace function private.centres_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  -- Runs as the caller (not security definer), so current_user is the API role.
  -- service_role / postgres (billing webhooks, migrations) pass through.
  if current_user in ('authenticated', 'anon') and not private.is_platform_admin() then
    if new.plan is distinct from old.plan
       or new.status is distinct from old.status
       or new.created_by is distinct from old.created_by then
      raise exception 'plan and status are managed by Bintang Class billing';
    end if;
  end if;
  return new;
end $$;
create trigger centres_guard before update on public.centres for each row execute function private.centres_guard();

drop policy centres_read on public.centres;
drop policy centres_update on public.centres;
create policy centres_select on public.centres for select to authenticated
  using (private.is_member(id) or private.is_platform_admin());
create policy centres_update on public.centres for update to authenticated
  using (private.has_role(id, array['owner']) or private.is_platform_admin())
  with check (private.has_role(id, array['owner']) or private.is_platform_admin());

-- ---------- memberships ----------
drop policy memberships_read on public.memberships;
drop policy memberships_manage on public.memberships;
create policy memberships_select on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff(centre_id) or private.is_platform_admin());
create policy memberships_insert on public.memberships for insert to authenticated
  with check (private.can_manage_role(centre_id, role) and private.can_write(centre_id));
create policy memberships_update on public.memberships for update to authenticated
  using (private.can_manage_role(centre_id, role))
  with check (private.can_manage_role(centre_id, role) and private.can_write(centre_id));
create policy memberships_delete on public.memberships for delete to authenticated
  using (private.can_manage_role(centre_id, role) or (user_id = (select auth.uid()) and role <> 'owner'));

-- Leaving or being removed (or demoted to parent) cleans up what the old role gave access to.
create or replace function private.membership_cleanup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' or new.role = 'parent' then
    update classes set teacher_id = null where centre_id = old.centre_id and teacher_id = old.user_id;
  end if;
  if tg_op = 'DELETE' then
    delete from guardians where centre_id = old.centre_id and user_id = old.user_id;
  end if;
  return coalesce(new, old);
end $$;
create trigger memberships_cleanup after delete or update of role on public.memberships
  for each row execute function private.membership_cleanup();

-- ---------- invites ----------
alter table public.invites alter column created_by set default auth.uid();
alter table public.invites add constraint invites_student_is_parent check (student_id is null or role = 'parent');
drop policy invites_manage on public.invites;
create policy invites_select on public.invites for select to authenticated
  using (private.is_manager(centre_id));
create policy invites_insert on public.invites for insert to authenticated
  with check (private.can_manage_role(centre_id, role) and private.can_write(centre_id));
create policy invites_update on public.invites for update to authenticated
  using (private.can_manage_role(centre_id, role))
  with check (private.can_manage_role(centre_id, role) and private.can_write(centre_id));
create policy invites_delete on public.invites for delete to authenticated
  using (private.can_manage_role(centre_id, role));

-- ---------- classes ----------
drop policy classes_read on public.classes;
drop policy classes_write on public.classes;
create policy classes_select on public.classes for select to authenticated using (private.is_member(centre_id));
create policy classes_insert on public.classes for insert to authenticated
  with check (private.is_manager(centre_id) and private.can_write(centre_id));
create policy classes_update on public.classes for update to authenticated
  using (private.is_manager(centre_id)) with check (private.is_manager(centre_id) and private.can_write(centre_id));
create policy classes_delete on public.classes for delete to authenticated
  using (private.is_manager(centre_id) and private.can_write(centre_id));

-- ---------- students ----------
drop policy students_read on public.students;
drop policy students_write on public.students;
create policy students_select on public.students for select to authenticated
  using (private.is_staff(centre_id) or private.is_guardian(id));
create policy students_insert on public.students for insert to authenticated
  with check (private.is_manager(centre_id) and private.can_write(centre_id));
create policy students_update on public.students for update to authenticated
  using (private.is_manager(centre_id)) with check (private.is_manager(centre_id) and private.can_write(centre_id));
create policy students_delete on public.students for delete to authenticated
  using (private.is_manager(centre_id) and private.can_write(centre_id));

-- ---------- guardians ----------
drop policy guardians_read on public.guardians;
drop policy guardians_write on public.guardians;
create policy guardians_select on public.guardians for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff(centre_id));
create policy guardians_insert on public.guardians for insert to authenticated
  with check (private.is_manager(centre_id) and private.can_write(centre_id));
create policy guardians_update on public.guardians for update to authenticated
  using (private.is_manager(centre_id)) with check (private.is_manager(centre_id) and private.can_write(centre_id));
create policy guardians_delete on public.guardians for delete to authenticated
  using (private.is_manager(centre_id));

-- ---------- attendance: always recorded in the marker's own name ----------
alter table public.attendance alter column marked_by set default auth.uid();
drop policy attendance_read on public.attendance;
drop policy attendance_write on public.attendance;
create policy attendance_select on public.attendance for select to authenticated
  using (private.is_staff(centre_id) or private.is_guardian(student_id));
create policy attendance_insert on public.attendance for insert to authenticated
  with check (private.is_staff(centre_id) and private.can_write(centre_id) and marked_by = (select auth.uid()));
create policy attendance_update on public.attendance for update to authenticated
  using (private.is_staff(centre_id))
  with check (private.is_staff(centre_id) and private.can_write(centre_id) and marked_by = (select auth.uid()));
create policy attendance_delete on public.attendance for delete to authenticated
  using (private.is_manager(centre_id) and private.can_write(centre_id));

-- ---------- progress ----------
alter table public.progress alter column by_user set default auth.uid();
drop policy progress_read on public.progress;
drop policy progress_write on public.progress;
create policy progress_select on public.progress for select to authenticated
  using (private.is_staff(centre_id) or private.is_guardian(student_id));
create policy progress_insert on public.progress for insert to authenticated
  with check (private.is_staff(centre_id) and private.can_write(centre_id) and by_user = (select auth.uid()));

-- ---------- platform ----------
drop policy platform_admins_self on public.platform_admins;
create policy platform_admins_select on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

drop policy crm_accounts_admin on public.crm_accounts;
drop policy crm_notes_admin on public.crm_notes;
create policy crm_accounts_admin on public.crm_accounts for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy crm_notes_admin on public.crm_notes for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());

create or replace function private.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
create trigger crm_accounts_touch before update on public.crm_accounts
  for each row execute function private.touch_updated_at();

-- ---------- same-centre integrity (adds guardians-must-be-members and invites) ----------
create or replace function private.same_centre_check() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'students' then
    if new.class_id is not null and not exists (select 1 from classes where id = new.class_id and centre_id = new.centre_id) then
      raise exception 'class belongs to another centre';
    end if;
  elsif tg_table_name in ('guardians', 'attendance', 'progress') then
    if not exists (select 1 from students where id = new.student_id and centre_id = new.centre_id) then
      raise exception 'student belongs to another centre';
    end if;
    if tg_table_name = 'attendance' and new.class_id is not null
       and not exists (select 1 from classes where id = new.class_id and centre_id = new.centre_id) then
      raise exception 'class belongs to another centre';
    end if;
    if tg_table_name = 'guardians'
       and not exists (select 1 from memberships where user_id = new.user_id and centre_id = new.centre_id) then
      raise exception 'guardian must be a member of this centre';
    end if;
  elsif tg_table_name = 'classes' then
    if new.teacher_id is not null and not exists (
      select 1 from memberships where user_id = new.teacher_id and centre_id = new.centre_id and role in ('owner', 'admin', 'teacher')) then
      raise exception 'teacher is not staff at this centre';
    end if;
  elsif tg_table_name = 'invites' then
    if new.student_id is not null and not exists (select 1 from students where id = new.student_id and centre_id = new.centre_id) then
      raise exception 'student belongs to another centre';
    end if;
  end if;
  return new;
end $$;
create trigger invites_same_centre before insert or update on public.invites
  for each row execute function private.same_centre_check();

-- ---------- accept_invite: a parent invited as staff is upgraded, never downgraded ----------
create or replace function public.accept_invite(p_token text, p_display_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  inv invites%rowtype;
  me uuid := auth.uid();
  my_email text;
  rank constant text[] := array['parent', 'teacher', 'admin', 'owner'];
begin
  if me is null then raise exception 'not signed in'; end if;
  select * into inv from invites where token = p_token and accepted_at is null and expires_at > now() for update;
  if not found then raise exception 'invite not found or expired'; end if;
  select lower(email) into my_email from auth.users where id = me;
  if lower(inv.email) <> my_email then raise exception 'this invite was sent to another email'; end if;
  insert into memberships (centre_id, user_id, role, display_name) values (inv.centre_id, me, inv.role, p_display_name)
    on conflict (centre_id, user_id) do update set role = excluded.role
    where array_position(rank, memberships.role) < array_position(rank, excluded.role);
  if inv.student_id is not null then
    insert into guardians (centre_id, student_id, user_id) values (inv.centre_id, inv.student_id, me) on conflict do nothing;
  end if;
  update invites set accepted_at = now(), accepted_by = me where id = inv.id;
  return inv.centre_id;
end $$;
revoke all on function public.accept_invite(text, text) from public, anon;
grant execute on function public.accept_invite(text, text) to authenticated;

-- ---------- lock down ----------
revoke execute on function private.centres_guard() from public, anon, authenticated;
revoke execute on function private.membership_cleanup() from public, anon, authenticated;
revoke execute on function private.touch_updated_at() from public, anon, authenticated;
-- Signed-out visitors only ever need invite_info(); they get no table access at all.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- ---------- indexes for foreign keys ----------
create index if not exists attendance_class_idx on public.attendance (class_id);
create index if not exists attendance_marked_by_idx on public.attendance (marked_by);
create index if not exists centres_created_by_idx on public.centres (created_by);
create index if not exists classes_teacher_idx on public.classes (teacher_id);
create index if not exists crm_notes_created_by_idx on public.crm_notes (created_by);
create index if not exists guardians_centre_idx on public.guardians (centre_id);
create index if not exists invites_accepted_by_idx on public.invites (accepted_by);
create index if not exists invites_created_by_idx on public.invites (created_by);
create index if not exists invites_student_idx on public.invites (student_id);
create index if not exists progress_by_user_idx on public.progress (by_user);
create index if not exists progress_centre_idx on public.progress (centre_id);
