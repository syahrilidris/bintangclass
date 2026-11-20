-- The bridge to the Bintang family app (app.bintangkids.com).
--
-- A parent pairs ONE child with the family app using a one-time code:
--   1. In Bintang Class the parent asks for a code for their child (bridge_new_code). It lasts 15 minutes.
--   2. In the family app they type it in; the family app trades it for a long random key (bridge_claim).
--   3. With that key the family app may only READ that one child's class updates (bridge_feed):
--      attendance, the teacher's replies to home recordings, reading progress and this week's practice.
-- Nothing else is reachable with the key: no other children, no names of other people, no writes.
-- Codes and keys are stored only as SHA-256 hashes. Parents (and the centre's owner/admins) see and can
-- revoke links from the child's page; the family app can disconnect with its key (bridge_disconnect).

create table public.bridge_codes (
  code_hash text primary key,
  centre_id uuid not null references public.centres (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);
create index bridge_codes_student on public.bridge_codes (student_id);
alter table public.bridge_codes enable row level security;
revoke all on public.bridge_codes from anon, authenticated;

create table public.bridge_links (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  label text not null default 'Bintang family app',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index bridge_links_student on public.bridge_links (student_id);
alter table public.bridge_links enable row level security;
create policy bridge_links_select on public.bridge_links for select to authenticated
  using (private.is_guardian(student_id) or private.is_manager(centre_id));
revoke all on public.bridge_links from anon, authenticated;
grant select (id, centre_id, student_id, created_by, label, created_at, last_used_at, revoked_at) on public.bridge_links to authenticated;

create or replace function private.sha(t text) returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(convert_to(t, 'UTF8'), 'sha256'), 'hex')
$$;

-- A parent asks for a pairing code for their own child.
create or replace function public.bridge_new_code(p_student uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_centre uuid;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- no 0/O, 1/I
  v_raw bytea := extensions.gen_random_bytes(8);
  v_code text := '';
  v_exp timestamptz := now() + interval '15 minutes';
begin
  if (select auth.uid()) is null or not private.is_guardian(p_student) then
    raise exception 'Only this child''s parent can connect the family app.';
  end if;
  select centre_id into v_centre from public.students where id = p_student;
  for i in 0..7 loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_raw, i) % 32) + 1, 1);
  end loop;
  delete from public.bridge_codes where student_id = p_student and created_by = (select auth.uid());
  insert into public.bridge_codes (code_hash, centre_id, student_id, created_by, expires_at)
  values (private.sha(v_code), v_centre, p_student, (select auth.uid()), v_exp);
  return jsonb_build_object('code', substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4), 'expires_at', v_exp);
end $$;

-- The family app trades a code for a key. Works once, within 15 minutes.
create or replace function public.bridge_claim(p_code text, p_label text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c record;
  v_token text := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  v_norm text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  select * into c from public.bridge_codes
  where code_hash = private.sha(v_norm) and used_at is null and expires_at > now()
  for update;
  if not found then
    raise exception 'That code doesn''t work. Codes last 15 minutes and work once; make a new one in Bintang Class.';
  end if;
  update public.bridge_codes set used_at = now() where code_hash = c.code_hash;
  insert into public.bridge_links (centre_id, student_id, created_by, token_hash, label)
  values (c.centre_id, c.student_id, c.created_by, private.sha(v_token), coalesce(nullif(left(trim(p_label), 60), ''), 'Bintang family app'));
  return jsonb_build_object('token', v_token) || private.bridge_child(c.student_id);
end $$;

-- What the family app may know about the child: first name, class, centre, where they are reading.
create or replace function private.bridge_child(p_student uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'child', split_part(trim(st.full_name), ' ', 1),
    'centre', ce.name,
    'class', cl.name,
    'book', st.book,
    'page', st.page)
  from public.students st
  join public.centres ce on ce.id = st.centre_id
  left join public.classes cl on cl.id = st.class_id
  where st.id = p_student
$$;

-- Read the child's class updates since a time (at most 60 days back).
create or replace function public.bridge_feed(p_token text, p_since timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  l record;
  v_since timestamptz := greatest(coalesce(p_since, now() - interval '30 days'), now() - interval '60 days');
  v_class uuid;
begin
  select * into l from public.bridge_links where token_hash = private.sha(coalesce(p_token, '')) and revoked_at is null;
  if not found then raise exception 'This link was disconnected.'; end if;
  update public.bridge_links set last_used_at = now() where id = l.id;
  select class_id into v_class from public.students where id = l.student_id;

  return private.bridge_child(l.student_id) || jsonb_build_object(
    'now', now(),
    'attendance', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'day', a.day, 'present', a.present) order by a.day)
      from public.attendance a
      where a.student_id = l.student_id and a.day >= (v_since at time zone 'Asia/Kuala_Lumpur')::date - 14
    ), '[]'::jsonb),
    'replies', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'stars', s.stars, 'verdict', s.verdict, 'at', s.reviewed_at) order by s.reviewed_at)
      from public.submissions s
      where s.student_id = l.student_id and s.reviewed_at is not null and s.reviewed_at >= v_since - interval '14 days'
    ), '[]'::jsonb),
    'progress', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'book', p.book, 'page', p.page, 'at', p.created_at) order by p.created_at)
      from public.progress p
      where p.student_id = l.student_id and p.created_at >= v_since - interval '14 days'
    ), '[]'::jsonb),
    'practice', (
      select jsonb_build_object('id', h.id, 'title', h.title, 'due_on', h.due_on, 'at', h.created_at)
      from public.homework h where h.class_id = v_class
      order by h.created_at desc limit 1
    )
  );
end $$;

-- The family app disconnects itself (parent removed the link there).
create or replace function public.bridge_disconnect(p_token text)
returns void language sql security definer set search_path = '' as $$
  update public.bridge_links set revoked_at = now()
  where token_hash = private.sha(coalesce(p_token, '')) and revoked_at is null;
$$;

-- A parent, owner or admin disconnects from Bintang Class.
create or replace function public.bridge_revoke(p_link uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.bridge_links l set revoked_at = now()
  where l.id = p_link and l.revoked_at is null
    and (private.is_guardian(l.student_id) or private.is_manager(l.centre_id));
  if not found then raise exception 'Link not found.'; end if;
end $$;

revoke execute on function public.bridge_new_code(uuid) from public, anon;
revoke execute on function public.bridge_revoke(uuid) from public, anon;
grant execute on function public.bridge_new_code(uuid) to authenticated;
grant execute on function public.bridge_revoke(uuid) to authenticated;
-- The family app calls these without a Bintang Class sign-in; the code or key is the permission.
grant execute on function public.bridge_claim(text, text) to anon, authenticated;
grant execute on function public.bridge_feed(text, timestamptz) to anon, authenticated;
grant execute on function public.bridge_disconnect(text) to anon, authenticated;
revoke execute on function private.bridge_child(uuid) from public;
revoke execute on function private.sha(text) from public;
