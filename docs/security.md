# Bintang Class — tenancy, roles and database security

Every centre is a tenant. Every tenant table carries `centre_id`, and Postgres Row Level Security (RLS)
decides what each signed-in person can see and change. The browser talks to Supabase directly with
the publishable key, so **RLS is the security boundary** — not the Next.js app.

## Roles

| Role | Who | Can see | Can change |
|---|---|---|---|
| **owner** | Centre founder (one per centre, set by `create_centre`) | Everything in their centre | Centre details, admins, everything an admin can |
| **admin** | Office staff | Everything in their centre | Teachers, parents, classes, students, guardians, invites |
| **teacher** | Ustaz / ustazah | All students, classes, attendance, progress, staff list | Attendance and progress, always in their own name |
| **parent** | Guardian | Only their own children, their attendance and progress | Nothing (read-only) |
| **platform admin** | Bintang Class team (`platform_admins` table, added by service role only) | All centres, CRM | Centre plan/status (suspend, upgrade), CRM. **Cannot read children's records.** |

A person can hold different roles in different centres.

## Rules enforced in the database

- **Isolation:** nobody sees or writes another centre's rows. Signed-out visitors have no table access at all; their only entry point is `invite_info(token)`.
- **Billing:** `plan` and `status` can only be changed by a platform admin or the service role (billing webhooks). Owners cannot upgrade themselves or lift a suspension.
- **Suspension:** when a centre's `status` is `read_only` or `closed`, members can still read but all writes stop.
- **Admins are owner-managed:** only the owner can add, invite, change or remove admins. Nobody can modify the owner row through the API.
- **Integrity:** a student, class, guardian link, attendance mark, progress entry or invite can never point across centres (trigger `private.same_centre_check`). A guardian must be a member of the centre.
- **No impersonation:** `attendance.marked_by` and `progress.by_user` must equal the signed-in user (they default to it).
- **Clean exits:** removing someone from a centre deletes their guardian links and unassigns them from classes, so a removed parent loses access to their child immediately. Members can leave a centre themselves (except the owner).
- **Invites:** single-use, 14-day expiry, bound to an email address. Accepting an invite upgrades an existing role (parent → teacher) but never downgrades.

## Entry points (RPC)

| Function | Caller | Purpose |
|---|---|---|
| `create_centre(name, slug, phone?, city?, display_name?)` | signed in | Creates centre, makes caller owner, opens a CRM account (max 5 owned centres) |
| `invite_info(token)` | anyone | Shows centre name, role and email for the invite landing page |
| `accept_invite(token, display_name?)` | signed in, matching email | Joins centre; links child if it's a parent invite |

Helper functions live in the `private` schema (not exposed over the API).

## Testing

`supabase/tests/rls_test.sql` signs in as owner, admin, teacher, two parents, an outsider, a second
centre's owner, a platform admin and a signed-out visitor, and runs 52 checks. It always rolls back.

```sh
psql "$DATABASE_URL" -f supabase/tests/rls_test.sql 2>&1 | grep "RLS TESTS"
# RLS TESTS PASSED: 52/52
```

Run it after every migration that touches tables or policies.

## Rules for new tables

1. Add `centre_id uuid not null references centres on delete cascade`.
2. `enable row level security`, and write one policy per command (`select`/`insert`/`update`/`delete`) scoped `to authenticated`.
3. Use the `private.*` helpers (`is_member`, `is_staff`, `is_manager`, `is_guardian`, `can_write`) and wrap `auth.uid()` as `(select auth.uid())`.
4. If the table references a student, class or user, add it to `private.same_centre_check`.
5. Revoke from `anon` if Supabase's default grants re-add it.
6. Add checks to `rls_test.sql`.

## Known decisions to revisit

- Teachers can mark attendance for any class in their centre, not only their own. Tighten if centres ask.
- Owner transfer is not built yet (needs a platform-admin or service-role action).
- Progress entries are append-only; corrections are made by adding a new entry.
