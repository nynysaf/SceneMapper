# Local vs Vercel: Sequential Hypotheses for Deployment Discrepancies

This document walks through **all plausible causes** of differences between local and production (theme wrong, Edit → Create, uploaded map missing), in order of likelihood and dependency. Use it to fix **every** discrepancy, not just the ones already noticed.

---

## How the app decides: API vs localStorage

- **`lib/data.ts`** sets `USE_BACKEND` once at **module load time**:
  ```ts
  const USE_BACKEND = typeof process !== 'undefined' &&
    (process.env as Record<string, string | undefined>).NEXT_PUBLIC_USE_BACKEND === 'true';
  ```
- In Next.js, **`NEXT_PUBLIC_*`** env vars are **inlined at build time** into the client bundle. They are **not** read at runtime from the server.
- So: **whatever `NEXT_PUBLIC_USE_BACKEND` is when Vercel runs `npm run build` is what the production client uses forever** (until the next build).
- If `USE_BACKEND` is `false` in production: `getMaps()` / `getMapBySlug()` / `saveMaps()` use **localStorage**. If `true`: they use **fetch('/api/maps')** etc.

---

## 1. Production build is using localStorage (most likely)

**Hypothesis:** On Vercel, `NEXT_PUBLIC_USE_BACKEND` is **not set** (or is `false`) for the **Production** environment at **build time**. So the production client bundle has `USE_BACKEND = false` and never calls the API.

**Consequences:**
- **Uploaded map doesn’t appear:** New visitors have empty localStorage; `getMaps()` returns `[]`. Maps “uploaded” in the form might be written to localStorage on that device, but (a) a different device/tab/incognito sees nothing, and (b) if the user expects data to come from Supabase, it never will.
- **Edit → Create:** `maps` is `[]` (or doesn’t contain the map), so `?edit=slug` finds no match and the form stays in “Create” mode; pencil edit would populate from a map in the list, but if the list is empty, there’s nothing to click.
- **Theme colours wrong:** If they open a map URL directly, `getMapBySlug(slug)` reads from localStorage; if that key is empty for that slug, `map` is null and the page uses `theme: undefined` → default/wrong theme.

**How to confirm:**
- In Vercel: Project → Settings → Environment Variables. Check that **`NEXT_PUBLIC_USE_BACKEND`** exists and is exactly **`true`** for **Production** (and for the environment that runs the production build).
- Redeploy **after** adding/fixing it (env is baked in at build).
- Optional: In production client, log or temporarily show `process.env.NEXT_PUBLIC_USE_BACKEND` (or a derived “Using API: yes/no” banner) to confirm.

**Fix:** Set `NEXT_PUBLIC_USE_BACKEND=true` for Production in Vercel, then trigger a new production deploy.

---

## 2. Vercel env scope (Preview vs Production)

**Hypothesis:** `NEXT_PUBLIC_USE_BACKEND=true` is set only for **Preview** (or only for Development), not for **Production**. So production builds still get `USE_BACKEND = false`.

**How to confirm:** In Vercel env list, check the **Environment** column for `NEXT_PUBLIC_USE_BACKEND` (Production / Preview / Development). Ensure **Production** is checked.

**Fix:** Add or edit the variable and select **Production**, then redeploy.

---

## 3. Supabase env wrong or different project on Vercel

**Hypothesis:** Production uses the API (`USE_BACKEND = true`), but **`SUPABASE_URL`** or **`SUPABASE_SERVICE_ROLE_KEY`** on Vercel are missing, wrong, or point to a **different** Supabase project than the one you updated (e.g. different DB, no migration run there).

**Consequences:**
- **GET /api/maps** returns 500 (e.g. connection/auth error) or returns `[]` (empty project). Dashboard does `getMaps().catch(() => setMaps([]))`, so the UI shows an empty list and **no error message**.
- **POST /api/maps** may succeed in a different project, so “uploaded” maps exist in DB A while the app (or your checks) look at DB B.
- **Theme / Edit:** Same as above: empty or wrong data from the API.

