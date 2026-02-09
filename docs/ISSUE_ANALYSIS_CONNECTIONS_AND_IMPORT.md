# Issue Analysis: Connections Disappearing & XLSX Import Failing

This document lays out root-cause hypotheses, how to test them, and concrete plans for **Issue 1** (connections disappear after a while) and **Issue 2** (spreadsheet import fails with network error).

---

## Issue 1: Connections Disappear (Typically Overnight)

### Data flow (quick reference)

- **Read:** Map page loads via `GET /api/maps/[slug]/page` → Supabase `nodes` + `connections` by `map_id`.
- **Write:** 
  - `PUT /api/maps/[slug]/connections` replaces all connections for the map.
  - `PUT /api/maps/[slug]/nodes` **deletes all connections**, deletes all nodes, inserts new nodes, then **re-inserts connections from a prior fetch**. If that prior fetch failed or was empty due to an error, we effectively **wipe** connections.
- **Client:** MapExperience can call `persistConnections(slug, connections)`. If client state has `connections === []` (e.g. after a failed load), unmount or any save will overwrite server with empty connections.

### Hypothesis 1A: PUT /nodes wipes connections when fetch of existing connections fails (HIGH LIKELIHOOD)

**Idea:** In `app/api/maps/[slug]/nodes/route.ts`, we fetch existing connections before deleting nodes, then delete connections, delete nodes, insert nodes, and re-insert the fetched connections. We **do not check** the Supabase `error` from the connections fetch. So if that fetch fails (timeout, transient DB/RLS issue, cold start), we use `connectionRows = data ?? []` → `[]`, then delete all connections and re-insert none.

**Why “overnight”:** Cold starts, maintenance, or a scheduled process could make the connections fetch more likely to fail occasionally; any subsequent node save (from any client) would then wipe connections.

**How to test:**

1. **Code inspection:** Confirm the route does not check `error` from the connections select. (Done – it does not.)
2. **Fix and deploy:** Add an explicit check: if `connectionsResult.error` is set, return 500 and **do not** delete or modify connections. Redeploy and see if reports of disappearing connections stop.
3. **Logging:** Temporarily log `connectionsResult.error` and `connectionRows.length` in the nodes PUT; check logs after a reported disappearance to see if the fetch had failed.

**Fix (implemented in code):** In the nodes PUT handler, use the full result from the connections fetch (e.g. `connectionsResult`), check `connectionsResult.error`, and if present return 500 without deleting connections or nodes.

---

### Hypothesis 1B: Client overwrites server with empty connections after a failed load (MEDIUM LIKELIHOOD)

**Idea:** MapExperience loads nodes and connections in parallel. If `loadConnections()` fails (network, 500, timeout), the catch block sets `setConnections([])` and `connectionsRef.current = []`. Later, on unmount, the flush effect runs `persistConnections(slug, connectionsRef.current)` → `persistConnections(slug, [])`, which **overwrites** the server with an empty array. So one failed read + one tab close can wipe all connections for that map.

**Why “overnight”:** User leaves tab open; overnight a reload or background refresh fails to load connections; they close the tab in the morning and the unmount flush saves `[]`.

**How to test:**

1. **Reproduce:** In dev, temporarily make `GET /api/maps/[slug]/connections` return 500 or hang. Open map, see connections empty, close tab. Check DB: connections for that map should be empty.
2. **Mitigation:** In MapExperience unmount flush, only call `persistConnections` if we did not just fail to load (e.g. track “load failed” in a ref and skip flush of connections when that’s set), and/or do not flush connections when the current list is empty (could be “load failed” rather than “user deleted all”). Careful: we must still allow “user deleted all” to be saved. So better approach: on load failure, set a ref like `connectionsLoadFailedRef.current = true` and in the unmount flush, skip `persistConnections` when that’s true.

**Fix (recommended):** Add `connectionsLoadFailedRef` (and optionally `nodesLoadFailedRef`). In the load catch, set it to true. In the unmount flush, only call `persistConnections(slug, c)` when `!connectionsLoadFailedRef.current` (and similarly for nodes if desired).

---

### Hypothesis 1C: Stale client state from another tab or session (LOWER LIKELIHOOD)

**Idea:** Two tabs: Tab A has full data; Tab B loaded earlier when connections failed and has `connections = []`. Tab B saves (e.g. user edits a node) and overwrites server with empty connections.

