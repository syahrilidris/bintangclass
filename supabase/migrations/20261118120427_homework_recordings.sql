-- Bintang Class: homework recordings (product plan, phase 1).
-- A teacher sets practice for a class; the child records at home on a parent's phone; the teacher
-- listens in one inbox and replies with stars, "good" or "repeat", and a note.
-- Audio lives in the private `recordings` bucket at <centre_id>/<student_id>/<file> (rules from week 1).

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  due_on date,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index homework_class_idx on public.homework (class_id, created_at desc);
create index homework_centre_idx on public.homework (centre_id);
create index homework_created_by_idx on public.homework (created_by);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  homework_id uuid references public.homework (id) on delete set null,
  audio_path text not null unique,
  duration_s int check (duration_s between 0 and 900),
  submitted_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- the teacher's reply
  stars int check (stars between 1 and 3),
  verdict text check (verdict in ('good', 'repeat')),
  feedback text check (length(feedback) <= 1000),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz
);
create index submissions_student_idx on public.submissions (student_id, created_at desc);
create index submissions_centre_new_idx on public.submissions (centre_id, created_at desc) where reviewed_at is null;
create index submissions_homework_idx on public.submissions (homework_id);
create index submissions_submitted_by_idx on public.submissions (submitted_by);
create index submissions_reviewed_by_idx on public.submissions (reviewed_by);

-- ---------- helpers ----------
create or replace function private.teaches_class(k uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from classes where id = k and teacher_id = (select auth.uid()))
$$;

-- Parents see homework for any class one of their children is in.
create or replace function private.parent_of_class(k uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from guardians g join students s on s.id = g.student_id
    where g.user_id = (select auth.uid()) and s.class_id = k
  )
$$;

-- ---------- homework ----------
alter table public.homework enable row level security;
create policy homework_select on public.homework for select to authenticated
  using (private.is_manager(centre_id) or private.teaches_class(class_id) or private.parent_of_class(class_id));
create policy homework_insert on public.homework for insert to authenticated
  with check ((private.is_manager(centre_id) or private.teaches_class(class_id))
              and private.can_write(centre_id) and created_by = (select auth.uid()));
create policy homework_update on public.homework for update to authenticated
  using (private.is_manager(centre_id) or private.teaches_class(class_id))
  with check ((private.is_manager(centre_id) or private.teaches_class(class_id)) and private.can_write(centre_id));
create policy homework_delete on public.homework for delete to authenticated
  using (private.is_manager(centre_id) or private.teaches_class(class_id));

-- ---------- submissions ----------
alter table public.submissions enable row level security;
create policy submissions_select on public.submissions for select to authenticated
  using (private.is_manager(centre_id) or private.teaches_student(student_id) or private.is_guardian(student_id));
-- Parents send recordings for their own children; staff may record in class for their students.
create policy submissions_insert on public.submissions for insert to authenticated
  with check (
    (private.is_guardian(student_id) or private.is_manager(centre_id) or private.teaches_student(student_id))
    and private.can_write(centre_id)
    and submitted_by = (select auth.uid())
    and private.recording_centre(audio_path) = centre_id
    and private.recording_student(audio_path) = student_id
    and reviewed_at is null and stars is null and verdict is null and feedback is null
  );
-- Only staff reply; the trigger below stops them changing anything but the reply.
create policy submissions_update on public.submissions for update to authenticated
  using (private.is_manager(centre_id) or private.teaches_student(student_id))
  with check ((private.is_manager(centre_id) or private.teaches_student(student_id)) and private.can_write(centre_id));
-- The sender can take back a recording the teacher hasn't replied to; managers can remove any.
create policy submissions_delete on public.submissions for delete to authenticated
  using (private.is_manager(centre_id) or (submitted_by = (select auth.uid()) and reviewed_at is null));

create or replace function private.submission_reply_only() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.centre_id is distinct from old.centre_id or new.student_id is distinct from old.student_id
       or new.homework_id is distinct from old.homework_id or new.audio_path is distinct from old.audio_path
       or new.submitted_by is distinct from old.submitted_by or new.created_at is distinct from old.created_at then
      raise exception 'only the teacher''s reply can be changed';
    end if;
    new.reviewed_by := (select auth.uid());
    new.reviewed_at := now();
  end if;
  return new;
end $$;
create trigger submissions_reply_only before update on public.submissions
  for each row execute function private.submission_reply_only();

-- ---------- same-centre integrity ----------
create or replace function private.homework_integrity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'homework' then
    if not exists (select 1 from classes where id = new.class_id and centre_id = new.centre_id) then
      raise exception 'class belongs to another centre';
    end if;
  else
    if not exists (select 1 from students where id = new.student_id and centre_id = new.centre_id) then
      raise exception 'student belongs to another centre';
    end if;
    if tg_op = 'INSERT' and new.homework_id is not null and not exists (
      select 1 from homework h join students s on s.class_id = h.class_id
      where h.id = new.homework_id and s.id = new.student_id) then
      raise exception 'homework is for another class';
    end if;
  end if;
  return new;
end $$;
create trigger homework_integrity before insert or update on public.homework
  for each row execute function private.homework_integrity();
create trigger submissions_integrity before insert or update on public.submissions
  for each row execute function private.homework_integrity();

-- Audio files are removed by the app through the Storage API before the row is deleted:
-- Supabase blocks direct deletes from storage.objects.

revoke execute on function private.submission_reply_only() from public, anon, authenticated;
revoke execute on function private.homework_integrity() from public, anon, authenticated;
revoke all on public.homework, public.submissions from anon;
