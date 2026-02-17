# Fast Origin Transfer (FOT) – What It Is and How to Reduce It

**Context:** Vercel reports ~50% Fast Origin Transfer usage (4.74 GB / 10 GB). This doc explains what drives it in this project and lists optimizations to consider (plan only; no implementation here).

**From your FOT report (Direction + Regions):**
- **Outgoing (Compute → CDN) is ~68%** of FOT (3.24 GB). That’s your **API and page responses** being sent from origin to the edge. Incoming (CDN → Compute) is smaller. So reducing **response size** and **cacheability** of GETs is the right lever.
- **Regions:** Almost all FOT is **Washington D.C. (iad1)** and **Montréal (yul1)** — consistent with North American traffic (e.g. scenemapper.ca). Optimization is the same regardless of region; caching and smaller payloads reduce outgoing in every region.
- **Usage is bursty** (big spikes around Feb 1, 6–8, 12; then lower). Caching would have cut those spikes by serving repeat requests from the CDN instead of the origin. Tier 1–2 recommendations are unchanged and are especially valuable when traffic spikes.

---

## What is Fast Origin Transfer?

- **FOT** = data transferred from Vercel’s **Edge** back to the **origin** (serverless functions / Node.js).
- It’s incurred when a request **cannot be served from the CDN** and must hit the origin. The response (HTML, JSON, etc.) is then sent from origin → edge → user; the origin↔edge leg is FOT.
- **Higher FOT** when: many dynamic requests, uncached API routes, large responses, middleware that leads to origin work.

---

## What’s Driving FOT in This Project

### 1. **No caching on most API routes**

- **Only** `/api/qr` sets `Cache-Control: public, max-age=3600`. All other API routes return **no cache headers**, so every request hits the origin and the response counts as FOT.
- High-impact routes that are good cache candidates or high traffic:
  - **`GET /api/featured-maps`** – Public, same for everyone. Called on every home load and Featured maps page. **Ideal for CDN caching.**
  - **`GET /api/maps/[slug]/page`** – One big response per map view. Per-slug and access-controlled; public maps could be cached with a short TTL or `stale-while-revalidate`.
  - **`GET /api/maps/[slug]`** – Single map metadata; similar to above for public maps.

### 2. **Every request goes through middleware**

- **`middleware.ts`** runs on almost every request (except `_next/static`, `_next/image`, favicon, images). It calls **`supabase.auth.getClaims()`** to refresh the session.
- Middleware runs at the **Edge**; the FOT cost is mainly from the **next step**: the actual page or API route that runs on the **origin** (e.g. a dynamic page or API handler). So the main driver is “how many requests end up at the origin,” not the middleware call itself. Still, every navigation/page load that is dynamic = one or more origin responses.

### 3. **Client-side data fetching → many origin API calls**

- **Home page (`/`):** `useEffect` calls `getMaps()`, `getSession()`, `getFeaturedMaps()` → **3 API calls** per visit (`/api/maps`, `/api/auth/session`, `/api/featured-maps`). No caching, so 3 origin responses per home load.
- **Featured maps page (`/featured-maps`):** `getFeaturedMaps()` → 1 call to `/api/featured-maps` per visit.
- **Dashboard:** `getSession()`, `getMaps()` (and when admin: `getFeatureRequests()`, `getFeaturedMaps()`) → multiple origin calls per load.
- **Map page (`/maps/[slug]`):** One call to `getMapPageData()` → **`GET /api/maps/[slug]/page`** (map + nodes + connections in one response). Good (single round-trip), but still uncached → full FOT per view.
- **Map experience:** Additional calls for join, nodes/connections save, etc., as users edit.

So **every page load triggers one or more uncached API requests** → each response is origin → edge → user → FOT.

### 4. **Response size**

- **`GET /api/featured-maps`** – `select('*')` on `maps`; returns full rows (theme, element_config, invitation fields, etc.). Larger payload = more FOT per request.
- **`GET /api/maps/[slug]/page`** – Returns full map + all nodes + all connections. For large maps this can be big; same story.
- **`GET /api/maps`** – Full map list for the user; again `select('*')`.

