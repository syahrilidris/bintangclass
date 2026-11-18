# Bintang Class

Multi-tenant SaaS for Quran / mengaji classes and Islamic learning centres in Malaysia.
Each centre gets its own private space with owner, admin, teacher and parent roles, per-centre billing,
and a platform admin with a light CRM.

**Stack:** Supabase (Postgres + Auth + RLS) · Next.js on Vercel

## Repo layout

```
supabase/
  config.toml   local Supabase (used by CI)
  migrations/   schema, roles and Row Level Security, applied in order
  tests/        rls_test.sql — signs in as every role and checks isolation (68 checks)
docs/
  security.md   tenancy model, role matrix, rules for new tables
.github/workflows/db-isolation.yml   runs the isolation tests on every PR and push to main
```

Product plan: [Mengaji Class App: Product Plan](https://claude.ai/artifact/LmiRNukVYUibXroL5u5xuM)

## Status

Following the product plan's build order:

- [x] **Phase 0, week 1** — tenants, roles, Row Level Security, recordings storage, activity log, isolation test in CI
- [ ] Phase 0 — name and domain, recruit 3 pilot centres (owner actions)
- [ ] **Phase 1, weeks 2–5 (free pilot)** — classes and students, levels, attendance, homework recordings, parent view
- [ ] **Phase 2, weeks 6–9** — fees and payments, monthly reports, centre plan goes live
- [ ] **Phase 3, weeks 10–14** — paid ustaz checks, payouts, ratings

## Database

Supabase project: `bintangclass-db` (`ytafljclzofjnivahsdt`, Singapore).

Add the first platform admin from the SQL editor after they have signed up once:

```sql
insert into public.platform_admins (user_id)
select id from auth.users where email = 'you@example.com';
```