**How to test:** Use two tabs, force Tab B to have empty connections (e.g. fail connections API in dev), then in Tab B trigger a node save. Check server.

**Mitigation:** Same as 1B (don’t persist empty connections when we know load failed), plus fixing 1A so the server never wipes connections due to a failed fetch.

---

### Hypothesis 1D: Supabase / infra (LOWER LIKELIHOOD)

**Idea:** RLS, triggers, cron, or backup restore deletes or truncates connections.

**How to test:** Check Supabase dashboard for triggers/cron; confirm no RLS policies that would delete rows (API uses service role, which bypasses RLS); check audit logs if available. Check whether “disappear” is always full wipe or sometimes partial.

---

### Plan for Issue 1 (summary)

| Priority | Action | Purpose |
|----------|--------|--------|
| 1 | **Fix nodes PUT:** Check connections fetch `error`; on failure return 500 and do not delete/re-insert connections. | Prevents server from ever wiping connections due to a failed read. |
| 2 | **Unmount flush guard:** In MapExperience, track load failure and skip persisting connections (and optionally nodes) on unmount when load had failed. | Prevents client from overwriting server with empty state after a failed load. |
| 3 | **Logging:** Log connections fetch error and row count in nodes PUT (temporarily) to confirm 1A in production. | Validates hypothesis and catches regressions. |
| 4 | **Optional:** Confirm no Supabase jobs/triggers and review RLS. | Rule out infra causes. |

---

## Issue 2: XLSX Import Fails with “Network error …”

### Import flow (quick reference)

1. User selects xlsx and clicks “Process upload” in Dashboard (Edit Map).
2. `getNodes(editingOriginalSlug)` → `GET /api/maps/[slug]/nodes`.
3. `getConnections(editingOriginalSlug)` → `GET /api/maps/[slug]/connections`.
4. `parseXlsxFile(uploadFile, existingNodes, existingConnections)` (client-side).
5. If any new nodes: `saveNodes(slug, [...existingNodes, ...result.nodesAdded])` → `PUT /api/maps/[slug]/nodes` (body can be large).
6. If any new connections: `saveConnections(slug, [...existingConnections, ...result.connectionsAdded])` → `PUT /api/maps/[slug]/connections`.

The generic “NetworkError when attempting to fetch resource” can be thrown by **any** of these fetches (steps 2, 3, 5, 6). It often means the request was closed or failed before an HTTP response (e.g. body size limit, timeout, connection reset).

### Hypothesis 2A: Request body over 1MB (or platform limit) on PUT (HIGH LIKELIHOOD)

**Idea:** Next.js (and some docs) suggest a default ~1MB body limit for Route Handlers. We added `experimental.serverActions.bodySizeLimit: '8mb'`, but that may apply only to Server Actions, not to Route Handlers. So `PUT /nodes` or `PUT /connections` with a large payload could be rejected or truncated before the handler runs, leading to a connection drop and a network error in the browser.

**How to test:**

1. **Identify failing step:** Add step-by-step error reporting in the Dashboard import handler: catch per step (getNodes, getConnections, parse, saveNodes, saveConnections) and set an error message like “Failed at: fetching existing nodes” / “… fetching connections” / “… saving nodes” / “… saving connections”. This tells you which request actually fails.
2. **Size check:** Before calling saveNodes/saveConnections, log (or show) `JSON.stringify([...existingNodes, ...result.nodesAdded]).length` and same for connections. If either is > ~1MB, body limit is a strong candidate.
3. **Config:** Try raising body limit for Route Handlers. Next 16 may use `experimental.proxyClientMaxBodySize` only when using proxy; without proxy, the applicable option might still be undocumented or different. Try adding `experimental.proxyClientMaxBodySize: '8mb'` as well and redeploy; if import starts working, body size was the cause.

**Fix (recommended):** (1) Add per-step error messages in the import flow. (2) Ensure both `serverActions.bodySizeLimit` and, if applicable, `proxyClientMaxBodySize` are set (e.g. 8mb). (3) If the failing step is “saving nodes” or “saving connections”, consider chunked saves (we already have chunking in `lib/data.ts` at 4MB; ensure it’s used and that the first chunk isn’t already over the platform limit).

---

### Hypothesis 2B: Timeout (serverless / Vercel) (MEDIUM LIKELIHOOD)

