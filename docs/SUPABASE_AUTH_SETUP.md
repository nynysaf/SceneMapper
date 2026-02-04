# Supabase Auth Setup

SceneMapper uses Supabase Auth for signup, login, and password reset. Complete these steps before using the app with the backend.

> **New to this?** For a full step-by-step guide including environment variables, Auth settings, migrations, and troubleshooting, see [BEFORE_FIRST_RUN.md](./BEFORE_FIRST_RUN.md).

## 1. Environment Variables

Add to `.env.local` (and Vercel for production):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Get these from [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Settings** → **API**:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon** (public) key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Auth Provider Settings

In Supabase Dashboard → **Authentication** → **Providers** → **Email**:

1. **Enable Email provider** – ensure it's on
2. **Confirm email** – turn **OFF** so users can log in immediately after signup (per product decision)
3. **Secure email change** – optional; leave default

## 3. Redirect URLs

In Supabase Dashboard → **Authentication** → **URL Configuration**:

- **Site URL**: `https://scenemapper.ca` (or your production URL)
- **Redirect URLs**: add:
  - `https://scenemapper.ca/account`
  - `https://scenemapper.ca/**`
  - `http://localhost:3000/account`
  - `http://localhost:3000/**`

Password reset emails will link to `/account` so users can set a new password.

## 4. Migrations

Run all migrations in `supabase/migrations/` including:
- `20250204000001_user_map_notification_prefs.sql` (for Account notification preferences)

## 5. User IDs

`maps.admin_ids` and `maps.collaborator_ids` store Supabase `auth.users.id` (UUID). New signups get a UUID from Supabase Auth.

## 6. Migrating Existing Users

If you have users in `public.users` from the old auth system:

1. Set `MIGRATION_SECRET` in `.env.local` (e.g. `openssl rand -hex 32`).
2. Run the migration:
   ```bash
   curl -X POST https://your-domain.com/api/admin/migrate-users \
     -H "Authorization: Bearer YOUR_MIGRATION_SECRET"
   ```
3. Each existing user receives a password reset email. They must click the link and set a new password.
4. After verification, you can truncate `public.users` (optional).
