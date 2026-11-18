# Bintang Class — tenancy, roles and database security

Every centre is a tenant. Every tenant table carries `centre_id`, and Postgres Row Level Security (RLS)
decides what each signed-in person can see and change. The browser talks to Supabase directly with
the publishable key, so **RLS is the security boundary** — not the Next.js app.

## Roles

| Role | Who | Can see | Can change |
|---|---|---|---|
| **owner** | Centre founder (one per centre, set by `create_centre`) | Everything in their centre, including the activity log | Centre details, admins, everything an admin can |
| **admin** | Office staff | Everything in their centre, including the activity log | Teachers, parents, classes, students, guardians, invites |
| **teacher** | Ustaz / ustazah | Students in classes they teach, with their attendance, progress and recordings; the class list and staff list | Attendance, progress and recordings for those students, always in their own name |
| **parent** | Guardian | Only their own children, their attendance, progress and recordings | Upload their own child's practice recordings |
| **platform admin** | Bintang Class team (`platform_admins` table, added by service role only) | All centres, CRM | Centre plan/status (suspend, upgrade), CRM. **Cannot read children's records, recordings or the activity log.** |

A person can hold different roles in different centres.

## Rules enforced in the database

- **Isolation:** nobody sees or writes another centre's rows. Signed-out visitors have no table access at all; their only entry point is `invite_info(token)`.
- **Billing:** `plan` and `status` can only be changed by a platform admin or the service role (billing webhooks). Owners cannot upgrade themselves or lift a suspension.
- **Suspension:** when a centre's `status` is `read_only` or `closed`, members can still read but all writes stop.
- **Admins are owner-managed:** only the owner can add, invite, change or remove admins. Nobody can modify the owner row through the API.
- **Integrity:** a student, class, guardian link, attendance mark, progress entry or invite can never point across centres (trigger `private.same_centre_check`). A guardian must be a member of the centre.
- **No impersonation:** `attendance.marked_by` and `progress.by_user` must equal the signed-in user (they default to it).
- **Recordings:** private bucket `recordings`, path `<centre_id>/<student_id>/<file>`. The path must match a real student of that centre; read and upload follow the same rules as the student's record. Files are never overwritten (no update policy). Owners/admins can delete any recording in their centre; others only their own uploads. Audio only, 15 MB max.
- **Activity log:** inserts, updates and deletes on centres, memberships, classes, students, guardians and invites are written to `activity_log` with who did it and which fields changed. Only the trigger can write; only the centre's owner and admins can read. Invite tokens are stripped. Attendance and progress aren't logged because each row already records who wrote it.
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
centre's owner, a platform admin and a signed-out visitor, and runs 68 checks across tables and
recordings. It always rolls back.

GitHub Actions (`.github/workflows/db-isolation.yml`) runs it on every pull request and every push to
`main` against a fresh local Supabase built from the migrations. Make it a required check on `main`
so a leak blocks the merge, and so the deploy.

```sh
psql "$DATABASE_URL" -f supabase/tests/rls_test.sql 2>&1 | grep "RLS TESTS"
# RLS TESTS PASSED: 68/68
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

- Owner transfer is not built yet (needs a platform-admin or service-role action).
- Progress entries are append-only; corrections are made by adding a new entry.
- Still to build from the plan: centre data export and centre deletion (PDPA), and owner-approved support access for the platform admin.
