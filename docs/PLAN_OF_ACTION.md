# Scene Mapper: Plan of Action — Production Parity

**Goal:** Understand root causes of local vs production discrepancies, fix them systematically, and add guardrails so new errors are not introduced.

**Principle:** Do **diagnostics first** (no deploy of fixes until we know causes). Then apply **ordered fixes**. Then **lock habits** with checklists and automation.

---

## Part 1: Diagnostics (Do First — No Fixes Yet)

Run these in order. **Record results** (pass/fail and any findings) in **`docs/DIAGNOSTIC_RESULTS.md`** before changing production or code. The aim is to confirm *why* production behaves differently, not to guess.

### D1. Local build

- [ ] Run: `npm run build`
- [ ] **Result:** ________________ (exit code 0 = pass; non-zero = fail; note any errors)
- **Why:** If the build fails locally, Vercel will fail or produce a broken bundle. CI already runs this on push; we need a green build before any other fix.

### D2. Vercel environment audit (manual)

In **Vercel → Project → Settings → Environment Variables**:

- [ ] **Production** environment is selected (or note which env runs the production build).
- [ ] `NEXT_PUBLIC_USE_BACKEND` exists and value is exactly `true` for **Production**. (If missing or false, production client uses localStorage — root cause of “maps don’t appear,” “Edit → Create.”)
- [ ] `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set for Production and match the Supabase project where you run migrations.
- [ ] Optional: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` if you use invitations.
- [ ] **Note:** `NEXT_PUBLIC_*` is inlined at **build time**. After any env change, a **new deploy** is required.

**Record:** List any variable missing or wrong: ________________

### D3. Production network and behavior

On the **live production URL** (Vercel):

- [ ] Open DevTools → Network. Reload Dashboard. Is there a request to `/api/maps`?
  - **If no:** Client is likely using localStorage (`USE_BACKEND` false in build). Confirms D2.
  - **If yes:** Note status (200 / 4xx / 5xx) and response body (array of maps vs `{ error: "..." }`).
- [ ] Open a map page (e.g. `/maps/<slug>`). Is there a request to `/api/maps/<slug>` and `/api/maps/<slug>/nodes`? Status and body?
- [ ] Check Vercel **Function Logs** (or Deployment logs) for GET/POST `/api/maps` and `/api/maps/[slug]`: any 500s or error messages?

**Record:** API called? Status? Log errors? ________________

### D4. Supabase schema vs migrations

In the Supabase project that **Production** uses (same as `SUPABASE_URL`):

- [ ] **Table Editor:** Confirm tables `users`, `maps`, `nodes`, `connections` exist.
- [ ] **maps table:** Confirm columns exist:
  - Core: `id`, `slug`, `title`, `theme`, `created_at`, etc.
  - From migrations: `invitation_email_subject_admin`, `invitation_email_body_admin`, … (invitation_emails); `region_font_scale`, `enabled_node_types`, `connections_enabled` (maps_display_options).
- [ ] Compare with migration files in `supabase/migrations/`. Any migration **not** run in this project?

**Record:** All migrations applied? Any missing columns? ________________

### D5. Production-like local run (optional but strong)

- [ ] In `.env.local`: `NEXT_PUBLIC_USE_BACKEND=true` and same `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` as production.
- [ ] Run: `npm run build && npm run start`
- [ ] In browser: sign in → Dashboard → create a map → save → does it appear in the list?
- [ ] Click Edit (pencil): does form show “Edit” with all fields (theme, options, invitation email) populated?
- [ ] Open the map: do theme and options match what you saved?

**Record:** Parity pass? Failures? ________________

---

## Part 2: Fixes (After Diagnostics)

Apply in this order. Each step depends on the previous.

### F1. Environment (Vercel)

- Set **Production** env vars per `docs/ENV_AND_MIGRATIONS_CHECKLIST.md`:  
  `NEXT_PUBLIC_USE_BACKEND=true`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (and Resend if used).
