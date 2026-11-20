-- Notifications: what's new for each person, shown in the app's bell and (if they turn it on) on their phone.
--
-- Rows are written only by triggers, never by the app, so every path that creates a recording,
-- a reply, practice or progress (online, offline sync, admin edits) notifies the same way.
-- People read and mark only their own notifications. Phone delivery: after rows are written,
-- pg_net posts the message and the recipients' push subscriptions to the app's /api/push route,
-- signed with a shared secret kept in private.settings (set outside migrations, never in the repo).

create extension if not exists pg_net with schema extensions;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('recording', 'reply', 'practice', 'progress')),
  title text not null,
  body text,
  url text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_recent on public.notifications (user_id, created_at desc);
create index notifications_unread on public.notifications (user_id, centre_id) where read_at is null;

alter table public.notifications enable row level security;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- One row per phone/browser that turned notifications on.
create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_select on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.push_subscriptions from anon, authenticated;
grant select on public.push_subscriptions to authenticated;

create table if not exists private.settings (key text primary key, value text not null);
revoke all on private.settings from public, anon, authenticated;

-- Save this phone for the signed-in person. A shared phone moves to whoever signed in last.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'not signed in'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 then raise exception 'bad endpoint'; end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, (select auth.uid()), p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
end $$;

create or replace function public.remove_push_subscription(p_endpoint text)
returns void language sql security definer set search_path = '' as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = (select auth.uid());
$$;

-- Called by /api/push with the shared secret to forget phones that no longer accept messages.
create or replace function public.push_gone(p_secret text, p_endpoints text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_secret is null or p_secret is distinct from (select value from private.settings where key = 'push_secret') then
    raise exception 'not allowed';
  end if;
  delete from public.push_subscriptions where endpoint = any (p_endpoints);
end $$;

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
revoke execute on function public.remove_push_subscription(text) from public, anon;
revoke execute on function public.push_gone(text, text[]) from public;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
grant execute on function public.remove_push_subscription(text) to authenticated;
grant execute on function public.push_gone(text, text[]) to anon, authenticated;

-- Write notifications for these people and, if push is set up, hand them to the app to deliver.
create or replace function private.notify(
  p_centre uuid, p_users uuid[], p_kind text, p_title text, p_body text, p_url text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_users uuid[];
  v_url text := (select value from private.settings where key = 'push_url');
  v_secret text := (select value from private.settings where key = 'push_secret');
  v_subs jsonb;
begin
  select coalesce(array_agg(distinct u), '{}') into v_users
  from unnest(p_users) u
  where u is not null and u is distinct from (select auth.uid());  -- never notify the person who did it
  if cardinality(v_users) = 0 then return; end if;

  insert into public.notifications (centre_id, user_id, kind, title, body, url)
  select p_centre, u, p_kind, p_title, p_body, p_url from unnest(v_users) u;

  if v_url is null or v_secret is null then return; end if;
  select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
    into v_subs from public.push_subscriptions s where s.user_id = any (v_users);
  if v_subs is null then return; end if;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('title', p_title, 'body', p_body, 'url', p_url, 'tag', p_kind, 'subs', v_subs),
    headers := jsonb_build_object('content-type', 'application/json', 'x-push-secret', v_secret),
    timeout_milliseconds := 5000
  );
exception when others then
  -- A notification problem must never stop the recording, reply or mark from saving.
  raise warning 'notify failed: %', sqlerrm;
end $$;

create or replace function private.first_name(n text) returns text language sql immutable set search_path = '' as $$
  select split_part(trim(n), ' ', 1)
$$;

-- A parent sent a recording → the class teacher (or the owner and admins if the class has none).
create or replace function private.on_submission_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  s record;
  v_slug text := (select slug from public.centres where id = new.centre_id);
  v_hw text := (select title from public.homework where id = new.homework_id);
  v_to uuid[];
begin
  select st.full_name, c.teacher_id into s
  from public.students st left join public.classes c on c.id = st.class_id
  where st.id = new.student_id;
  if s.teacher_id is not null then
    v_to := array[s.teacher_id];
  else
    select array_agg(m.user_id) into v_to from public.memberships m
    where m.centre_id = new.centre_id and m.role in ('owner', 'admin');
  end if;
  perform private.notify(new.centre_id, v_to, 'recording',
    'New recording from ' || private.first_name(s.full_name),
    coalesce(v_hw, 'Home practice') || ' · tap to listen',
    '/c/' || v_slug || '/practice');
  return new;
end $$;

-- A teacher replied → the child's parents.
create or replace function private.on_submission_reply() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_child text := (select full_name from public.students where id = new.student_id);
  v_slug text := (select slug from public.centres where id = new.centre_id);
  v_teacher text := (select coalesce(m.display_name, 'The teacher') from public.memberships m
                     where m.centre_id = new.centre_id and m.user_id = new.reviewed_by);
  v_to uuid[] := array(select g.user_id from public.guardians g where g.student_id = new.student_id);
  v_body text;
begin
  v_body := case new.verdict when 'good' then 'Good' when 'repeat' then 'Please repeat' else 'Reply' end
    || case when new.stars is not null then ', ' || new.stars || ' of 3 stars' else '' end
    || case when nullif(trim(new.feedback), '') is not null then ': “' || left(trim(new.feedback), 120) || '”' else '' end;
  perform private.notify(new.centre_id, v_to, 'reply',
    coalesce(v_teacher, 'The teacher') || ' replied to ' || private.first_name(v_child) || '’s recording',
    v_body,
    '/c/' || v_slug || '/students/' || new.student_id || '#practice');
  return new;
end $$;

-- New practice set for a class → parents of each child in it.
create or replace function private.on_homework_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_slug text := (select slug from public.centres where id = new.centre_id);
  k record;
begin
  for k in
    select st.id, st.full_name, array_agg(g.user_id) as parents
    from public.students st join public.guardians g on g.student_id = st.id
    where st.class_id = new.class_id and st.status = 'active'
    group by st.id, st.full_name
  loop
    perform private.notify(new.centre_id, k.parents, 'practice',
      'New practice for ' || private.first_name(k.full_name),
      new.title || case when new.due_on is not null then ' · by ' || to_char(new.due_on, 'FMDD Mon') else '' end,
      '/c/' || v_slug || '/students/' || k.id || '#practice');
  end loop;
  return new;
end $$;

-- A teacher recorded where a child reached → the child's parents.
create or replace function private.on_progress_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_child text := (select full_name from public.students where id = new.student_id);
  v_slug text := (select slug from public.centres where id = new.centre_id);
  v_to uuid[] := array(select g.user_id from public.guardians g where g.student_id = new.student_id);
begin
  perform private.notify(new.centre_id, v_to, 'progress',
    private.first_name(v_child) || ' is reading ' || new.book || ', page ' || new.page,
    coalesce('“' || left(nullif(trim(new.note), ''), 140) || '”', 'New progress from the teacher'),
    '/c/' || v_slug || '/students/' || new.student_id || '#progress');
  return new;
end $$;

revoke execute on function private.notify(uuid, uuid[], text, text, text, text) from public;

create trigger notify_submission_insert after insert on public.submissions
  for each row execute function private.on_submission_insert();
create trigger notify_submission_reply after update on public.submissions
  for each row when (old.reviewed_at is null and new.reviewed_at is not null)
  execute function private.on_submission_reply();
create trigger notify_homework_insert after insert on public.homework
  for each row execute function private.on_homework_insert();
create trigger notify_progress_insert after insert on public.progress
  for each row execute function private.on_progress_insert();
