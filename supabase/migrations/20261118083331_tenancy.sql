-- Bintang Class: multi-tenant base.
-- Every centre is a tenant. Every row carries centre_id and Row Level Security decides who sees it:
-- a signed-in person sees only centres they belong to, with what their role allows.

create extension if not exists pgcrypto;

create table public.centres (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  plan text not null default 'free' check (plan in ('free', 'centre')),
  status text not null default 'active' check (status in ('active', 'read_only', 'closed')),
  phone text,
  city text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'teacher', 'parent')),
  display_name text,
  main_contact boolean not null default false,
  billing_contact boolean not null default false,
  created_at timestamptz not null default now(),
  unique (centre_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres (id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'teacher', 'parent')),
  student_id uuid,
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  created_by uuid references auth.users (id) on delete set null,
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);
create index invites_centre_idx on public.invites (centre_id);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  teacher_id uuid references auth.users (id) on delete set null,
  schedule text,
  created_at timestamptz not null default now()
);
create index classes_centre_idx on public.classes (centre_id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 1 and 120),
  class_id uuid references public.classes (id) on delete set null,
  book text not null default 'Iqra 1',
  page int not null default 1 check (page between 0 and 999),
  status text not null default 'active' check (status in ('active', 'left')),
  monthly_fee numeric(8, 2),
  joined_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index students_centre_idx on public.students (centre_id);
create index students_class_idx on public.students (class_id);

alter table public.invites add constraint invites_student_fk foreign key (student_id) references public.students (id) on delete cascade;

create table public.guardians (
  centre_id uuid not null references public.centres (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (student_id, user_id)
);
create index guardians_user_idx on public.guardians (user_id);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  student_id uuid not null references public.students (id) on delete cascade,
  day date not null,
  present boolean not null,
  marked_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_id, day)
);
create index attendance_centre_day_idx on public.attendance (centre_id, day);

