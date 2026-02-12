# Diagnostic Results — Production Parity

Use this to record results from **Part 1: Diagnostics** in `docs/PLAN_OF_ACTION.md`. Fill in as you run each step.

---

## D1. Local build

- [x] Run: `npm run build`
- **Result:** **PASS** (exit code 0). Build used `.env.local`; compiled successfully; TypeScript and static generation OK.
- **Date:** 2025-01-31

---

## D2. Vercel environment audit

- [ ] Production env selected / noted
- [ ] `NEXT_PUBLIC_USE_BACKEND` = `true` for **Production**
- [ ] `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set for Production; match migration project
- [ ] Optional: Resend vars

**Record:** All set

---

## D3. Production network and behavior

**Instructions:** See `docs/D3_INSTRUCTIONS.md` for step-by-step.

- [x] Dashboard: request to `/api/maps`? Y. Status: 200. Body: array of maps (or [])
- [x] Create map flow: POST /api/maps and GET /api/maps/[slug] observed; many requests show **NS_BINDING_ABORTED** (red error symbol, no status code)
- [x] Vercel Function Logs: any 500s or errors on these routes? **No 500s.**

**Record:** Dashboard works (200). Creating a map: POST /api/maps and GET /api/maps/test-map are **aborted** (NS_BINDING_ABORTED); one GET /api/maps/test-map completes with **404**. Root cause: Dashboard navigates to `/maps/{slug}` immediately after Save without waiting for POST to complete → page unload aborts the POST → map never saved → map page GET returns 404.

**Part C (Vercel Function Logs):** No 500s. All API responses are 200, 304, 307, 401, or 404. GET `/api/maps` and `/api/users`, `/api/auth/session`, `/api/maps/[slug]/nodes`, `/api/maps/[slug]/connections` return 200. GET `/api/maps/test-map` and `/api/maps/emerging-scene-toronto` return 404 (maps not in DB — expected). **No POST /api/maps** appears in logs, confirming the create-map POST never completed (aborted client-side). API and Supabase are healthy; 404s are correct “map not found” behavior.

---

**Follow-up (POST 500 after await fix):** User reported POST /api/maps **500** on Create map; map appears in "Your maps" (optimistic state) but clicking it gives "Map not found". **Root cause:** New maps used `id: Math.random().toString(36).slice(2)` (e.g. `k3j5h2g1`); `maps.id` in DB is **uuid**; Postgres rejected non-UUID. **Fix:** Client uses `crypto.randomUUID()` for new map id; API normalizes non-UUID ids to UUID before upsert; client surfaces API error message on save failure.

**If POST /api/maps still returns 500:** (1) In DevTools → Network → click the failed POST **maps** request → **Response** tab: copy the `error` message. (2) If it says a **column does not exist** (e.g. `region_font_scale`, `invitation_email_subject_admin`), run the missing migration(s) on the **production** Supabase project (see `docs/ENV_AND_MIGRATIONS_CHECKLIST.md` — all 4 migrations must be applied). (3) Confirm the latest Vercel deployment (with the UUID fix) is the one you’re hitting.

---

## D4. Supabase schema vs migrations

- [ ] Tables: `users`, `maps`, `nodes`, `connections`
- [ ] `maps` columns: core + invitation_emails + region_font_scale, enabled_node_types, connections_enabled
- [ ] All 4 migrations applied in production Supabase project

**Record:** _________________________________________________

---

## D5. Production-like local run

- [ ] `.env.local`: `NEXT_PUBLIC_USE_BACKEND=true`, same Supabase as production
- [ ] `npm run build && npm run start` — create map → appears in list; Edit shows correct data; map view correct

**Record:** _________________________________________________

---

After all diagnostics are recorded, proceed to **Part 2: Fixes** in `PLAN_OF_ACTION.md` in order F1 → F5.
