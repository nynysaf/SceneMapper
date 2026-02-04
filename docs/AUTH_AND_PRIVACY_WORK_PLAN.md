# Auth, Privacy & Account Management Work Plan

**Goal:** Migrate to Supabase Auth, close privacy gaps, and add Account screen with password reset, delete account, and daily digest notifications.

**Decisions:**
- Auth: Supabase Auth (built-in password reset, email verification)
- Password reset TTL: Supabase default (1 hour) or 2 hours
- Reset link base: Current base URL (NEXT_PUBLIC_APP_URL)
- Delete account: Option A — maps remain if ≥1 other admin; else warn "X maps will be deleted," suggest adding another admin
- Re-invited users: Keep email in `invited_admin_emails`; they become admin if they sign up with that email
- Daily digest: 11:59 PM ET
- Digest scope: Both nodes and connections
- Scheduler: Vercel Cron (free, daily jobs supported)
- Account route: `/account`
- Email link: Everywhere user email appears (Dashboard, Landing/Home)

---

## Phase 1: Supabase Auth Migration

### 1.1 Enable Supabase Auth & Configure
- Enable Email provider in Supabase Dashboard (Auth → Providers)
- Configure email templates for: Confirm signup, Reset password (use `{{ .ConfirmationURL }}` etc.)
- Set Site URL and Redirect URLs to `https://scenemapper.ca` (and `http://localhost:3000` for dev)
- Optional: Set password reset TTL to 2 hours in Auth settings if desired

### 1.2 Create Supabase Auth Client Helpers
- `lib/supabase-client.ts` — browser client for `@supabase/supabase-js` (creates session)
- `lib/supabase-server.ts` — already exists; add `getSupabaseClient(cookies)` for server components/routes that need to read session from cookies
- Use `@supabase/ssr` for cookie-based session handling (recommended for Next.js)

### 1.3 Auth API Routes (Supabase Auth)
- `POST /api/auth/signup` — `supabase.auth.signUp({ email, password, options: { data: { name } } })`; after signup, apply `invited_admin_emails` → add new user id to `admin_ids` for matching maps
- `POST /api/auth/login` — `supabase.auth.signInWithPassword({ email, password })`; set session cookie from Supabase session
- `POST /api/auth/logout` — `supabase.auth.signOut()`; clear cookies
- `GET /api/auth/session` — return current Supabase user (from cookie/session)
- `POST /api/auth/forgot-password` — `supabase.auth.resetPasswordForEmail(email, { redirectTo })` — redirect to `{baseUrl}/account?reset=true`

### 1.4 Session & User Resolution
- Replace `getSession()` / session cookie with Supabase session (JWT in cookie via `@supabase/ssr`)
- `lib/data.ts`: `getSession()` returns `{ userId: string }` where `userId` is `auth.users.id` (UUID)
- All API routes: get user from Supabase session instead of session cookie
- Update `getUsers()` or replace with: fetch users from `auth.users` + `user_metadata` when needed, or maintain a lightweight `profiles` table synced from auth

### 1.5 User Model Alignment
- `admin_ids` and `collaborator_ids` store Supabase `auth.users.id` (UUID)
- Add `profiles` table (optional): `id` (uuid, PK, FK auth.users), `name` (text), `created_at`, `updated_at` — populated via DB trigger on `auth.users` insert
- Or use `auth.users.raw_user_meta_data->>'name'` for display name

### 1.6 Signup: Password Confirmation
- In Dashboard signup form: add "Confirm password" field
- Validate `password === confirmPassword` before submit
- Show inline error if they don't match

### 1.8 User Migration (One-Time)
- Script or API route `POST /api/admin/migrate-users` (protected by env secret):
  - Read all rows from `public.users`
  - For each: create Supabase Auth user via Admin API (`supabase.auth.admin.createUser` or `inviteUserByEmail`) with a random temporary password
  - Send password reset email to each (`supabase.auth.resetPasswordForEmail`) so they can set a new password
  - Build mapping: old `users.id` → new `auth.users.id`
  - Update `maps.admin_ids` and `maps.collaborator_ids` to use new auth user IDs (replace old IDs with new)
  - Optionally mark migrated users or truncate `public.users` after verification

### 1.9 Deprecate Custom Auth
- Remove `public.users` table usage for auth (keep for read-only reference until migration verified)
- Remove `lib/password.ts` usage for user passwords (keep for collaborator password hashing)
- Remove session cookie logic from `lib/session-cookie.ts` (or repurpose for non-auth only)

---

## Phase 2: Forgot Password Flow

