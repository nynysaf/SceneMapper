# Before First Run — Complete Setup Guide

This guide walks you through everything you need to do before SceneMapper works with Supabase Auth, email, and the full backend. Follow the steps in order.

---

## What You’ll Set Up

| Item | Purpose |
|------|---------|
| **Supabase project** | Database and user accounts |
| **Environment variables** | Tell the app where to connect and which keys to use |
| **Supabase Auth settings** | Enable email signup/login, configure password reset |
| **Supabase redirect URLs** | Let password reset links open your app |
| **Database migrations** | Add tables for notification preferences, etc. |
| **Resend (optional)** | Send invitation and digest emails |
| **User migration (optional)** | Move old users to Supabase Auth |

---

## Part 1: Create or Open Your Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. Either:
   - **New project:** Click **New Project**, pick an organization, name it (e.g. "SceneMapper"), choose a region, set a database password, then **Create**.
   - **Existing project:** Select your project from the list.
3. Wait for the project to finish initializing (green “Active” status).

---

## Part 2: Copy Environment Variables

### 2.1 Where to Get the Keys

1. In the Supabase dashboard, open your project.
2. Click **Settings** (gear icon in the left sidebar).
3. Click **API** under “Project Settings”.
4. You’ll see:

   - **Project URL** — e.g. `https://abcdefgh.supabase.co`
   - **Project API keys**
     - **anon** (public) — safe for the browser
     - **service_role** — secret, server-only

### 2.2 Create `.env.local` in Your Project

1. In your project folder, find `.env.example`.
2. Copy it to a new file named `.env.local`:
   - Windows: Right‑click `.env.example` → Copy → Paste → Rename to `.env.local`
   - Or in terminal: `copy .env.example .env.local`
3. Open `.env.local` in a text editor.

### 2.3 Fill In the Supabase Values

Replace the placeholders with the real values:

| Variable | Where to Get It | Example |
|----------|-----------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (from Supabase API settings) | `https://abcdefgh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon** key (the long string) | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_URL` | Same as Project URL | `https://abcdefgh.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** key (the secret one) | `eyJhbGciOiJIUzI1NiIs...` |

**Important:** Do **not** share or commit `.env.local` or the `service_role` key. It is added to `.gitignore` so it stays local.

### 2.4 Other Variables

- **`NEXT_PUBLIC_USE_BACKEND`** — Set to `true` so the app uses Supabase instead of browser storage.
- **`NEXT_PUBLIC_APP_URL`** — For local dev use `http://localhost:3000`; for production use your real URL (e.g. `https://scenemapper.ca`).

---

## Part 3: Configure Supabase Auth

### 3.1 Enable Email Provider

1. In Supabase, go to **Authentication** → **Providers**.
2. Find **Email** and make sure it is **enabled** (toggle on).
3. Click **Email** to open its settings.

### 3.2 Turn Off “Confirm Email”

1. In the Email provider settings, find **“Confirm email”**.
2. Turn it **OFF**.
   - **Why:** With it on, users must click a link before they can log in. We want them to use the app right after signup.
3. Leave **“Secure email change”** as default (or enable if you prefer).
4. Click **Save** if there is a Save button.

### 3.3 Set Redirect URLs

These are needed so Supabase can send users back to your app after actions like password reset.

1. Go to **Authentication** → **URL Configuration**.
2. Set **Site URL**:
   - Local dev: `http://localhost:3000`
   - Production: `https://scenemapper.ca` (or your deployed URL)
3. Under **Redirect URLs**, add these (one per line or comma‑separated, depending on the UI):
   - `http://localhost:3000/account`
   - `http://localhost:3000/**`
   - `https://scenemapper.ca/account` (if using production)
   - `https://scenemapper.ca/**` (if using production)
4. Replace `scenemapper.ca` with your actual domain if different.
5. Save.

**What `**` means:** It allows any path under that domain (e.g. `/maps/xyz`), which Supabase may use for some flows.

---

## Part 4: Run Database Migrations

