# Phase 2: Supabase schema and environment

This doc covers creating the Supabase project, applying the schema, and setting env vars so Phase 3 (API routes + data layer) can connect.

## 1. Create a Supabase project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and sign in.
2. **New project** → choose org, name (e.g. `scene-mapper`), database password, region.
3. Wait for the project to be ready.

## 2. Apply the schema

**Option A – SQL Editor (simplest)**

1. In the project: **SQL Editor** → **New query**.
2. Open `supabase/migrations/20250129000001_initial_schema.sql` from this repo.
3. Paste the full contents into the editor and run it.
4. Confirm in **Table Editor** that `users`, `maps`, and `nodes` exist.

**Option B – Supabase CLI**

If you use the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase init   # if not already
supabase link   # link to your project
supabase db push
```

## 3. Get API credentials

1. In the project: **Project Settings** (gear) → **API**.
2. Copy:
   - **Project URL** → use as `SUPABASE_URL`.
   - **service_role** key (under "Project API keys") → use as `SUPABASE_SERVICE_ROLE_KEY`.

**Important:** The `service_role` key bypasses Row Level Security. Use it only in server-side code (Next.js API routes). Never expose it to the client or commit it.

## 4. Set environment variables locally

1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```
2. Edit `.env.local` and set:
   - `NEXT_PUBLIC_APP_URL` – e.g. `http://localhost:3000` for local dev.
   - `SUPABASE_URL` – your Project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` – your service_role key.

Do not commit `.env.local`. It is listed in `.gitignore`.

## 5. Verify

- Tables exist in Supabase (Table Editor).
- `.env.local` has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set.

Next: **Phase 3** – add `lib/supabase-server.ts`, wire API routes to these tables, and add the `NEXT_PUBLIC_USE_BACKEND` switch in `lib/data.ts`.
