# Bintang Class

Multi-tenant SaaS for Quran / mengaji classes and Islamic learning centres in Malaysia.
Each centre gets its own private space with owner, admin, teacher and parent roles, per-centre billing,
and a platform admin with a light CRM.

**Stack:** Supabase (Postgres, Auth, RLS) and Next.js 15 on Vercel (Singapore)

## Run it

```sh
cp .env.example .env.local   # fill in the publishable key from Supabase
npm install
npm run dev                  # http://localhost:3000
```

The app talks to Supabase as the signed-in user with the publishable key only; Row Level Security
decides what each role sees. There is no service-role key in the app.

## Tests

- **Database isolation** (`supabase/tests/rls_test.sql`): 68 checks across every role. Runs in CI on every PR.
- **End-to-end** (`e2e/pilot-flow.spec.ts`): owner, teacher (on a phone) and parent go through the pilot
  journey in real browsers against a local Supabase. Runs in CI on every PR; screenshots are pushed to
  the `e2e-screenshots` branch under `shots/<commit>/`.
  Locally: `supabase start`, point `.env.local` at it, `npm run build && npm start`, then `npx playwright test`.

## Repo layout

```
supabase/
  config.toml   local Supabase (used by CI)
  migrations/   schema, roles and Row Level Security, applied in order
  tests/        rls_test.sql — signs in as every role and checks isolation (68 checks)
app/            Next.js routes: sign-in, /app (centres), /c/<centre>/… (role-aware), /invite/<token>
components/     star mark, star track, forms
lib/            Supabase client, roles, reading levels
e2e/            Playwright pilot journey
docs/
  security.md   tenancy model, role matrix, rules for new tables
.github/workflows/db-isolation.yml   runs the isolation tests on every PR and push to main
```

Product plan: [Mengaji Class App: Product Plan](https://claude.ai/artifact/LmiRNukVYUibXroL5u5xuM)

## Status

Following the product plan's build order:

- [x] **Phase 0, week 1** — tenants, roles, Row Level Security, recordings storage, activity log, isolation test in CI
- [ ] Phase 0 — name and domain, recruit 3 pilot centres (owner actions)
- [x] **Phase 1, part 1** — sign-in, centres, invites (link + WhatsApp), classes, students, Iqra levels, attendance, parent view
- [ ] **Phase 1, part 2** — homework recordings (parent records, teacher listens and replies)
- [ ] **Phase 2, weeks 6–9** — fees and payments, monthly reports, centre plan goes live
- [ ] **Phase 3, weeks 10–14** — paid ustaz checks, payouts, ratings

## Database

Supabase project: `bintangclass-db` (`ytafljclzofjnivahsdt`, Singapore).

Add the first platform admin from the SQL editor after they have signed up once:

```sql
insert into public.platform_admins (user_id)
select id from auth.users where email = 'you@example.com';
```
