# Plan: Connections Recovery & Public Unauthenticated Submissions

This document outlines the plan to fix two issues:

1. **Issue 1**: Connections count is 0 for emerging-scene-toronto — connections were wiped; restore options and prevention
2. **Issue 2**: Allow public users (including unauthenticated) to submit nodes/connections that persist so admins can approve them later

---

## Issue 1: Connections Wiped (Count = 0)

### Current State

- Supabase `connections` table has 0 rows for `emerging-scene-toronto`
- Connections cannot be recovered without a backup

### Recovery Options

| Option | Effort | Notes |
|--------|--------|-------|
| **Supabase backup restore** | Low | If Point-in-Time Recovery (PITR) or daily backups are enabled, restore the `connections` table (or full DB) to a date before the wipe. |
| **Export from another source** | Medium | If a CSV/XLSX export or another environment (staging, local) has the connections data, re-import via Dashboard. |
| **Manual re-creation** | High | Recreate connections by hand; only feasible for small maps. |
| **Accept loss** | None | If no backup exists, data is unrecoverable. |

### Prevention (Already Implemented)

The codebase already has mitigations in place (see `docs/ISSUE_ANALYSIS_CONNECTIONS_AND_IMPORT.md`):

- **Nodes PUT**: Checks `connectionsResult.error`; on failure returns 500 without modifying connections
- **Unmount flush guard**: `connectionsLoadFailedRef` prevents client from overwriting server with empty connections after a failed load

### Recommended Next Steps for Issue 1

1. Check Supabase Dashboard → Project Settings → Backups for PITR or daily backups
2. If backups exist: restore `connections` (or point-in-time) to recover data
3. If no backups: enable Supabase backups for future incidents
4. Optional: Add a "connections restored from backup" note for emerging-scene-toronto

---

## Issue 2: Public Unauthenticated Submissions

### Goal

- **Public users** (logged in or not) can add nodes and connections via the existing Add flow
- Submissions **persist** to the database with `status: 'pending'`
- Admins can approve/deny days later via the existing AdminReviewModal
- No login required

### Current Flow (Broken for Public)

1. User opens map → Add → SubmissionModal → places node
2. `saveNodes(newNodes)` → `PUT /api/maps/[slug]/nodes` (full replace)
3. PUT requires auth + `canEditMap` → 403 for public
4. Error is swallowed; node appears in UI but never saved
5. On reload, node is gone

### Design Overview

Introduce **insert-only** submission endpoints that:

- Do **not** require authentication
- Accept a **single** node or connection
- Insert into `nodes` / `connections` with `status: 'pending'`
- Use `collaborator_id: 'Public'` for anonymous submissions
- Only allow on maps that are publicly viewable

Admins and collaborators continue to use the existing PUT endpoints (full replace). Public users use the new POST endpoints.

---

### Phase 2.1: New API Endpoints

#### A. POST `/api/maps/[slug]/submissions/nodes`

**Purpose**: Insert a single node for public submission.

**Auth**: None required.

**Access control**:

- Map must exist and be publicly viewable (`public_view = true`)
- Optional: add `allow_public_submissions` column (default true) for future per-map control

**Request body**:

```json
{
  "type": "EVENT",
  "title": "TOREVENT.ca",
  "description": "...",
  "website": "https://torevent.ca",
  "x": 50,
  "y": 30,
  "tags": ["..."],
  "primaryTag": "other"
}
```

**Validation**:

- Required: `type`, `title`, `x`, `y`
- `type` must be in allowed node types (EVENT, PERSON, SPACE, etc.) per map `enabled_node_types`
- `x`, `y` in 0–100
- `website` URL format if present
- `tags` array, `primaryTag` string

**Response**:

- `201`: `{ "id": "uuid", "ok": true }`
- `400`: validation error
- `404`: map not found or not public

**Implementation notes**:

- Generate UUID for `id`
- `collaborator_id`: `'Public'` when no session; otherwise session name
- `status`: `'pending'`
- Use existing `mapNodeToDbNode` where applicable; build minimal row for insert

#### B. POST `/api/maps/[slug]/submissions/connections`

**Purpose**: Insert a single connection for public submission.

**Auth**: None required.

**Request body**:

```json
{
  "fromNodeId": "uuid",
  "toNodeId": "uuid",
  "description": "Optional description"
}
```

**Validation**:

- `fromNodeId`, `toNodeId` must exist in `nodes` for this map
- Both nodes must be approved or pending (no restriction for now)
- Map `connections_enabled` must be true (if we add per-map connection toggle)

**Response**:

- `201`: `{ "id": "uuid", "ok": true }`
- `400`: validation error (invalid nodes, etc.)
- `404`: map not found or not public

---

### Phase 2.2: Client Data Layer

Add functions in `lib/data.ts`:

```ts
// Submit a single node (public, no auth)
async function submitNodeApi(mapSlug: string, node: Omit<MapNode, 'id' | 'collaboratorId' | 'status'>): Promise<{ id: string }>

// Submit a single connection (public, no auth)
async function submitConnectionApi(mapSlug: string, connection: { fromNodeId: string; toNodeId: string; description?: string }): Promise<{ id: string }>
```

- Call `POST /api/maps/[slug]/submissions/nodes` and `.../connections`
- Return the created `id` for optimistic UI or refetch
- Throw on non-2xx with error message from response

---

### Phase 2.3: MapExperience Flow Changes

**Current**: Public user places node → `saveNodes(newNodes)` → PUT (fails 403).

**New**:

1. **Detect public submission**: When `userSession.role === 'public'` (or no session)
2. **Node submission**:
   - On map click with `pendingNode`, call `submitNodeApi(slug, nodeData)` instead of `saveNodes`
   - On success: append the returned node (with server `id`) to local `nodes` state so it appears immediately
   - On failure: show toast/alert with error message
3. **Connection submission**:
   - When public user submits connection from SubmissionModal, call `submitConnectionApi` instead of `saveConnections`
   - On success: append to local `connections` state
   - On failure: show error
4. **Collaborators/Admins**: Unchanged; continue using `saveNodes` / `saveConnections` (PUT)

**Refetch after submit**: Optionally refetch nodes/connections from the page API after a successful public submit so the new item is in sync. Simpler: just append optimistically and rely on next page load.

---

### Phase 2.4: Session / Role Handling

- `userSession.role === 'public'` when:
  - Not logged in, or
  - Logged in but not in `admin_ids` or `collaborator_ids`
- For `submitNodeApi` / `submitConnectionApi`, no credentials needed; `collaborator_id` will be `'Public'` for anonymous
- If logged in as public, we could pass `collaborator_id: userSession.name` — requires a small change so the submission API can optionally receive a "display name" from a cookie/header. **Simplest**: always use `'Public'` for the new POST endpoints; we can refine later.

---

### Phase 2.5: Security & Rate Limiting

| Concern | Mitigation |
|---------|------------|
| Spam | Rate limit by IP: e.g. 10 node + 10 connection submissions per hour per map |
| Abuse | Validate input (type, length, URL format); reject obviously malicious content |
| Private maps | Only allow POST on maps with `public_view = true` |
| Invalid node refs | For connections, verify `fromNodeId`/`toNodeId` exist and belong to the map |

**Rate limiting options**:

- Vercel: use `@upstash/ratelimit` or similar with Redis
- Or: simple in-memory/store rate limit per IP (reset on deploy)
- Or: defer rate limiting to Phase 2.6 if not critical for MVP

---

### Phase 2.6: Optional Enhancements

- **Map-level toggle**: `allow_public_submissions` on `maps` to disable public submission per map
- **Display name**: Allow optional "Your name" field for public submissions so `collaborator_id` can be "John (Public)" instead of "Public"
- **Daily digest**: Existing daily digest already emails admins about pending submissions; ensure it includes public submissions
- **Honeypot / CAPTCHA**: If spam becomes an issue, add a simple honeypot or CAPTCHA for public submission form

---

### Implementation Order

| Step | Task | Depends on |
|------|------|------------|
| 1 | Add `POST /api/maps/[slug]/submissions/nodes` | - |
| 2 | Add `POST /api/maps/[slug]/submissions/connections` | - |
| 3 | Add `submitNodeApi` and `submitConnectionApi` in `lib/data.ts` | 1, 2 |
| 4 | Update MapExperience: use `submitNodeApi` when public user places node | 3 |
| 5 | Update MapExperience: use `submitConnectionApi` when public user submits connection | 3 |
| 6 | Add basic rate limiting (optional, can defer) | 1, 2 |
| 7 | Add user-facing error messages when submit fails | 4, 5 |

---

### Files to Create/Modify

| File | Action |
|------|--------|
| `app/api/maps/[slug]/submissions/nodes/route.ts` | Create — POST handler |
| `app/api/maps/[slug]/submissions/connections/route.ts` | Create — POST handler |
| `lib/data.ts` | Add `submitNode`, `submitConnection` (or `submitNodeApi`, `submitConnectionApi`) |
| `components/MapExperience.tsx` | Use submit API for public users in `handleMapClick`, `handleSubmitConnection` |
| `components/SubmissionModal.tsx` | No change if connection flow is handled in MapExperience; ensure connection submit path calls new API when public |

---

### Testing Checklist

- [ ] Unauthenticated user can add a node; it persists and appears in admin review queue
- [ ] Unauthenticated user can add a connection between two existing nodes; it persists
- [ ] Admin can approve/deny public submissions in AdminReviewModal
- [ ] Approved nodes/connections appear on map for all users
- [ ] Private map returns 404 for submission endpoints
- [ ] Invalid data (bad node refs, invalid type) returns 400
- [ ] Collaborator/admin flow unchanged; still uses PUT and works as before
- [ ] Daily digest email includes public submissions (if applicable)