**Idea:** GET or PUT takes too long (cold start, large payload, slow Supabase). Vercel returns a timeout and the client sees a network error.

**How to test:** Check Vercel function logs for timeout errors. Add step-by-step errors to see if failure is on first GET (cold start) vs last PUT (large body + long insert).

**Mitigation:** Chunk nodes/connections so each request is smaller and faster; consider a dedicated “import” API that accepts multipart or streamed payload and does chunked inserts server-side to avoid one huge PUT.

---

### Hypothesis 2C: GET fails (auth, middleware, 404/500) (MEDIUM LIKELIHOOD)

**Idea:** Dashboard calls `getNodes` / `getConnections` with the map slug. If the user’s session is missing or the map is private and the combined page/API returns 404, or if middleware/Supabase has an issue, the fetch can fail in a way that surfaces as a generic network error.

**How to test:** Step-by-step error will show “Failed at: fetching existing nodes” or “fetching connections”. Check Network tab for status (401, 403, 404, 500). Confirm slug and auth for the map being edited.

---

### Hypothesis 2D: CORS / browser blocking (LOWER LIKELIHOOD)

**Idea:** Same-origin fetch shouldn’t hit CORS; but if the app is opened from a different origin or there’s a redirect, the browser might block.

**How to test:** Step-by-step error + Network tab to see if request is sent and what response (or error) appears.

---

### Plan for Issue 2 (summary)

| Priority | Action | Purpose |
|----------|--------|--------|
| 1 | **Step-by-step error reporting:** In the import button handler, wrap each step (getNodes, getConnections, parse, saveNodes, saveConnections) in try/catch and set a clear message (e.g. “Import failed while fetching existing nodes”, “… fetching connections”, “… saving nodes”, “… saving connections”). | Identify which exact request throws the network error. |
| 2 | **Body size config:** Keep `serverActions.bodySizeLimit: '8mb'`; add `experimental.proxyClientMaxBodySize: '8mb'` if the codebase uses proxy, and check Next 16 docs for Route Handler body limit. | Ensure large PUTs are allowed. |
| 3 | **Optional: chunked import in UI:** If “saving nodes” or “saving connections” fails, call save in smaller batches (e.g. 100 nodes at a time) so each request stays well under 1MB. | Work around platform limit even if config doesn’t take effect. |
| 4 | **Log payload size in dev:** In Dashboard, when import fails at save, log or display approximate payload size to confirm size-related failure. | Validate 2A. |

---

## Implementation checklist

- [ ] **Issue 1 – Nodes PUT:** In `app/api/maps/[slug]/nodes/route.ts`, fetch connections with full result, check `error`; if set, return 500 and do not delete connections or nodes.
- [ ] **Issue 1 – Unmount flush:** In MapExperience, add ref(s) for “connections (and optionally nodes) load failed”; set in load catch; in unmount flush, skip persisting connections when load had failed.
- [ ] **Issue 2 – Step-by-step errors:** In Dashboard import handler, catch per step and set `uploadError` to a message that includes which step failed.
- [ ] **Issue 2 – Body limit:** Verify next.config has appropriate body size for Route Handlers (and proxy if used); add proxyClientMaxBodySize if needed.
- [ ] **Optional:** Chunked save from Dashboard for very large imports; temporary logging in nodes PUT for connections fetch result.

After deploying the Issue 1 fixes, monitor whether connections still disappear. After adding Issue 2 step-by-step errors, reproduce the import and use the reported step to drive the next fix (body size, timeout, or auth/GET).

---

## Implemented (this pass)

- **Issue 1 – Nodes PUT:** `app/api/maps/[slug]/nodes/route.ts` now checks `connectionsResult.error`; on failure returns 500 and does not delete connections or nodes.
- **Issue 1 – Unmount flush guard:** `MapExperience` now tracks `nodesLoadFailedRef` and `connectionsLoadFailedRef`; on unmount it does not call `persistNodes`/`persistConnections` when the corresponding load had failed.
- **Issue 2 – Step-by-step errors:** Dashboard import handler now reports which step failed (fetching nodes, fetching connections, reading spreadsheet, saving nodes, saving connections).
- **Issue 2 – Config:** `next.config.mjs` has `serverActions.bodySizeLimit: '8mb'` and `experimental.proxyClientMaxBodySize: '8mb'`.