Migrations create or update tables (e.g. notification preferences). They must be run in order.

### 4.1 Which Migrations to Run

In the `supabase/migrations/` folder you have files like:

- `20250129000001_initial_schema.sql` — users, maps, nodes
- `20250130000001_connections.sql` — connections table
- `20250130000002_invitation_emails.sql` — invitation email columns
- `20250130000003_maps_display_options.sql` — display options
- `20250131000001_nodes_allow_region.sql` — region node type
- `20250201000001_map_icon.sql` — map icon
- `20250204000001_user_map_notification_prefs.sql` — notification preferences

### 4.2 How to Run Them

1. In Supabase, go to **SQL Editor**.
2. Click **New query**.
3. For each migration file:
   - Open the `.sql` file in your project (e.g. in VS Code).
   - Copy its full contents.
   - Paste into the Supabase SQL Editor.
   - Click **Run** (or press Ctrl+Enter).
4. Run them in this order (by filename):
   - `20250129000001_initial_schema.sql` first
   - Then the rest in numeric order: `20250130...`, `20250131...`, `20250201...`, `20250204...`.
5. If a migration fails with “already exists”, you may have run it before — skip that one and continue.
6. Check **Table Editor** to confirm tables exist (especially `user_map_notification_prefs`).

---

## Part 5: Resend (Optional — for Emails)

Used for invitation emails and daily digest emails.

### 5.1 Create a Resend Account