Larger JSON responses = more bytes transferred origin → edge = more FOT.

### 5. **Dynamic pages**

- App Router pages that use client-side fetching or server components that read cookies/headers are **dynamic** by default. So `/`, `/dashboard`, `/maps/[slug]`, `/featured-maps`, etc. are not statically cached at the edge; each visit can trigger origin execution (and thus FOT for the HTML or the API calls the page makes).

### 6. **Cron**

- **`/api/cron/daily-digest`** runs once per day (e.g. 04:59). One origin invocation per run; negligible for FOT unless the response is huge.

---

## Optimization Plan (No Implementation Here)

### High impact

1. **Cache `GET /api/featured-maps`**
   - Add response headers so the CDN can cache, e.g. `Cache-Control: public, s-maxage=60, stale-while-revalidate=120` (tune to how often featured maps change). Reduces FOT for every home and Featured maps visit after the first miss.

2. **Cache `GET /api/maps/[slug]/page` for public maps**
   - For maps with `public_view === true`, add cache headers (e.g. short `s-maxage`, or `stale-while-revalidate`). Private maps should remain uncached or use `private` so only the right user gets a cached copy. This can significantly cut FOT for repeated views of the same public map.

3. **Reduce payload size where possible**
   - **Featured maps:** Select only fields needed for the cards (e.g. `id`, `slug`, `title`, `description`, `background_image_url`, `featured_order`, `featured_active`) instead of `*`. Smaller response = less FOT per request.
   - **`/api/maps/[slug]/page`:** Already one combined response; ensure you’re not sending redundant or unused fields if it’s easy to trim (e.g. omit heavy theme/config if not needed on first paint).

### Medium impact

4. **Cache `GET /api/maps` for anonymous users**
   - When `userId` is null, the response is “all public maps.” You could add a short `s-maxage` (e.g. 30–60s) so repeated anonymous home loads share a cached response. Logged-in users should stay uncached or use `private` so “Your Maps” is correct.

5. **Client-side caching / request dedup**
   - Use a simple in-memory or SWR-style cache for `getFeaturedMaps()` and optionally `getSession()` / `getMaps()` so the same tab doesn’t refetch on every mount. Fewer API calls = fewer origin hits = less FOT.

6. **Static or ISR where possible**
   - If any page can be pre-rendered (e.g. a static marketing or help page), use static generation so the HTML is served from the edge. Only do this where it doesn’t break auth or personalization.

### Lower impact / monitor

7. **Middleware**
   - Middleware runs at the edge; the main FOT comes from the origin routes it forwards to. You could narrow the `matcher` so middleware doesn’t run on paths that never need session (e.g. pure static assets already excluded). Small gain.

8. **Use Vercel’s “Top Paths”**
   - In the Vercel Usage dashboard, check **Top Paths** for FOT (or bandwidth). Focus optimizations on the paths that show the highest usage (likely `/api/featured-maps`, `/api/maps/[slug]/page`, `/api/auth/session`, `/api/maps`).

9. **Cron**
   - Keep the cron response small (e.g. 204 or minimal JSON). Already low impact.

---

## Summary

| Driver | Why it increases FOT | Optimization idea |
|--------|----------------------|--------------------|
| No cache on API routes | Every request hits origin; response is FOT | Add `Cache-Control` (e.g. `s-maxage`, `stale-while-revalidate`) on cacheable GETs |
| Home/featured/dashboard load | 3+ API calls per visit, all uncached | Cache featured-maps; optionally cache public /api/maps; client cache to reduce repeat calls |
| Map page load | One large uncached JSON per view | Cache public map page responses; trim payload if possible |
| Full `select('*')` | Larger JSON | Select only needed fields for list/card views |

**Recommended order:** (1) Add caching for `GET /api/featured-maps`, (2) Add caching for public `GET /api/maps/[slug]/page`, (3) Trim featured-maps and list payloads, (4) Optional client-side caching and anonymous `/api/maps` caching. Use Vercel’s Top Paths to confirm which routes dominate FOT before and after changes.

---

## Recommended implementation (simplicity vs impact vs trade-offs)

### Tier 1 — Do first

