create or replace function public.same_centre_check() returns trigger
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
    if tg_table_name = 'attendance' then
      if new.class_id is not null and not exists (select 1 from classes where id = new.class_id and centre_id = new.centre_id) then
        raise exception 'class belongs to another centre';
      end if;
    end if;
  elsif tg_table_name = 'classes' then
    if new.teacher_id is not null and not exists (select 1 from memberships where user_id = new.teacher_id and centre_id = new.centre_id and role in ('owner', 'admin', 'teacher')) then
      raise exception 'teacher is not staff at this centre';
    end if;
  end if;
  return new;
end $$;
