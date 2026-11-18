-- Bintang Class: align week 1 with the product plan.
--   1. Teachers work on "their classes": they see and record only for students in classes they teach.
--      Owners and admins still see the whole centre.
--   2. Recordings live in a private bucket, one folder per centre: recordings/<centre_id>/<student_id>/<file>.
--      The same rules as the tables decide who can read or upload.
--   3. Activity log: who changed what, per centre, readable by the centre's owner and admins.

-- ---------- 1. teacher scope ----------
create or replace function private.teaches_student(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from students st join classes c on c.id = st.class_id
    where st.id = s and c.teacher_id = (select auth.uid())
  )
$$;

drop policy students_select on public.students;
create policy students_select on public.students for select to authenticated
  using (private.is_manager(centre_id) or private.teaches_student(id) or private.is_guardian(id));

drop policy guardians_select on public.guardians;
create policy guardians_select on public.guardians for select to authenticated
  using (user_id = (select auth.uid()) or private.is_manager(centre_id) or private.teaches_student(student_id));

drop policy attendance_select on public.attendance;
drop policy attendance_insert on public.attendance;
drop policy attendance_update on public.attendance;
create policy attendance_select on public.attendance for select to authenticated
  using (private.is_manager(centre_id) or private.teaches_student(student_id) or private.is_guardian(student_id));
create policy attendance_insert on public.attendance for insert to authenticated
  with check ((private.is_manager(centre_id) or private.teaches_student(student_id))
              and private.can_write(centre_id) and marked_by = (select auth.uid()));
create policy attendance_update on public.attendance for update to authenticated
  using (private.is_manager(centre_id) or private.teaches_student(student_id))
  with check ((private.is_manager(centre_id) or private.teaches_student(student_id))
              and private.can_write(centre_id) and marked_by = (select auth.uid()));

drop policy progress_select on public.progress;
drop policy progress_insert on public.progress;
create policy progress_select on public.progress for select to authenticated
  using (private.is_manager(centre_id) or private.teaches_student(student_id) or private.is_guardian(student_id));
create policy progress_insert on public.progress for insert to authenticated
  with check ((private.is_manager(centre_id) or private.teaches_student(student_id))
              and private.can_write(centre_id) and by_user = (select auth.uid()));

-- ---------- 2. recordings bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recordings', 'recordings', false, 15728640,
        array['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/x-m4a'])
on conflict (id) do nothing;

-- Path must be <centre_id>/<student_id>/<file>; anything else gives nulls and is refused.
create or replace function private.recording_centre(path text) returns uuid
language sql immutable as $$
  select case when path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
              then split_part(path, '/', 1)::uuid end
$$;
create or replace function private.recording_student(path text) returns uuid
language sql immutable as $$
  select case when private.recording_centre(path) is not null then split_part(path, '/', 2)::uuid end
$$;

create or replace function private.can_access_recording(path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from students s
    where s.id = private.recording_student(path)
      and s.centre_id = private.recording_centre(path)
      and (private.is_manager(s.centre_id) or private.teaches_student(s.id) or private.is_guardian(s.id))
  )
$$;

create policy recordings_select on storage.objects for select to authenticated
  using (bucket_id = 'recordings' and private.can_access_recording(name));
create policy recordings_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'recordings' and private.can_access_recording(name)
              and private.can_write(private.recording_centre(name)));
create policy recordings_delete on storage.objects for delete to authenticated
  using (bucket_id = 'recordings' and (
    private.is_manager(private.recording_centre(name))
    or (owner_id = (select auth.uid())::text and private.can_access_recording(name))));
-- No update policy: recordings are never overwritten, a new take is a new file.

-- ---------- 3. activity log ----------
create table public.activity_log (
  id bigint generated always as identity primary key,
  centre_id uuid not null references public.centres (id) on delete cascade,
  actor uuid references auth.users (id) on delete set null,
  action text not null check (action in ('insert', 'update', 'delete')),
  table_name text not null,
  row_id uuid,
  changes jsonb,
  at timestamptz not null default now()
);
create index activity_log_centre_idx on public.activity_log (centre_id, at desc);
create index activity_log_actor_idx on public.activity_log (actor);
alter table public.activity_log enable row level security;
-- Owners and admins read their centre's log. Nobody writes to it except the trigger.
-- Platform admin is left out on purpose: entries can hold children's names.
create policy activity_log_select on public.activity_log for select to authenticated
  using (private.is_manager(centre_id));
revoke insert, update, delete, truncate on public.activity_log from authenticated, anon;

create or replace function private.log_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  r jsonb := coalesce(n, o);
  c uuid := coalesce(r ->> 'centre_id', case when tg_table_name = 'centres' then r ->> 'id' end)::uuid;
  ch jsonb;
begin
  -- Rows removed because their whole centre is being deleted: nothing to log against.
  if not exists (select 1 from centres where id = c) then return null; end if;
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(key, value) into ch from jsonb_each(n) where n -> key is distinct from o -> key;
    if ch is null then return null; end if;
  else
    ch := r;
  end if;
  ch := ch - 'token';  -- never copy invite tokens into the log
  insert into activity_log (centre_id, actor, action, table_name, row_id, changes)
  values (c, auth.uid(), lower(tg_op), tg_table_name,
          coalesce(r ->> 'id', r ->> 'student_id')::uuid, ch);
  return null;
end $$;
revoke execute on function private.log_activity() from public, anon, authenticated;

create trigger centres_log after insert or update or delete on public.centres for each row execute function private.log_activity();
create trigger memberships_log after insert or update or delete on public.memberships for each row execute function private.log_activity();
create trigger classes_log after insert or update or delete on public.classes for each row execute function private.log_activity();
create trigger students_log after insert or update or delete on public.students for each row execute function private.log_activity();
create trigger guardians_log after insert or update or delete on public.guardians for each row execute function private.log_activity();
create trigger invites_log after insert or update or delete on public.invites for each row execute function private.log_activity();
-- Attendance and progress are not logged: each row already records who wrote it and when.