### 2.1 "Forgot password?" Button
- Add button below login form: "Forgot password?"
- On click: show modal/popover asking for email, then call `POST /api/auth/forgot-password` with `{ email }`
- Show success: "If an account exists, we've sent a reset link to that email."

### 2.2 Reset Password Page / Pop-up
- Supabase reset link goes to `{baseUrl}/account?reset=true&token_hash=...` (or use Supabase's built-in callback)
- Supabase handles the token; we need a callback route: `GET /auth/callback` (or similar) that Supabase redirects to after reset
- **Flow:** User clicks link in email → Supabase redirects to our callback → we exchange code for session → redirect to `/account` with `?reset=success`
- On `/account`: if `?reset=success`, show a "Set new password" section (or modal) with:
  - Email (read-only, populated from session)
  - New password
  - Confirm new password
  - Save → `supabase.auth.updateUser({ password })` → redirect to `/dashboard`

*Note: Supabase's default reset flow redirects to a URL we configure. We can set it to `/account?reset=success` and handle the token exchange in a dedicated route if needed. Check Supabase docs for exact flow.*

### 2.3 Auth Callback Route
- `GET /auth/callback` — Next.js route that handles `code` from Supabase OAuth/email confirmation; exchanges for session; redirects to `/account` or `/dashboard`

---

## Phase 3: Privacy Gaps — Map Visibility & Filtering

### 3.1 Enforce `publicView` on Map Access
- **API `GET /api/maps`**: Filter results: return only maps where `public_view = true` **OR** current user's id is in `admin_ids` or `collaborator_ids`
- **API `GET /api/maps/[slug]`**: If `public_view = false`, require user in `admin_ids` or `collaborator_ids`; else 404
- **API `GET /api/maps/[slug]/page`**: Same rule as above
- Requires: all map routes resolve current user from Supabase session; if no session, treat as anonymous (only `public_view = true` maps)

### 3.2 Add `publicView` Toggle to Dashboard
- In map create/edit form: add checkbox "Public map (anyone with the link can view)"
- Default: checked (true)
- Persist to `maps.public_view`

### 3.3 Collaborator Join API
- `POST /api/maps/[slug]/join` — body: `{ password: string }`
- Verify password against `maps.collaborator_password_hash` using `verifyPassword`
- If valid: add current user's id to `maps.collaborator_ids` (if not already); return success
- If invalid: 401 Unauthorized
- **MapExperience**: Replace client-side join logic with call to this API; remove reliance on `collaboratorPassword` from client

---

## Phase 4: Account Screen (`/account`)

### 4.1 Route & Layout
- Create `app/account/page.tsx` — requires auth; redirect to `/dashboard` if not logged in
- Layout: header with back link to Dashboard, title "Account"
- Show user email prominently (from Supabase session)

### 4.2 Make Email Clickable (Dashboard & Home)
- Dashboard: where user email is shown (top right), make it a link → `/account`
- Landing/Home: same — user email links to `/account`

### 4.3 Change Email
- Section: "Email address"
- Show current email; "Change email" button → form with new email + password (for verification)
- On submit: `supabase.auth.updateUser({ email })` — Supabase may require reconfirmation
- Update `invited_admin_emails` / `invited_collaborator_emails` in maps if we're replacing by user id — actually emails are stored separately; when user changes email, we might want to update `invited_*_emails` for maps they admin? Or leave as-is (invited by old email, they're already admin by id). **Decision:** Leave invited emails as historical; user is identified by id.

### 4.4 Change Password
- Section: "Password"
- Form: current password, new password, confirm new password
- On submit: verify current via `signInWithPassword`; then `updateUser({ password })`

### 4.5 Delete Account
- Section: "Delete account"
- Button: "Delete my account"
- **Logic:**
  1. For each map where user is sole admin (`admin_ids.length === 1` and user in `admin_ids`): count them
  2. If any: show confirmation modal: "You are the only admin of X map(s). Deleting your account will permanently delete those maps. Add another admin to those maps if you want to keep them. Continue?"
  3. If none: "Delete your account? This cannot be undone."
  4. On confirm:
     - Delete maps where user is sole admin
     - Remove user from `admin_ids` and `collaborator_ids` of all other maps
     - Keep `invited_admin_emails` / `invited_collaborator_emails` as-is (so if they re-sign up with same email, they become admin again)
     - Delete Supabase Auth user: `supabase.auth.admin.deleteUser(userId)` (requires service role)
- Redirect to `/` after delete; clear session

### 4.6 Email Notifications Section
- Section: "Email notifications"
- Subheading: "Daily digest for maps you admin"
- For each map where current user is in `admin_ids`: show a row with map title + checkbox (default checked)
- Checkbox state stored in new table: `user_map_notification_prefs` (see 5.1)
- "You'll receive an email at the end of each day when public users submit new entries (nodes or connections) for review."
- Save prefs on toggle (debounced or on blur)