**How to confirm:**
- Vercel → Project → Settings → Environment Variables. Confirm **`SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** match the project where you ran migrations (same as in `.env.local` when testing “production-like” locally).
- Check Vercel **Function Logs** (or Deployment logs) for GET/POST `/api/maps`: 500s or error messages indicate Supabase config or RLS issues.

**Fix:** Set correct Supabase env vars for Production (and Preview if you use it); redeploy.

---

## 4. API errors are swallowed; user sees empty state

**Hypothesis:** GET `/api/maps` or GET `/api/maps/[slug]` **fails** on Vercel (5xx, network, or CORS), but the client only does `.catch(() => setMaps([]))` / `.catch(() => setMap(null))`, so the UI shows “no maps” / “no map” and **no error message**. You then interpret that as “uploaded map doesn’t appear” and “theme doesn’t load.”

**How to confirm:**
- Open production Dashboard and map page; in DevTools → Network, check:
  - Does the client call `/api/maps` (and `/api/maps/...` for a map page)?
  - Status 200 vs 4xx/5xx? Body: array of maps vs `{ error: "..." }`?
- Check Vercel server/function logs for those routes.

**Fix (defensive):**
- Surface errors in the UI (e.g. “Could not load maps. Check connection.” or “Map not found.”) instead of silently setting empty state, so you can tell “API error” from “really no data.”
- Fix the underlying API/Supabase issue (env, RLS, migration) as above.

---

## 5. Theme not persisted or not returned (DB / mapper)

**Hypothesis:** Even when the API is used and returns maps:
- **Theme column** in `maps` is `{}` or incomplete (e.g. never written on create/update, or written only in one environment).
- **Mapper** or API strips/transforms theme so the client gets a default.

**Consequences:** Map list might show up, but each map’s `theme` is empty or wrong → map page and edit form show wrong colours.

**How to confirm:**
- Call GET `/api/maps` on production (browser or curl); inspect JSON: does each map have a full `theme` object (e.g. `primaryColor`, `categoryColors`, `connectionLine`)?
- In Supabase (same project as Vercel): Table Editor → `maps` → check `theme` column for a row.

**Fix:** Ensure POST /api/maps sends full `theme` in the body and `sceneMapToDbMap` writes it; ensure GET returns it (already via `dbMapToSceneMap`). If DB has `{}`, fix the write path or backfill.

---

## 6. Map page: getMapBySlug fails or returns null

**Hypothesis:** For `/maps/[slug]`, `getMapBySlug(slug)` is called. If the API returns 404 or errors, the catch sets `map = null`. The page then uses `theme: undefined` (and other fallbacks), so **theme colours don’t load** and the map looks wrong or default.

**Causes:** Same as above: wrong Supabase project, missing map row, or GET `/api/maps/[slug]` failing.

**How to confirm:** Network tab: request to `/api/maps/<slug>`. Status and response body. Server logs for that route.

**Fix:** Fix API/DB so the map is returned; optionally show “Map not found” when `map === null` instead of a generic default theme.

---

## 7. Session / auth: different cookie or domain

**Hypothesis:** Login/signup set a **session cookie** on production. If the cookie’s **domain**, **SameSite**, or **path** is wrong, or production URL differs (e.g. `xxx.vercel.app` vs custom domain), the next request might not send the cookie. Then **GET /api/session** (or auth check) fails, so the Dashboard might treat the user as logged out and hide or change behaviour (e.g. “Create” vs “Edit”) or use a different data path.

**How to confirm:** After logging in on production, DevTools → Application → Cookies: is the session cookie present for the production domain? Does it get sent on the next request (Network → request headers)?

**Fix:** Ensure cookie options in your auth layer use the correct domain/path for production (e.g. not hardcoded to `localhost`). If you use a custom domain, configure it in Vercel and in the cookie.

---

## 8. Caching (CDN / edge / browser)

**Hypothesis:** A cached response (e.g. GET `/api/maps` or the HTML of the dashboard) returns old or empty data, so the UI shows no maps or stale theme.

**How to confirm:** Check response headers for `Cache-Control`, `CDN-Cache-Control`, or `Vercel-Cache`. Force refresh or open in incognito and compare.

**Fix:** For dynamic API routes, avoid caching (e.g. `Cache-Control: private, no-store` or equivalent in Next.js). Vercel serverless functions are usually uncached by default; document if you add caching later.

---

## 9. Build vs runtime env (recap)

**Hypothesis:** Someone sets `NEXT_PUBLIC_USE_BACKEND=true` only in **Vercel’s runtime** (e.g. via a secret or override) but not at **build time**. In Next.js, `NEXT_PUBLIC_*` is inlined at build; runtime env changes do **not** change the client bundle. So production still behaves as if `USE_BACKEND = false`.

**Fix:** Ensure `NEXT_PUBLIC_USE_BACKEND` is set in the **same** environment that runs the build (e.g. Production build must have Production env with this variable). Redeploy after changing.

---

## 10. Race or ordering (initialEditSlug vs maps load)

**Hypothesis:** Dashboard runs two useEffects: one loads `getMaps()` → `setMaps(...)`, another applies `initialEditSlug` when `maps.length > 0`. If `initialEditSlug` is set from the URL before maps are loaded, the edit effect runs once with `maps = []` and bails; then when maps arrive, the effect might not run again with the right dependency (e.g. `editingMapId` already set elsewhere), so the form never switches to Edit mode for that slug.

**How to confirm:** In production, open Dashboard with `?edit=<slug>` for an existing map. In DevTools, check: does `maps` get populated? Does the edit effect run again after `maps` updates?

**Fix:** Ensure the edit-populate effect depends on `maps` (it does) and that when maps load from the API, the effect runs and finds the matching map. If the list is empty (see hypotheses 1–4), this will never work until the API returns data.

---

## 11. Other possible causes (lower priority)

- **RLS (Row Level Security):** Supabase RLS might block the service role or the anon key in some paths; less likely if API uses **service_role** and RLS is “no policies = deny direct client, allow service role.” Confirm API uses service role and RLS is as intended.
- **CORS:** Same-origin on Vercel (same domain) usually means no CORS for `/api/*`. Only relevant if you call the API from another origin.
- **Base path / rewrites:** If you add `basePath` or rewrites in Next.js, `/api/maps` might not hit the API route. You don’t have a custom next.config in the repo; if you add one, keep `/api` working.
- **Client-side only guard:** `guard()` in `lib/data.ts` throws on the server; that’s correct because getMaps/getMapBySlug are used in `useEffect` (client-only). No change needed unless you call them during SSR.

---

## Recommended order of checks

1. **Vercel env:** `NEXT_PUBLIC_USE_BACKEND=true` for **Production** at **build** time → redeploy.
2. **Vercel env:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` correct for the **same** project where migrations ran.
3. **Network + logs:** In production, confirm the client calls `/api/maps` (and `/api/maps/[slug]`) and that responses are 200 with expected JSON; check Vercel function logs for errors.
4. **UI:** Add simple error surfacing for “Failed to load maps” / “Map not found” so you can distinguish API failure from “no data.”
5. **DB:** In the same Supabase project, confirm `maps` has rows and `theme` (and new columns) are populated after a save.
6. **Auth/cookie:** Confirm session cookie is set and sent on production domain.

After (1) and (2) and a redeploy, most “nothing changed” behaviour should resolve if the root cause was production using localStorage or the wrong Supabase project. Then use (3)–(6) to fix any remaining discrepancies.
