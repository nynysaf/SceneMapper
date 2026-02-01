# Speed, Efficiency, and Simplicity Plan

**Goal:** Make the map page load faster and the codebase simpler, without breaking what works.

**Current working baseline:** Commit `334cbea` (fix: nodes/connections save (UUID + REGION), await saveNodes for new map). Tag: `speed-baseline`. Use as rollback if needed.

**Completed (Tiers 1–4):**
- Tier 1: Pass map from page; single load effect
- Tier 2: Parallel fetch at page level; map shell immediately
- Tier 3: Combined API `GET /api/maps/[slug]/page`
- Tier 4: Removed legacy SPA; documented data flow

---

## 1. Git: Rolling back to this working version

**Yes — it’s straightforward to return to this state at any time.**

### Option A: Tag the current state (recommended before speed work)

```bash
git tag speed-baseline 334cbea
git push origin speed-baseline
```

- **To return later:** `git checkout speed-baseline` (detached) or create a branch from it: `git checkout -b restore-baseline speed-baseline`.
- **To redeploy this version:** Check out that commit (or the tag), push to `main`, and Vercel will deploy it.

### Option B: Work on a branch; merge only when ready

```bash
git checkout -b speed-improvements
# do changes, commit, test locally
# when happy: git checkout main && git merge speed-improvements && git push
# if not: stay on main or discard the branch
```

- **To roll back:** Don’t merge; or merge then revert the merge commit; or reset `main` to the commit before the merge (if you haven’t shared that history).

### Option C: Revert a specific commit after deploying

If you deploy a speed change and it breaks something:

```bash
git revert <commit-hash> --no-edit
git push origin main
```

- Creates a new commit that undoes the change. Safe for shared branches.

**Recommendation:** Before starting speed work, run `git tag speed-baseline` (and optionally push the tag). Then do speed work on a branch (`speed-improvements`). You can always go back to `speed-baseline` or `main` at the last known-good commit.

---

## 2. Test locally first, then deploy

**Recommendation: get it working locally in a production-like setup before deploying.**

- **Why:** Map page behavior depends on the **backend** (API + Supabase). If you test only with `NEXT_PUBLIC_USE_BACKEND=false` (localStorage), you won’t exercise the same paths as production (parallel fetches, duplicate map calls, cold start). So speed and correctness can differ.
- **How:**
  1. In `.env.local`: set `NEXT_PUBLIC_USE_BACKEND=true` and the **same** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as production (or a copy of prod DB).
  2. Run `npm run build && npm run start` (production build + server).
  3. Open `/maps/<slug>` for a real map: confirm map, theme, nodes, and connections load; no regressions; measure or compare load time.
  4. When satisfied, commit, push to your branch (or `main`), and let Vercel deploy. Do a short smoke test on the live URL after deploy.

**Optional:** You can deploy to a **Vercel Preview** branch (e.g. push `speed-improvements`) and test the preview URL before merging to `main`. That’s “test while deploying” on a non-production URL. Still better to have already verified locally with backend on.

**Summary:** Prefer **local production-like test first** (backend on, same Supabase as prod). Then deploy (main or preview). Roll back via tag/revert if something breaks in production.

---

## 3. Changes by impact vs risk

### Tier 1: Most worth attempting (high impact, low risk)

These remove duplicate work and reduce round-trips without changing API contracts or DB. Easy to test locally and easy to revert.

| Change | What | Why high value | Why low risk |
|--------|------|----------------|--------------|
| **1. Pass map from page into MapExperience** | Page fetches `getMapBySlug(slug)` once. Pass the result as props (e.g. `map` or `mapTheme` + display settings). MapExperience **stops** calling `getMapBySlug` for “display settings” and for “role” (use passed map’s `adminIds`/`collaboratorIds` with session). | Cuts 2 of 3 GET /api/maps/[slug] calls → fewer cold starts and less latency. | Same data, same UI; only the source of the data changes (props instead of refetch). |
| **2. Single load effect in MapExperience** | Replace the several `useEffect`s that each fetch (map, nodes, connections, users, session) with **one** effect that runs `Promise.all([loadNodes(slug), loadConnections(slug), getUsers(), getSession()])` (and no extra getMapBySlug if map is passed from page). Set all state from that one result. | One parallel batch instead of overlapping effects; clearer data flow; still only one request per resource. | Same endpoints, same data; only orchestration and state updates change. |

**Order:** Do (1) first so MapExperience no longer needs to fetch the map. Then do (2) so nodes/connections/users/session load in one coordinated parallel batch. Test after each step.

---

### Tier 2: Nice to have (good impact, low–medium risk)

Worth doing after Tier 1 is in place and stable.

