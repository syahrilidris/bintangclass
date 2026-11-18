-- Bintang Class: Row Level Security test suite.
--
-- Signs in as every kind of user across two centres and checks what each can see and change.
-- Everything runs inside one DO block that always ends by raising, so the whole run is rolled back
-- and leaves no test data behind. Read the result from the error message:
--   "RLS TESTS PASSED: 41/41"  or  "RLS TESTS FAILED: 3/41 ..." followed by the failing checks.
--
-- Run:  psql "$DATABASE_URL" -f supabase/tests/rls_test.sql 2>&1 | grep -q "RLS TESTS PASSED"

do $test$
declare
  o1 uuid := gen_random_uuid();  -- owner, centre A
  a1 uuid := gen_random_uuid();  -- admin, centre A
  t1 uuid := gen_random_uuid();  -- teacher, centre A
  p1 uuid := gen_random_uuid();  -- parent of s1, centre A
  p2 uuid := gen_random_uuid();  -- parent at A, not yet linked to any child
  x  uuid := gen_random_uuid();  -- signed in, belongs nowhere
  o2 uuid := gen_random_uuid();  -- owner, centre B
  pa uuid := gen_random_uuid();  -- platform admin
  ca uuid; cb uuid;               -- centres
  c1 uuid; cb1 uuid;              -- classes
  s1 uuid; s2 uuid; sb uuid;      -- students
  inv_token text;
  n int;
  total int := 0;
  failed text[] := '{}';
