-- Messages between a child's parents and the centre, one conversation per child.
--
-- Who is in a child's conversation: the child's parents, the teacher of the child's class,
-- and the centre's owner and admins. Other teachers, other parents and other centres see nothing.
-- Messages can't be edited; the sender can delete their own. New messages notify everyone else
-- in the conversation through the existing notifications (bell + phone).

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('recording', 'reply', 'practice', 'progress', 'message'));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sender_name text,   -- filled in by the database, so parents can see who wrote without reading memberships
  sender_role text,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_thread on public.messages (student_id, created_at desc);
create index messages_centre_recent on public.messages (centre_id, created_at desc);
create index messages_sender on public.messages (sender_id);

-- In this child's conversation?
create or replace function private.in_conversation(s uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students st
    where st.id = s
      and (private.is_manager(st.centre_id) or private.teaches_student(s) or private.is_guardian(s))
  )
$$;
revoke execute on function private.in_conversation(uuid) from public;
grant execute on function private.in_conversation(uuid) to authenticated;

alter table public.messages enable row level security;
create policy messages_select on public.messages for select to authenticated
  using (private.in_conversation(student_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.in_conversation(student_id)
    and private.can_write(centre_id)
    and centre_id = (select st.centre_id from public.students st where st.id = student_id)
  );
create policy messages_delete on public.messages for delete to authenticated
  using (sender_id = (select auth.uid()));
revoke update on public.messages from anon, authenticated;
grant select, insert, delete on public.messages to authenticated;

-- Live updates in an open conversation (Realtime applies the same select policy).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- Stamp who sent it (name and role at this centre); clients can't set these themselves.
create or replace function private.stamp_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare m record;
begin
  select display_name, role into m from public.memberships
  where centre_id = new.centre_id and user_id = new.sender_id;
  new.sender_name := coalesce(nullif(trim(m.display_name), ''), case m.role when 'parent' then 'Parent' else 'Teacher' end);
  new.sender_role := case when exists (select 1 from public.guardians g where g.student_id = new.student_id and g.user_id = new.sender_id)
                          then 'parent' else coalesce(m.role, 'teacher') end;
  new.created_at := now();
  return new;
end $$;
create trigger stamp_message before insert on public.messages
  for each row execute function private.stamp_message();

-- Tell everyone else in the conversation.
create or replace function private.on_message_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  st record;
  v_slug text := (select slug from public.centres where id = new.centre_id);
  v_sender text;
  v_parent boolean := exists (select 1 from public.guardians g where g.student_id = new.student_id and g.user_id = new.sender_id);
  v_to uuid[];
begin
  select s.full_name, c.teacher_id into st
  from public.students s left join public.classes c on c.id = s.class_id where s.id = new.student_id;
  v_sender := coalesce((select m.display_name from public.memberships m where m.centre_id = new.centre_id and m.user_id = new.sender_id),
                       case when v_parent then 'A parent' else 'The centre' end);
  -- Parents and the class teacher hear about every message; the owner and admins only when
  -- the class has no teacher to answer (they can still read every conversation).
  v_to := array(
    select g.user_id from public.guardians g where g.student_id = new.student_id
    union select st.teacher_id where st.teacher_id is not null
    union select m.user_id from public.memberships m
      where st.teacher_id is null and m.centre_id = new.centre_id and m.role in ('owner', 'admin')
  );
  perform private.notify(new.centre_id, v_to, 'message',
    v_sender || ' · ' || private.first_name(st.full_name),
    left(new.body, 140),
    '/c/' || v_slug || '/students/' || new.student_id || '/messages');
  return new;
end $$;

create trigger notify_message_insert after insert on public.messages
  for each row execute function private.on_message_insert();