| Change | What | Why nice to have | Risk / effort |
|--------|------|------------------|----------------|
| **3. Parallel fetch at page level** | Page runs `Promise.all([getMapBySlug(slug), loadNodes(slug), loadConnections(slug)])` (and optionally getSession if needed for “map not found” vs auth). Then passes map + nodes + connections into MapExperience. | Map, nodes, and connections load in parallel; time to “everything ready” ≈ max of the three, not sum. | Slightly larger change to page and MapExperience (they receive more props or a single “page data” object). Test that MapExperience still handles loading/empty states. |
| **4. Show map shell immediately** | Page renders MapExperience as soon as slug is known, with a loading state (e.g. skeleton or “Loading map…”) and optional default theme. Data fetches (map, nodes, connections) run in parallel; when they resolve, update state and show content. | User sees layout and progress quickly; perceived speed improves even if total time is similar. | Need clear loading/error states so we don’t flash wrong or empty content. |

---

### Tier 3: Higher impact, more effort or risk

Consider only after Tier 1 (and optionally Tier 2) are done and you want to go further.

| Change | What | Why higher impact | Risk / effort |
|--------|------|-------------------|----------------|
| **5. Combined “map page” API** | New route e.g. GET /api/maps/[slug]/page that returns `{ map, nodes, connections }` in one response (server does 3 Supabase queries and returns one JSON). Client calls this once instead of 3 separate GETs. | One HTTP round-trip and one cold start for map + nodes + connections; fewer requests. | New route and client change; need to keep existing GET /api/maps/[slug], nodes, connections for edit/save flows or deprecate carefully. |
| **6. Short TTL cache** | Add caching (e.g. Cache-Control or Vercel config) for GET /api/maps/[slug] (and optionally nodes/connections) with a short TTL (e.g. 60 s). | Repeat visits or duplicate calls hit cache; cold start and Supabase cost reduced for cached requests. | Stale data for up to TTL; need to invalidate or accept staleness for map/nodes/connections. |
| **7. Prefetch from Dashboard** | When the user hovers or sees a map card on Dashboard, prefetch GET /api/maps/[slug] (and optionally nodes/connections). When they click through, data may already be in cache. | Click-to-map feels instant if prefetch completed. | Extra requests; need to avoid thundering herd and respect user navigation (e.g. cancel prefetch if they navigate away). |

---

### Tier 4: Cleanup and simplicity (no direct speed gain)

Do when you want simpler code; can be done alongside or after Tier 1.

| Change | What | Why | Risk |
|--------|------|-----|------|
| **8. Remove dead or duplicate logic** | After (1), delete any MapExperience code that was only used to fetch the map again; ensure one place “owns” map for the page. | Less code, single source of truth. | Low if Tier 1 is correct. |
| **9. Document data flow** | Short doc or comments: “Map page fetches map once and passes to MapExperience; MapExperience loads nodes/connections in one effect.” | Easier for future changes and onboarding. | None. |

---

## 4. Suggested order of work

1. **Tag baseline:** `git tag speed-baseline` (and push if you want it on the server).
2. **Branch:** `git checkout -b speed-improvements`.
3. **Tier 1.1:** Pass map from page into MapExperience; remove duplicate getMapBySlug in MapExperience. Build, test locally with backend on, smoke test map page.
4. **Tier 1.2:** Single load effect in MapExperience (nodes, connections, users, session in one Promise.all). Build, test locally again.
5. **If all good:** Merge to `main` (or open PR), deploy, smoke test on production. If anything breaks, revert or checkout `speed-baseline`.
6. **Later (optional):** Tier 2 (parallel at page, shell first), then Tier 3 if you want (combined API, cache, prefetch).

---

## 5. Rollback and testing summary

| Question | Answer |
|----------|--------|
| **Is it easy to roll back to this working version?** | Yes. Tag current commit (`speed-baseline`). Then you can `git checkout speed-baseline` or revert a bad commit. |
| **Test while deploying or build local first?** | Prefer **build and test locally first** with production-like env (`NEXT_PUBLIC_USE_BACKEND=true`, same Supabase). Then deploy. Optional: deploy to a Vercel Preview branch and test that URL before merging to `main`. |
| **Which changes are most worth attempting?** | **Tier 1:** (1) Pass map from page, remove duplicate getMapBySlug; (2) Single load effect in MapExperience. High impact, low risk. |
| **Which are nice-to-have or risky?** | **Tier 2:** Parallel at page, show shell immediately (nice to have). **Tier 3:** Combined API, cache, prefetch (higher impact but more effort/risk). **Tier 4:** Cleanup and docs (simplicity, no direct speed gain). |

This plan keeps the current behavior intact while giving you a clear, reversible path to faster load and simpler code.