begin
  -- helpers (temporary, rolled back with everything else)
  create function pg_temp.sign_in(u uuid) returns void language plpgsql as $f$
  begin
    perform set_config('role', 'postgres', true);
    if u is null then
      perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
      perform set_config('role', 'anon', true);
    else
      perform set_config('request.jwt.claims', json_build_object('sub', u::text, 'role', 'authenticated')::text, true);
      perform set_config('role', 'authenticated', true);
    end if;
  end $f$;
  create function pg_temp.sign_out() returns void language plpgsql as $f$
  begin
    perform set_config('role', 'postgres', true);
    perform set_config('request.jwt.claims', '', true);
  end $f$;
  -- rows affected, or -1 if the statement raised
  create function pg_temp.run(stmt text) returns int language plpgsql as $f$
  declare n int;
  begin
    execute stmt; get diagnostics n = row_count; return n;
  exception when others then return -1;
  end $f$;
  create function pg_temp.cnt(q text) returns int language plpgsql as $f$
  declare n int;
  begin
    execute 'select count(*) from (' || q || ') q' into n; return n;
  exception when others then return -1;
  end $f$;
  grant execute on all functions in schema pg_temp to anon, authenticated;

  -- users
  insert into auth.users (id, instance_id, aud, role, email)
  select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', e
  from (values (o1, 'o1@test.bintang'), (a1, 'a1@test.bintang'), (t1, 't1@test.bintang'), (p1, 'p1@test.bintang'),
               (p2, 'p2@test.bintang'), (x, 'x@test.bintang'), (o2, 'o2@test.bintang'), (pa, 'pa@test.bintang')) v (u, e);
  insert into public.platform_admins (user_id) values (pa);

  -- ===== setup through the real API paths =====
  perform pg_temp.sign_in(o1);
  ca := public.create_centre('Test Centre A', 'test-a-' || substr(md5(random()::text), 1, 8), '0123456789', 'Shah Alam', 'Ustaz O');
  insert into public.memberships (centre_id, user_id, role) values (ca, a1, 'admin'), (ca, t1, 'teacher'), (ca, p1, 'parent'), (ca, p2, 'parent');
  insert into public.classes (centre_id, name, teacher_id) values (ca, 'Iqra Pagi', t1) returning id into c1;
  insert into public.students (centre_id, full_name, class_id) values (ca, 'Aisyah', c1) returning id into s1;
  insert into public.students (centre_id, full_name, class_id) values (ca, 'Umar', c1) returning id into s2;
  insert into public.guardians (centre_id, student_id, user_id) values (ca, s1, p1);

  perform pg_temp.sign_in(o2);
  cb := public.create_centre('Test Centre B', 'test-b-' || substr(md5(random()::text), 1, 8));
  insert into public.classes (centre_id, name) values (cb, 'Tahfiz') returning id into cb1;
  insert into public.students (centre_id, full_name, class_id) values (cb, 'Hafiz', cb1) returning id into sb;
  perform pg_temp.sign_out();

  -- ===== tenant isolation =====
  perform pg_temp.sign_in(null);
  total := total + 1; if pg_temp.cnt('select * from public.centres') > 0 then failed := array_append(failed, 'anon sees centres'::text); end if;
  total := total + 1; if pg_temp.cnt('select * from public.students') > 0 then failed := array_append(failed, 'anon sees students'::text); end if;

  perform pg_temp.sign_in(x);
  total := total + 1; if pg_temp.cnt('select * from public.centres') <> 0 then failed := array_append(failed, 'outsider sees centres'::text); end if;
  total := total + 1; if pg_temp.cnt('select * from public.students') <> 0 then failed := array_append(failed, 'outsider sees students'::text); end if;
  total := total + 1; if pg_temp.run(format('insert into public.platform_admins (user_id) values (%L)', x)) > 0 then failed := array_append(failed, 'outsider made self platform admin'::text); end if;
  total := total + 1; if pg_temp.run(format('insert into public.memberships (centre_id, user_id, role) values (%L, %L, %L)', ca, x, 'parent')) > 0 then failed := array_append(failed, 'outsider joined centre without invite'::text); end if;

  perform pg_temp.sign_in(o2);
  total := total + 1; if pg_temp.cnt(format('select * from public.students where centre_id = %L', ca)) <> 0 then failed := array_append(failed, 'owner B sees students of A'::text); end if;
  total := total + 1; if pg_temp.run(format('insert into public.students (centre_id, full_name) values (%L, %L)', ca, 'Intruder')) > 0 then failed := array_append(failed, 'owner B inserted student into A'::text); end if;
  total := total + 1; if pg_temp.run(format('update public.students set full_name = %L where centre_id = %L', 'Hacked', ca)) > 0 then failed := array_append(failed, 'owner B updated students of A'::text); end if;
  total := total + 1; if pg_temp.run(format('insert into public.students (centre_id, full_name, class_id) values (%L, %L, %L)', cb, 'Mixed', c1)) > 0 then failed := array_append(failed, 'student in B linked to class of A'::text); end if;

  -- ===== parents =====
  perform pg_temp.sign_in(p1);
  total := total + 1; if pg_temp.cnt('select * from public.students') <> 1 then failed := array_append(failed, 'parent does not see exactly own child'::text); end if;
  total := total + 1; if pg_temp.cnt('select * from public.memberships') <> 1 then failed := array_append(failed, 'parent sees other members'::text); end if;
  total := total + 1; if pg_temp.cnt('select * from public.invites') <> 0 then failed := array_append(failed, 'parent sees invites'::text); end if;
  total := total + 1; if pg_temp.run(format('update public.students set page = 99 where id = %L', s1)) > 0 then failed := array_append(failed, 'parent edited own child record'::text); end if;
  total := total + 1; if pg_temp.run(format('insert into public.attendance (centre_id, student_id, day, present, marked_by) values (%L, %L, current_date, true, %L)', ca, s1, p1)) > 0 then failed := array_append(failed, 'parent marked attendance'::text); end if;
  total := total + 1; if pg_temp.run(format('insert into public.guardians (centre_id, student_id, user_id) values (%L, %L, %L)', ca, s2, p1)) > 0 then failed := array_append(failed, 'parent linked self to another child'::text); end if;

  perform pg_temp.sign_in(p2);
  total := total + 1; if pg_temp.cnt('select * from public.students') <> 0 then failed := array_append(failed, 'unlinked parent sees students'::text); end if;

  -- ===== teachers =====
  perform pg_temp.sign_in(t1);
  total := total + 1; if pg_temp.cnt(format('select * from public.students where centre_id = %L', ca)) <> 2 then failed := array_append(failed, 'teacher cannot see centre students'::text); end if;
  total := total + 1; if pg_temp.run(format('insert into public.attendance (centre_id, class_id, student_id, day, present, marked_by) values (%L, %L, %L, current_date, true, %L)', ca, c1, s1, t1)) <> 1 then failed := array_append(failed, 'teacher cannot mark attendance'::text); end if;
  total := total + 1; if pg_temp.run(format('insert into public.attendance (centre_id, student_id, day, present, marked_by) values (%L, %L, current_date, true, %L)', ca, s2, o1)) > 0 then failed := array_append(failed, 'teacher marked attendance in someone else''s name'::text); end if;
  total := total + 1; if pg_temp.run(format('insert into public.progress (centre_id, student_id, book, page, by_user) values (%L, %L, %L, 5, %L)', ca, s1, 'Iqra 1', t1)) <> 1 then failed := array_append(failed, 'teacher cannot record progress'::text); end if;
  total := total + 1; if pg_temp.run(format('insert into public.students (centre_id, full_name) values (%L, %L)', ca, 'New')) > 0 then failed := array_append(failed, 'teacher added student'::text); end if;
  total := total + 1; if pg_temp.run(format('insert into public.attendance (centre_id, student_id, day, present, marked_by) values (%L, %L, current_date, true, %L)', cb, sb, t1)) > 0 then failed := array_append(failed, 'teacher marked attendance at other centre'::text); end if;
  total := total + 1; if pg_temp.cnt('select * from public.invites') <> 0 then failed := array_append(failed, 'teacher sees invite tokens'::text); end if;

  -- progress moved the student's book/page
  perform pg_temp.sign_in(p1);
  total := total + 1; if pg_temp.cnt(format('select * from public.students where id = %L and page = 5', s1)) <> 1 then failed := array_append(failed, 'progress did not update student page'::text); end if;

  -- ===== admins =====
  perform pg_temp.sign_in(a1);
  total := total + 1; if pg_temp.run(format('update public.centres set name = %L where id = %L', 'Renamed by admin', ca)) > 0 then failed := array_append(failed, 'admin renamed centre'::text); end if;
  total := total + 1; if pg_temp.run(format('update public.memberships set role = %L where centre_id = %L and user_id = %L', 'owner', ca, a1)) > 0 then failed := array_append(failed, 'admin made self owner'::text); end if;
  total := total + 1; if pg_temp.run(format('delete from public.memberships where centre_id = %L and user_id = %L', ca, o1)) > 0 then failed := array_append(failed, 'admin removed owner'::text); end if;
  total := total + 1; if pg_temp.run(format('update public.memberships set role = %L where centre_id = %L and user_id = %L', 'admin', ca, t1)) > 0 then failed := array_append(failed, 'admin promoted teacher to admin'::text); end if;
  total := total + 1; if pg_temp.run(format('insert into public.invites (centre_id, email, role) values (%L, %L, %L)', ca, 'new@test.bintang', 'admin')) > 0 then failed := array_append(failed, 'admin invited another admin'::text); end if;
  total := total + 1; if pg_temp.run(format('insert into public.invites (centre_id, email, role) values (%L, %L, %L)', ca, 'newt@test.bintang', 'teacher')) <> 1 then failed := array_append(failed, 'admin cannot invite teacher'::text); end if;
  total := total + 1; if pg_temp.run(format('insert into public.students (centre_id, full_name, class_id) values (%L, %L, %L)', ca, 'Zahra', c1)) <> 1 then failed := array_append(failed, 'admin cannot add student'::text); end if;

  -- ===== owners =====
  perform pg_temp.sign_in(o1);
  total := total + 1; if pg_temp.run(format('update public.centres set name = %L where id = %L', 'Test Centre A2', ca)) <> 1 then failed := array_append(failed, 'owner cannot rename centre'::text); end if;
  total := total + 1; if pg_temp.run(format('update public.centres set plan = %L where id = %L', 'centre', ca)) > 0 then failed := array_append(failed, 'owner upgraded own plan without paying'::text); end if;
  total := total + 1; if pg_temp.run(format('update public.centres set status = %L where id = %L', 'closed', ca)) > 0 then failed := array_append(failed, 'owner changed own billing status'::text); end if;
  total := total + 1; if pg_temp.run(format('insert into public.guardians (centre_id, student_id, user_id) values (%L, %L, %L)', ca, s2, x)) > 0 then failed := array_append(failed, 'owner linked a non-member as guardian'::text); end if;
  total := total + 1; if pg_temp.run(format('insert into public.invites (centre_id, email, role, student_id) values (%L, %L, %L, %L)', ca, 'p@test.bintang', 'parent', sb)) > 0 then failed := array_append(failed, 'invite linked to other centre''s student'::text); end if;
  total := total + 1; if pg_temp.cnt('select * from public.crm_accounts') <> 0 then failed := array_append(failed, 'owner sees CRM'::text); end if;

  -- removing a parent from the centre also removes their access to the child
  total := total + 1; if pg_temp.run(format('delete from public.memberships where centre_id = %L and user_id = %L', ca, p1)) <> 1 then failed := array_append(failed, 'owner cannot remove parent'::text); end if;
  perform pg_temp.sign_in(p1);
  total := total + 1; if pg_temp.cnt('select * from public.students') <> 0 then failed := array_append(failed, 'removed parent still sees child'::text); end if;
  perform pg_temp.sign_in(o1);

  -- invite flow: owner invites p2 as parent of s2
  insert into public.invites (centre_id, email, role, student_id) values (ca, 'p2@test.bintang', 'parent', s2) returning token into inv_token;
  perform pg_temp.sign_in(x);
  total := total + 1; if pg_temp.run(format('select public.accept_invite(%L)', inv_token)) <> -1 then failed := array_append(failed, 'invite accepted by wrong email'::text); end if;
  perform pg_temp.sign_in(null);
  total := total + 1; if pg_temp.cnt(format('select * from public.invite_info(%L)', inv_token)) <> 1 then failed := array_append(failed, 'invite_info not readable before sign-in'::text); end if;
  perform pg_temp.sign_in(p2);
  total := total + 1; if pg_temp.run(format('select public.accept_invite(%L)', inv_token)) = -1 then failed := array_append(failed, 'invitee cannot accept'::text); end if;
  total := total + 1; if pg_temp.cnt('select * from public.students') <> 1 then failed := array_append(failed, 'parent does not see child after invite'::text); end if;
  total := total + 1; if pg_temp.run(format('select public.accept_invite(%L)', inv_token)) <> -1 then failed := array_append(failed, 'invite reusable'::text); end if;

  -- ===== platform admin =====
  perform pg_temp.sign_in(pa);
  total := total + 1; if pg_temp.cnt(format('select * from public.centres where id in (%L, %L)', ca, cb)) <> 2 then failed := array_append(failed, 'platform admin cannot see centres'::text); end if;
  total := total + 1; if pg_temp.cnt(format('select * from public.crm_accounts where centre_id in (%L, %L)', ca, cb)) <> 2 then failed := array_append(failed, 'sign-ups missing from CRM'::text); end if;
  total := total + 1; if pg_temp.cnt(format('select * from public.students where centre_id = %L', ca)) <> 0 then failed := array_append(failed, 'platform admin reads children''s records'::text); end if;
  total := total + 1; if pg_temp.run(format('update public.centres set status = %L where id = %L', 'read_only', ca)) <> 1 then failed := array_append(failed, 'platform admin cannot suspend centre'::text); end if;

  perform pg_temp.sign_in(o1);
  total := total + 1; if pg_temp.run(format('update public.centres set status = %L where id = %L', 'active', ca)) > 0 then failed := array_append(failed, 'owner lifted own suspension'::text); end if;

  -- read-only centre: reads still work, writes stop
  perform pg_temp.sign_in(t1);
  total := total + 1; if pg_temp.cnt(format('select * from public.students where centre_id = %L', ca)) < 2 then failed := array_append(failed, 'read-only centre hides data'::text); end if;
  total := total + 1; if pg_temp.run(format('insert into public.attendance (centre_id, student_id, day, present, marked_by) values (%L, %L, current_date - 1, true, %L)', ca, s2, t1)) > 0 then failed := array_append(failed, 'read-only centre still accepts writes'::text); end if;

  perform pg_temp.sign_out();
  if array_length(failed, 1) is null then
    raise exception 'RLS TESTS PASSED: %/%', total, total;
  else
    raise exception 'RLS TESTS FAILED: %/% failed: %', array_length(failed, 1), total, array_to_string(failed, '; ');
  end if;
end
$test$;