1. Go to [resend.com](https://resend.com) and sign up.
2. Verify your email.

### 5.2 Get an API Key

1. In Resend, go to **API Keys**.
2. Click **Create API Key**, name it (e.g. “SceneMapper”).
3. Copy the key (it starts with `re_`).
4. Add to `.env.local`:
   ```
   RESEND_API_KEY=re_your_key_here
   RESEND_FROM_EMAIL=onboarding@resend.dev
   ```
   - For testing, `onboarding@resend.dev` works without domain verification.
   - For production, use a verified domain and update `RESEND_FROM_EMAIL`.

### 5.3 If You Skip Resend

The app still works. Invitation emails will not be sent, and the daily digest will not run. Everything else (signup, login, maps, etc.) will work.

---

## Part 6: Run the App Locally

1. In a terminal, from your project folder:
   ```powershell
   npm install
   npm run dev
   ```
2. Open [http://localhost:3000](http://localhost:3000).
3. Try:
   - Create account (with password confirmation)
   - Log in
   - Create a map
   - Log out and log back in

If signup or login fails, double‑check:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set and correct
- Email provider is enabled and “Confirm email” is off
- No typos in `.env.local`

---

## Part 7: Production (Vercel) Environment Variables

When you deploy to Vercel, add the same variables there:

1. In Vercel: **Project** → **Settings** → **Environment Variables**.
2. Add each variable from `.env.local` that the app needs, including:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_USE_BACKEND` = `true`
   - `NEXT_PUBLIC_APP_URL` = your production URL (e.g. `https://scenemapper.ca`)
   - `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (if using emails)
   - `CRON_SECRET` (for the daily digest — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` or `openssl rand -hex 32`)

Set each for **Production** (and optionally Preview if you use preview deploys).

---

## Part 8: Migrating Existing Users (If You Have Them)

Only needed if you already have users in the old `public.users` table and want to move them to Supabase Auth.

### 8.1 Generate a Migration Secret

Open a terminal in your project folder and run one of these:

**Option A — Node.js (works on Windows, Mac, Linux):**

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option B — OpenSSL (Mac/Linux, or if you have it installed on Windows):**

```powershell
openssl rand -hex 32
```

Copy the output (a long hex string like `a1b2c3d4e5f6...`). You will use this as `MIGRATION_SECRET`.

### 8.2 Add the Secret to Your Environment

1. Open `.env.local` in your project.
2. Add a new line (replace with your actual secret from step 8.1):

   ```
   MIGRATION_SECRET=paste_your_hex_string_here
   ```

3. Save the file.
4. If you deploy to Vercel, also add `MIGRATION_SECRET` in **Project** → **Settings** → **Environment Variables**.

### 8.3 Start Your App (If Not Already Running)

The migration endpoint must be reachable. In a terminal:

```powershell
npm run dev
```

Wait until you see something like “Ready” or “Local: http://localhost:3000”.

### 8.4 Run the Migration

Open a **new** terminal (keep the dev server running in the first one) and run **one** of these:

**Option A — Using curl (if available):**

```powershell
curl -X POST http://localhost:3000/api/admin/migrate-users -H "Authorization: Bearer YOUR_SECRET_HERE"
```

Replace `YOUR_SECRET_HERE` with the hex string from step 8.1.

**Option B — Using PowerShell (Windows):**

```powershell
$secret = "YOUR_SECRET_HERE"
Invoke-WebRequest -Uri "http://localhost:3000/api/admin/migrate-users" -Method POST -Headers @{ Authorization = "Bearer $secret" }
```

Replace `YOUR_SECRET_HERE` with the hex string from step 8.1.

**Example (with a fake secret):**

```powershell
curl -X POST http://localhost:3000/api/admin/migrate-users -H "Authorization: Bearer a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
```

### 8.5 Check the Response

- **Success:** You should see JSON like `{"ok":true,"migrated":3,"message":"Migrated 3 users. Password reset emails sent."}`.
- **Error 401 Unauthorized:** The `MIGRATION_SECRET` in `.env.local` does not match the one in the `Authorization` header. Check for typos or extra spaces.
- **Other errors:** Check the terminal where `npm run dev` is running for more details.

### 8.6 What Happens

1. Each user in `public.users` is created in Supabase Auth.
2. `admin_ids` and `collaborator_ids` on maps are updated to the new auth user IDs.
3. Each user gets a password reset email.
4. They must click the link and set a new password before they can log in again.

---

## Part 9: Daily Digest Cron (Production)

The daily digest email runs via a Vercel cron job.

### 9.1 Set CRON_SECRET

1. Generate a secret (Node.js works on Windows):  
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Add it in Vercel as `CRON_SECRET`.
3. Vercel will send this when it calls the cron endpoint, so only Vercel can trigger it.

### 9.2 Verify Cron in vercel.json

The project’s `vercel.json` should include:

```json
"crons": [
  {
    "path": "/api/cron/daily-digest",
    "schedule": "59 4 * * *"
  }
]
```

This runs at 4:59 UTC daily (about 11:59 PM Eastern).

### 9.3 Manual Test

To test the endpoint (e.g. from your machine):

```powershell
curl -X GET https://your-domain.com/api/cron/daily-digest -H "Authorization: Bearer YOUR_CRON_SECRET"
```

You should get a JSON response. If you have no pending submissions, it will still return `ok: true`.

---

## Checklist

Before considering setup complete, confirm:

- [ ] Supabase project created and active
- [ ] `.env.local` exists with all required Supabase variables
- [ ] `NEXT_PUBLIC_USE_BACKEND=true`
- [ ] Email provider enabled, “Confirm email” off
- [ ] Redirect URLs set (including `/account` and `/**`)
- [ ] All migrations run in order
- [ ] App runs locally and signup/login work
- [ ] (Optional) Resend configured for invitation emails
- [ ] (Optional) Existing users migrated
- [ ] (Production) Vercel env vars set, including `CRON_SECRET` if using daily digest

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| Signup fails | Supabase Email provider on, “Confirm email” off, anon key correct in `.env.local` |
| Password reset link goes nowhere | Redirect URLs include `your-domain.com/account` |
| “Unauthorized” on cron | `CRON_SECRET` set in Vercel and matches the one you send in the `Authorization` header |
| Migration fails | `MIGRATION_SECRET` set, `public.users` exists, Supabase service role key is correct |
| Invitation emails not sent | `RESEND_API_KEY` set, `RESEND_FROM_EMAIL` valid (or `onboarding@resend.dev` for testing) |