- **Redeploy** after changing env (required for `NEXT_PUBLIC_*` and for runtime vars).

### F2. Supabase schema

- Run any **missing** migrations (in order) on the project that Production uses (SQL Editor or `supabase db push`).
- Confirm `maps` has all columns the app expects (see D4 and `lib/db-mappers.ts`).

### F3. API and mappers

- Ensure `lib/db-mappers.ts`: `DbMap` and `dbMapToSceneMap` / `sceneMapToDbMap` include every field the UI uses (theme, regionFontScale, enabledNodeTypes, connectionsEnabled, invitation email fields).
- Ensure GET `/api/maps` and GET `/api/maps/[slug]` return that full shape (no dropped columns).

### F4. Error surfacing (no silent failures)

- Where the client catches API errors (e.g. `getMaps().catch(() => setMaps([]))`), show a clear message (e.g. “Could not load maps”) so “API failed” is distinguishable from “no data.”
- Map page: when `getMapBySlug` returns null / 404, show “Map not found” and a link to Dashboard instead of a blank or default-themed page.

### F5. Env naming consistency (optional)

- Code uses `NEXT_PUBLIC_APP_ORIGIN` in `lib/invitation-email.ts`; docs mention `NEXT_PUBLIC_APP_URL`. Align naming in `.env.example` and deployment docs (use one name and document it).

---

## Part 3: Guardrails (Prevent Regressions)

### G1. Pre-push / pre-deploy checklist

Before every push that can affect production:

1. **Build:** `npm run build` — must pass (exit code 0).
2. **Data layer:** If you changed `lib/data.ts` (signatures/exports), grep for `getMaps(`, `getMapBySlug(`, `getNodes(`, `getConnections(` and verify every call site.
3. **Env:** If you added env vars, update `.env.example` and `docs/ENV_AND_MIGRATIONS_CHECKLIST.md`; ensure Vercel Production has them.
4. **Migrations:** Any new migration in `supabase/migrations/` must be run on the Supabase project used by the deployment target.

**Habit:** Do not push to the deploy branch (e.g. `main`) without a green build.

### G2. CI (already in place)

- `.github/workflows/build.yml` runs `npm run build` on push/PR to `main`. Keeps broken builds from reaching Vercel.
- **Optional:** Run build with `NEXT_PUBLIC_USE_BACKEND=true` in CI so the built bundle matches production (catches build-time env issues).

### G3. Post-deploy smoke test

After each production deploy:

- [ ] Open production URL → sign in → Dashboard: map list loads (or empty with no errors).
- [ ] Create a map → save → it appears in the list.
- [ ] Click Edit (pencil): form shows “Edit” with correct fields.
- [ ] Open the map: theme and options match.
- [ ] Open `/maps/nonexistent-slug`: “Map not found” (or clear error), not blank.

### G4. Single source of truth for “what to check”

- **Pre-deploy:** `docs/ENV_AND_MIGRATIONS_CHECKLIST.md` + “Pre-push checklist” above.
- **Post-deploy:** “Post-deploy smoke test” above.
- **Full playbook:** `docs/ZERO_DISCREPANCY_STRATEGY.md` (phases 1–5).

---

## Summary: Order of Work

| Phase   | What to do |
|---------|------------|
| **Diagnostics** | D1 (local build) → D2 (Vercel env) → D3 (production network/logs) → D4 (Supabase schema) → D5 (production-like local). Record results. |
| **Fixes**       | F1 (env + redeploy) → F2 (migrations) → F3 (mappers/API) → F4 (error surfacing) → F5 (env naming if desired). |
| **Guardrails**  | G1 (pre-push checklist), G2 (CI), G3 (smoke test), G4 (doc pointers). |

**Start at the beginning:** Run **D1** (local build) and record the result. Then proceed through D2–D5 before applying F1–F5.
