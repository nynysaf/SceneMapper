# Step-by-Step Strategy: Working Build with Zero Discrepancies

This is a **single playbook** to get to a working production build with no errors and no local-vs-production discrepancies. Follow the steps in order; check each box before moving on.

---

## Phase 1: Guarantee Green Build (No Build Errors)

### Step 1.1 – Build passes locally
- [ ] Run: `npm run build`
- [ ] Build must finish with exit code 0 (no TypeScript or compile errors).
- [ ] If it fails: fix the reported error (e.g. missing state, wrong signature), then run build again until it passes.

### Step 1.2 – CI runs build on every push (optional but recommended)
- [ ] A GitHub Actions workflow runs `npm run build` on push to `main`.
- [ ] If the workflow fails, do not merge/push to `main` until the build is fixed locally.
- [ ] This prevents broken builds from reaching Vercel.

### Step 1.3 – Pre-push habit
- [ ] Before every push that can affect production: run `npm run build` once.
- [ ] Document this in README or CONTRIBUTING so everyone follows it.

**Exit condition for Phase 1:** `npm run build` passes locally (and in CI if enabled). No build errors on Vercel.

---

## Phase 2: Align Data and Config (No Env/Schema Discrepancies)

### Step 2.1 – Environment variables
- [ ] **Vercel → Project → Settings → Environment Variables.** For **Production** (and Preview if you use it), set:
  - `NEXT_PUBLIC_USE_BACKEND` = `true` (required for production to use API).
  - `SUPABASE_URL` = your Supabase project URL (same as in `.env.local` when testing parity).
  - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service_role key.
  - Optional: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` if you use invitation emails.
- [ ] **Redeploy** after changing env (Vercel uses env at build/runtime).
- [ ] `.env.example` lists all of the above so new setups don’t miss a variable.

### Step 2.2 – Supabase migrations
- [ ] The Supabase project used by **production** (the one `SUPABASE_URL` points to) has all migrations applied:
  - `20250129000001_initial_schema.sql` (users, maps, nodes)
  - `20250130000001_connections.sql` (connections table)
  - `20250130000002_invitation_emails.sql` (invitation email columns on maps)
  - `20250130000003_maps_display_options.sql` (region_font_scale, enabled_node_types, connections_enabled)
- [ ] Run any missing migrations in Supabase SQL Editor or via `supabase db push`.

### Step 2.3 – API and mappers
- [ ] `lib/db-mappers.ts`: `DbMap` includes all fields the app uses (theme, region_font_scale, enabled_node_types, connections_enabled, invitation email fields). `dbMapToSceneMap` and `sceneMapToDbMap` read/write them.
- [ ] GET `/api/maps` and GET `/api/maps/[slug]` return full map shape (theme, regionFontScale, enabledNodeTypes, connectionsEnabled). No missing columns in DB and no dropped fields in mappers.

**Exit condition for Phase 2:** Vercel has correct env; target Supabase has all migrations; API returns full map shape. No “empty theme” or “missing options” from missing columns or mappers.

---

## Phase 3: Production-Like Local Verification (Catch Discrepancies Before Deploy)

### Step 3.1 – Parity test (optional but strong)
- [ ] In `.env.local`: set `NEXT_PUBLIC_USE_BACKEND=true` and use the **same** Supabase URL and service_role key as production.
- [ ] Run: `npm run build && npm run start`.
- [ ] In the browser: sign in → Dashboard → create a map (title, theme, options) → save → confirm it appears in the list.
- [ ] Click **Edit** (pencil): form shows “Edit” and all fields (theme, invitation email, enabled node types, connections) are populated.
- [ ] Open the map: theme colours and options match what you saved.
- [ ] If anything fails: fix env, migrations, or UI (e.g. Edit not populating all fields) before relying on production.

### Step 3.2 – Build with production-like env (optional)
- [ ] Run build with `NEXT_PUBLIC_USE_BACKEND=true` so the client bundle matches what Vercel will build (e.g. `cross-env NEXT_PUBLIC_USE_BACKEND=true npm run build` or a script in package.json).

**Exit condition for Phase 3:** Local “production-like” run matches expected behavior (list, edit, theme). No surprises in production.

---

## Phase 4: Post-Deploy Smoke Test (Confirm Zero Discrepancies in Production)

### Step 4.1 – Smoke test after each deploy
- [ ] Open **production** URL (e.g. your Vercel deployment).
- [ ] Sign in (or create account if needed).
- [ ] **Dashboard:** Map list loads (not empty unless you have no maps). No console/network errors for GET `/api/maps`.
- [ ] **Create map:** Create a map (title, slug, theme) → save. It appears in the list.
- [ ] **Edit:** Click pencil on that map. Form shows “Edit” (not “Create”) and fields (theme, options) match.
- [ ] **Map page:** Open the map. Theme colours and nodes load. No 404 for GET `/api/maps/[slug]` or GET `/api/maps/[slug]/nodes` (unless the map really doesn’t exist).
- [ ] **Map not found:** Open a slug that doesn’t exist (e.g. `/maps/fake-slug`). You see “Map not found” and a link to Dashboard (no blank or broken page).

**Exit condition for Phase 4:** All of the above pass. No build errors, no empty list due to wrong env, no “Edit → Create,” no wrong theme, no silent 404s.

---

## Phase 5: Lock the Habit (Keep Zero Discrepancies)

### Step 5.1 – Checklist before every deploy
- [ ] Run **Phase 1** (build passes locally; CI green if enabled).
- [ ] Run **Phase 2** (env and migrations verified; no new env vars or migrations without updating checklist).
- [ ] Push to `main` (or your deploy branch). Wait for Vercel build to complete.
- [ ] Run **Phase 4** (smoke test on production). If any step fails, fix and redeploy.

### Step 5.2 – When adding features
- [ ] If you change `lib/data.ts` (signatures or exports): grep for all call sites of `getMaps`, `getMapBySlug`, `getNodes`, `getConnections` and update or verify each. Then run build.
- [ ] If you add env vars: add to `.env.example` and to the env checklist (Phase 2.1). Set them in Vercel for Production.
- [ ] If you add a DB column or table: add a migration, run it on the target Supabase project, and update db-mappers and API if needed.

**Exit condition for Phase 5:** Every deploy is preceded by build + env/migration check and followed by a smoke test. New changes follow the same rules so discrepancies don’t creep back.

---

## Summary: Zero-Discrepancy Checklist (One-Page)

| # | Check | Done |
|---|--------|------|
| 1 | `npm run build` passes locally | |
| 2 | CI runs build on push to main (optional) | |
| 3 | Vercel Production has NEXT_PUBLIC_USE_BACKEND=true, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | |
| 4 | All 4 migrations run on production Supabase | |
| 5 | db-mappers and API return full map shape | |
| 6 | Parity test locally (optional): backend=true, same Supabase, create/edit/map | |
| 7 | Post-deploy smoke test: sign in, list, create, edit, map page, map not found | |

When all seven are checked for a given deploy, you have a **working build with zero discrepancies** for that release. Re-run this checklist for every subsequent deploy.