create table public.progress (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  book text not null,
  page int not null,
  note text,
  by_user uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index progress_student_idx on public.progress (student_id, created_at desc);

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.crm_accounts (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid unique references public.centres (id) on delete set null,
  name text not null,
  stage text not null default 'lead' check (stage in ('lead', 'trial', 'active', 'at_risk', 'churned')),
  contact_name text,
  contact_phone text,
  contact_email text,
  source text,
  city text,
  next_follow_up date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.crm_accounts (id) on delete cascade,
  body text not null,
  kind text not null default 'note' check (kind in ('note', 'call', 'whatsapp', 'meeting', 'system')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index crm_notes_account_idx on public.crm_notes (account_id, created_at desc);

create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid())
$$;

create or replace function public.has_role(c uuid, roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where centre_id = c and user_id = auth.uid() and role = any (roles))
$$;

create or replace function public.is_member(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where centre_id = c and user_id = auth.uid())
$$;

create or replace function public.is_staff(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_role(c, array['owner', 'admin', 'teacher'])
$$;

create or replace function public.is_manager(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_role(c, array['owner', 'admin'])
$$;

create or replace function public.is_guardian(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from guardians where student_id = s and user_id = auth.uid())
$$;

create or replace function public.can_write(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from centres where id = c and status = 'active')
$$;

alter table public.centres enable row level security;
alter table public.memberships enable row level security;
alter table public.invites enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.guardians enable row level security;
alter table public.attendance enable row level security;
alter table public.progress enable row level security;
alter table public.platform_admins enable row level security;
alter table public.crm_accounts enable row level security;
alter table public.crm_notes enable row level security;

create policy centres_read on public.centres for select using (public.is_member(id) or public.is_platform_admin());
create policy centres_update on public.centres for update using (public.has_role(id, array['owner'])) with check (public.has_role(id, array['owner']));

create policy memberships_read on public.memberships for select
  using (user_id = auth.uid() or public.is_staff(centre_id) or public.is_platform_admin());
create policy memberships_manage on public.memberships for all
  using (public.is_manager(centre_id) and public.can_write(centre_id) and role <> 'owner')
  with check (public.is_manager(centre_id) and public.can_write(centre_id) and role <> 'owner');

create policy invites_manage on public.invites for all
  using (public.is_manager(centre_id)) with check (public.is_manager(centre_id) and public.can_write(centre_id));

create policy classes_read on public.classes for select using (public.is_member(centre_id));
create policy classes_write on public.classes for all
  using (public.is_manager(centre_id) and public.can_write(centre_id))
  with check (public.is_manager(centre_id) and public.can_write(centre_id));

create policy students_read on public.students for select using (public.is_staff(centre_id) or public.is_guardian(id));
create policy students_write on public.students for all
  using (public.is_manager(centre_id) and public.can_write(centre_id))
  with check (public.is_manager(centre_id) and public.can_write(centre_id));

create policy guardians_read on public.guardians for select using (user_id = auth.uid() or public.is_staff(centre_id));
create policy guardians_write on public.guardians for all
  using (public.is_manager(centre_id)) with check (public.is_manager(centre_id) and public.can_write(centre_id));

create policy attendance_read on public.attendance for select using (public.is_staff(centre_id) or public.is_guardian(student_id));
create policy attendance_write on public.attendance for all
  using (public.is_staff(centre_id) and public.can_write(centre_id))
  with check (public.is_staff(centre_id) and public.can_write(centre_id));

create policy progress_read on public.progress for select using (public.is_staff(centre_id) or public.is_guardian(student_id));
create policy progress_write on public.progress for insert
  with check (public.is_staff(centre_id) and public.can_write(centre_id) and by_user = auth.uid());

create policy platform_admins_self on public.platform_admins for select using (user_id = auth.uid());

create policy crm_accounts_admin on public.crm_accounts for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy crm_notes_admin on public.crm_notes for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create or replace function public.same_centre_check() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name in ('students') and new.class_id is not null
     and not exists (select 1 from classes where id = new.class_id and centre_id = new.centre_id) then
    raise exception 'class belongs to another centre';
  end if;
  if tg_table_name in ('guardians', 'attendance', 'progress')
     and not exists (select 1 from students where id = new.student_id and centre_id = new.centre_id) then
    raise exception 'student belongs to another centre';
  end if;
  if tg_table_name = 'attendance' and new.class_id is not null
     and not exists (select 1 from classes where id = new.class_id and centre_id = new.centre_id) then
    raise exception 'class belongs to another centre';
  end if;
  if tg_table_name = 'classes' and new.teacher_id is not null
     and not exists (select 1 from memberships where user_id = new.teacher_id and centre_id = new.centre_id and role in ('owner', 'admin', 'teacher')) then
    raise exception 'teacher is not staff at this centre';
  end if;
  return new;
end $$;

create trigger students_same_centre before insert or update on public.students for each row execute function public.same_centre_check();
create trigger guardians_same_centre before insert or update on public.guardians for each row execute function public.same_centre_check();
create trigger attendance_same_centre before insert or update on public.attendance for each row execute function public.same_centre_check();
create trigger progress_same_centre before insert or update on public.progress for each row execute function public.same_centre_check();
create trigger classes_same_centre before insert or update on public.classes for each row execute function public.same_centre_check();

create or replace function public.progress_moves_student() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update students set book = new.book, page = new.page where id = new.student_id and centre_id = new.centre_id;
  return new;
end $$;
create trigger progress_moves_student after insert on public.progress for each row execute function public.progress_moves_student();

create or replace function public.create_centre(p_name text, p_slug text, p_phone text default null, p_city text default null, p_display_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  c uuid;
  me uuid := auth.uid();
  my_email text;
begin
  if me is null then raise exception 'not signed in'; end if;
  if (select count(*) from memberships where user_id = me and role = 'owner') >= 5 then
    raise exception 'too many centres';
  end if;
  insert into centres (name, slug, phone, city, created_by) values (trim(p_name), lower(p_slug), p_phone, p_city, me) returning id into c;
  insert into memberships (centre_id, user_id, role, display_name, main_contact, billing_contact) values (c, me, 'owner', p_display_name, true, true);
  select email into my_email from auth.users where id = me;
  insert into crm_accounts (centre_id, name, stage, contact_name, contact_phone, contact_email, source, city)
    values (c, trim(p_name), 'trial', p_display_name, p_phone, my_email, 'sign-up', p_city);
  insert into crm_notes (account_id, body, kind) select id, 'Centre signed up', 'system' from crm_accounts where centre_id = c;
  return c;
end $$;

create or replace function public.accept_invite(p_token text, p_display_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  inv invites%rowtype;
  me uuid := auth.uid();
  my_email text;
begin
  if me is null then raise exception 'not signed in'; end if;
  select * into inv from invites where token = p_token and accepted_at is null and expires_at > now();
  if not found then raise exception 'invite not found or expired'; end if;
  select lower(email) into my_email from auth.users where id = me;
  if lower(inv.email) <> my_email then raise exception 'this invite was sent to another email'; end if;
  insert into memberships (centre_id, user_id, role, display_name) values (inv.centre_id, me, inv.role, p_display_name)
    on conflict (centre_id, user_id) do nothing;
  if inv.student_id is not null then
    insert into guardians (centre_id, student_id, user_id) values (inv.centre_id, inv.student_id, me) on conflict do nothing;
  end if;
  update invites set accepted_at = now(), accepted_by = me where id = inv.id;
  return inv.centre_id;
end $$;

create or replace function public.invite_info(p_token text)
returns table (centre_name text, role text, email text) language sql stable security definer set search_path = public as $$
  select c.name, i.role, i.email from invites i join centres c on c.id = i.centre_id
  where i.token = p_token and i.accepted_at is null and i.expires_at > now()
$$;

revoke all on function public.create_centre(text, text, text, text, text) from public, anon;
grant execute on function public.create_centre(text, text, text, text, text) to authenticated;
revoke all on function public.accept_invite(text, text) from public, anon;
grant execute on function public.accept_invite(text, text) to authenticated;
grant execute on function public.invite_info(text) to anon, authenticated;
