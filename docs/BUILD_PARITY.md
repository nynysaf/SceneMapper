# Strategic Plan: Local vs Production Build Parity

Discrepancies between local and production (theme colours wrong, Edit shows Create, uploaded map doesn’t appear) usually come from **different data sources**, **missing DB columns**, or **env/build differences**. This plan gets production to match local by fixing causes and locking parity.

---

## 1. Where the discrepancies come from

| Symptom | Likely cause |
|--------|----------------|
| **Theme colours don’t load** | (1) Maps from API have `theme: {}` (default) because DB column wasn’t updated on save, or (2) Maps table missing columns so full theme/options never persisted. |
| **Edit button → Create** | (1) `maps` is empty in production (GET /api/maps fails or returns []), so no map matches `?edit=slug` and form stays in “Create” mode. (2) Or Edit (pencil) doesn’t set all form fields (e.g. invitation email, enabledNodeTypes, connectionsEnabled). |
| **Uploaded map doesn’t appear** | (1) GET /api/maps returns [] (e.g. wrong Supabase env in Vercel, or different project). (2) Or POST /api/maps fails silently and the new map never reaches the DB. |

**Root causes:**

1. **Data source** – Local often uses **localStorage** (`NEXT_PUBLIC_USE_BACKEND` unset/false); production uses **Supabase** (backend true). So production only shows what’s in the DB and what the API returns.
2. **Schema vs app** – The app expects `regionFontScale`, `enabledNodeTypes`, `connectionsEnabled` (and full `theme`) on each map. If the **maps** table or **API mappers** don’t persist/return these, production will show defaults or empty lists.
3. **Env at build time** – `NEXT_PUBLIC_USE_BACKEND` is inlined at build. If Vercel builds without it (or with a different value), the client bundle behaves differently than local.
4. **Runtime env** – Wrong or missing `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` in Vercel causes API errors; GET /api/maps then fails or returns empty.

---

## 2. Strategic plan (get it right the first time)

### Phase A: Align schema and API with the app (do first)

1. **Add missing columns to `maps`**  
   Ensure the DB has every field the app uses:
   - `region_font_scale` (numeric, nullable)
   - `enabled_node_types` (text[], nullable)
   - `connections_enabled` (boolean, nullable)

   Add one migration that adds these columns if not present. Run it in Supabase (SQL Editor or `supabase db push`).

2. **Wire mappers end‑to‑end**  
   - In **db-mappers**: extend `DbMap` and `dbMapToSceneMap` / `sceneMapToDbMap` so these fields are read and written.  
   - Ensure **theme** is always read/written as full JSON (categoryColors, connectionLine, etc.).  
   - No app-only fields: everything the UI needs (theme, regionFontScale, enabledNodeTypes, connectionsEnabled) must be in the DB and in the API response.

3. **Verify API response shape**  
   - Call GET /api/maps locally (with backend enabled) and confirm each map has `theme`, `themeId`, `regionFontScale`, `enabledNodeTypes`, `connectionsEnabled`.  
   - If anything is missing, fix the mapper or the migration.

### Phase B: Env and “production-like” local

4. **Document and lock env**  
   - List every env var the app uses (see checklist below).  
   - In Vercel: set **all** of them for Production (and Preview if you use it).  
   - In `.env.local`: use the **same** Supabase project and same `NEXT_PUBLIC_USE_BACKEND=true` when testing parity.

5. **Run production-like local**  
   - Set `NEXT_PUBLIC_USE_BACKEND=true` and same Supabase vars as production.  
   - Restart dev server, then: create map, set theme, save, reload, open Edit.  
   - Confirm: theme colours, Edit vs Create, and map list match what you expect.  
   - Fix any remaining bugs (e.g. Edit pencil not setting all form fields).

6. **Build = production**  
   - Run `npm run build` locally before pushing.  
   - Ensure no TypeScript or build errors.  
   - Optionally add a short “production-like” script that sets `NEXT_PUBLIC_USE_BACKEND=true` and runs build so CI/Vercel and local build are aligned.

### Phase C: Production checks and safety net

7. **Verify production env**  
   - In Vercel → Project → Settings → Environment Variables, confirm every variable from the checklist is set for the deployment you use.  
   - Redeploy after any env change so the build and runtime use the new values.

8. **Smoke test after deploy**  
   - Open production URL → Dashboard → Sign in.  
   - Create a map (title, theme, optional options) → Save.  
   - Confirm the new map appears in the list.  
   - Click Edit (pencil): form shows “Edit” and all fields (theme, options) match.  
   - Open the map → check theme colours and options on the map view.

9. **Surfacing errors**  
   - Ensure Dashboard and map page show a clear message when GET /api/maps or GET /api/maps/[slug] fails (e.g. “Could not load maps”).  
   - Check Vercel function logs for 4xx/5xx on these routes if something still doesn’t match.

---

## 3. Env checklist (local and Vercel)

Use the same logical values in both places (Vercel = production; .env.local = production-like test).

| Variable | Where | Purpose |
|----------|--------|--------|
| `NEXT_PUBLIC_USE_BACKEND` | Build (client) | `true` = use API/Supabase; `false`/unset = localStorage. Must be `true` in production. |
| `SUPABASE_URL` | Server | Used by API routes to talk to Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Same. |
| `RESEND_API_KEY` | Server | Optional; for invitation emails. |
| `RESEND_FROM_EMAIL` | Server | Optional. |
| `NEXT_PUBLIC_APP_URL` or `VERCEL_URL` | Optional | For links in emails; Vercel sets `VERCEL_URL` automatically. |

Ensure **no** typo (e.g. `SUPABASE_SERVICE_ROLE_KEY` not `SUPABASE_SERVICE_KEY`).

---

## 4. One-time parity checklist

- [x] Migration added and run: `region_font_scale`, `enabled_node_types`, `connections_enabled` on `maps`. (`supabase/migrations/20250130000003_maps_display_options.sql`)
- [x] `DbMap` and db-mappers read/write these + full `theme`; GET /api/maps returns them.
- [x] Dashboard Edit (pencil) sets **all** form fields (theme, invitation email, enabledNodeTypes, connectionsEnabled, etc.).
- [ ] `.env.local` has `NEXT_PUBLIC_USE_BACKEND=true` and same Supabase (and Resend if used) as Vercel.
- [ ] Local “production-like” test: create map, edit, reload → theme and list correct.
- [ ] Vercel env checklist complete; redeploy.
- [ ] Production smoke test: create map → appears in list; Edit opens with correct data; map view shows correct theme.

---

## 5. Why “first time” works after this

- **Single source of truth:** Production and production-like local both use the same API and same Supabase schema. No split between “localStorage app” and “API app.”
- **Schema and mappers** match the app: no missing columns, no dropped fields in API responses.
- **Env** is explicit and documented; build and runtime use the same backend flag and credentials.
- **Edit flow** is consistent whether you land with `?edit=slug` or click the pencil; all fields are populated.
- **Smoke test** catches “uploaded map doesn’t appear” and “Edit shows Create” before you rely on production.

After Phase A (schema + mappers), Phase B (env + production-like local), and Phase C (production verify + smoke test), the build version should match the local version for theme, edit, and map list.
