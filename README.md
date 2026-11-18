# Bintang Class

Multi-tenant SaaS for Quran / mengaji classes and Islamic learning centres in Malaysia.
Each centre gets its own private space with owner, admin, teacher and parent roles, per-centre billing,
and a platform admin with a light CRM.

**Stack:** Supabase (Postgres + Auth + RLS) · Next.js on Vercel

## Repo layout

```
supabase/
  migrations/   schema, roles and Row Level Security, applied in order
  tests/        rls_test.sql — signs in as every role and checks isolation (52 checks)
docs/
  security.md   tenancy model, role matrix, rules for new tables
```

## Status

- [x] Week 1 — centres, roles, database security
- [ ] App shell: sign-in, create centre, invite + accept, role-aware navigation
- [ ] Classes, students, attendance, progress
- [ ] Parent view
- [ ] Billing and platform admin CRM

## Database

Supabase project: `bintangclass-db` (`ytafljclzofjnivahsdt`, Singapore).

Add the first platform admin from the SQL editor after they have signed up once:

```sql
insert into public.platform_admins (user_id)
select id from auth.users where email = 'you@example.com';
```