---

## Phase 5: Daily Digest Emails

### 5.1 Schema
- New table: `user_map_notification_prefs`
  - `user_id` (uuid, PK) — references auth.users or our profiles
  - `map_id` (uuid, PK) — references maps
  - `enabled` (boolean, default true)
  - `created_at`, `updated_at`
  - Composite PK (user_id, map_id)
- For admins without a row: treat as `enabled = true` (default)

### 5.2 Digest Content
- Runs at 11:59 PM ET (cron: `59 4 * * *` UTC for EST, or `59 3 * * *` for EDT — consider `59 4 * * *` to cover both)
- For each user who has `enabled = true` for at least one map:
  - For each map they admin with `enabled = true`:
    - Count pending nodes + connections where `status = 'pending'` and `created_at >= start of today ET`
    - If count > 0: include in digest
  - Send one email per user with all their maps that had new submissions
  - Email: subject "Scene Mapper: New submissions for review"
  - Body: list each map, count of new nodes, count of new connections, link to map, brief summary (titles of new items)

### 5.3 Digest API & Cron
- `GET /api/cron/daily-digest` — secured by `CRON_SECRET` header (Vercel sets this for cron)
- Logic: query pending nodes/connections created today (ET); group by map; for each map, get admins with prefs enabled; batch emails per user
- `vercel.json`: add cron config:
  ```json
  "crons": [{ "path": "/api/cron/daily-digest", "schedule": "59 4 * * *" }]
  ```
- **Note:** 4:59 UTC ≈ 11:59 PM ET (EST). For EDT (summer), it would be 10:59 PM ET. Acceptable for "end of day."

### 5.4 Resend Integration
- Reuse `lib/invitation-email.ts` pattern; add `sendDailyDigestEmail(to, mapsWithCounts)` or similar
- Use same `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

---

## Phase 6: Cleanup & Testing

### 6.1 Remove Legacy Auth
- Run user migration (1.8) before cutover
- Remove `public.users` table if fully migrated (or keep for read-only reference)
- Remove `/api/auth/login` old impl (replaced by Supabase)
- Remove `/api/users` POST signup (replaced by `/api/auth/signup`)
- Ensure `getUsers()` is no longer used for auth; remove or repurpose for admin-only user listing if needed

### 6.2 Update All Session Consumers
- `Dashboard`, `LandingPage`, `MapExperience`, `MapPage` — all use Supabase session
- `lib/data.ts` — `getSession()` returns Supabase user id
- API routes that need user: use Supabase `getUser()` from cookie

### 6.3 Testing Checklist
- [ ] Signup with password confirmation (mismatch rejected)
- [ ] Login, logout (Supabase Auth)
- [ ] Forgot password → email → reset → new password → login
- [ ] Account: change email, change password
- [ ] Account: delete (sole admin → maps deleted; multi-admin → user removed only)
- [ ] Account: notification prefs save and affect digest
- [ ] Private map (`public_view = false`): anon gets 404; admin/collaborator gets access
- [ ] Collaborator join via password (API)
- [ ] Daily digest: manually trigger cron; verify email content and recipient

---

## Execution Order

| Step | Phase | Description |
|------|-------|-------------|
| 1 | 1.1–1.2 | Enable Supabase Auth, create client helpers |
| 2 | 1.3–1.4 | Auth API routes (signup, login, logout, session, forgot-password) |
| 3 | 1.5–1.6 | User model alignment, password confirmation on signup |
| 3b | 1.8 | User migration: migrate public.users to Supabase Auth, update map IDs, send reset emails |
| 4 | 2.1–2.3 | Forgot password button, reset flow, auth callback |
| 5 | 3.1–3.3 | Map visibility (publicView), join API |
| 6 | 4.1–4.4 | Account screen: layout, email link, change email, change password |
| 7 | 4.5–4.6 | Delete account, notification prefs UI |
| 8 | 5.1–5.4 | Digest schema, API, cron, Resend |
| 9 | 6.1–6.3 | Cleanup, testing |

---

## Resolved Decisions

1. **Existing users migration:** Yes — create Supabase Auth users for each `public.users` row and send password reset email to each so they can set a new password and continue.
2. **Email verification:** No — users can log in immediately after signup.
3. **Daily digest timezone:** 4:59 UTC (≈11:59 PM ET) is acceptable.
4. **Reset flow on /account:** Direct to `/account`. When user lands from reset link, they do NOT need to type current password — the link is the proof. Show "Set new password" + "Confirm new password" only; save via `updateUser({ password })`.