**1. Cache `GET /api/featured-maps`**

- **Simplicity:** Very high. Add one response header before `NextResponse.json(maps)`.
- **Impact:** High. Same response for all users; called on every home load and Featured maps page. After the first request, the CDN can serve the rest.
- **Trade-off:** When an admin adds/removes/reorders featured maps, users may see the old list for up to the `s-maxage` window (e.g. 60 seconds). For a list that changes rarely, this is usually acceptable.
- **Suggestion:** `Cache-Control: public, s-maxage=60, stale-while-revalidate=120`. Tune `s-maxage` down to 30 if you want faster updates after admin changes.

---

### Tier 2 — Do next if FOT is still high

**2. Cache `GET /api/maps` for anonymous users only**

- **Simplicity:** High. In the GET handler, if `userId` is null, set a cache header on the response; otherwise do not cache (logged-in “Your Maps” must be fresh).
- **Impact:** Medium. Only helps anonymous visitors (e.g. home page “explore” / public maps list). Logged-in users are unchanged.
- **Trade-off:** Anonymous users may see a slightly stale list of public maps (e.g. 30s). Low risk.
- **Suggestion:** `Cache-Control: public, s-maxage=30` when `userId == null`.

**3. Cache `GET /api/maps/[slug]/page` for public maps only**

- **Simplicity:** Medium. After loading the map row, if `mapRow.public_view === true` and the user has access, set cache headers on the success response. Do **not** cache 404 or 403 (no-store or omit cache for those).
- **Impact:** High for repeat views of the same public map (shared links, returning visitors).
- **Trade-off:** After someone edits a public map (nodes, title, etc.), viewers might see stale content for the TTL. Use a short TTL (e.g. 30s) to limit this.
- **Suggestion:** `Cache-Control: public, s-maxage=30, stale-while-revalidate=60` only when the map is public and the response is 200.

---

### Tier 3 — Defer unless you need more

**4. Trim featured-maps payload**

- **Simplicity:** Medium. Requires selecting a subset of columns (or a “lite” mapper) so the response doesn’t include invitation text, full theme, element_config, connection_config, etc. The UI only needs id, slug, title, description, backgroundImageUrl, featuredOrder, featuredActive for the cards.
- **Impact:** Medium (smaller JSON → less FOT per request). No reduction in number of origin calls unless combined with caching.
- **Trade-off:** Need to ensure no consumer expects the full `SceneMap` from this endpoint; or keep a minimal `SceneMap`-compatible shape with defaults for unused fields.
- **Recommendation:** Do **after** Tier 1–2. Revisit only if FOT is still high and you want to squeeze more from this route.

**5. Client-side caching (SWR / in-memory)**

- **Simplicity:** Low–medium. New dependency or cache layer; wire `getFeaturedMaps()` (and optionally `getSession` / `getMaps`) with a short TTL so the same tab doesn’t refetch on every mount.
- **Impact:** Medium. Fewer duplicate API calls per session → fewer origin requests.
- **Trade-off:** More code; possible stale UI if TTL is long; need to invalidate on logout or after mutations.
- **Recommendation:** Defer unless you’ve done Tier 1–2 and still need more. Use Vercel Top Paths first to confirm where FOT goes.

---

### Summary

| Change | Simplicity | Impact | Main trade-off |
|--------|------------|--------|-----------------|
| Cache `/api/featured-maps` | Very high | High | Up to ~60s stale featured list after admin change |
| Cache `/api/maps` (anonymous) | High | Medium | Up to ~30s stale public map list for anon users |
| Cache `/api/maps/[slug]/page` (public) | Medium | High | Up to ~30s stale public map content after edit |
| Trim featured-maps payload | Medium | Medium | Slightly more code; ensure type/mapper consistency |
| Client-side caching | Lower | Medium | More code; invalidation and staleness to manage |

**Practical order:** Implement **Tier 1** (featured-maps cache) first. Then check **Vercel Usage → Top Paths** to see how much FOT dropped and which paths dominate. If needed, add **Tier 2** (anonymous `/api/maps` cache and public map-page cache). Only then consider payload trimming or client-side caching.
