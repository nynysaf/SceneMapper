# Data Layer & Backend Plan

**Goal:** Introduce a single data layer, then swap it to a real backend so we can deploy on a free server with light data. Features will be added after the backend is built and tested.

**Constraints:** Light data, free-tier hosting (e.g. Vercel + free DB).

**Session state:** Phase 1 complete (data layer + refactor). Phase 2 schema and env template added (`supabase/migrations/`, `.env.example`, `docs/SUPABASE_PHASE2_SETUP.md`). Phase 3 API routes exist as stubs; next: create Supabase project and run migration, then wire routes to DB and add `NEXT_PUBLIC_USE_BACKEND` switch in `lib/data.ts`.

---

## Phase 1: Data layer (localStorage-backed)

### 1.1 Define the API surface

Create **`lib/data.ts`** with a single abstraction used by the whole app. No component or page should call `localStorage` directly.

**Maps**

| Function | Purpose |
|----------|--------|
| `getMaps(): Promise<SceneMap[]>` | All maps (for dashboard and map list). |
| `getMapBySlug(slug: string): Promise<SceneMap \| null>` | Single map by slug (for map page). |
| `saveMaps(maps: SceneMap[]): Promise<void>` | Replace all maps (create/update/delete). |

**Nodes**

| Function | Purpose |
|----------|--------|
| `getNodes(mapSlug: string): Promise<MapNode[]>` | Nodes for a map; hide `torontopia_nodes` vs `scene_mapper_nodes_${slug}`. |
| `saveNodes(mapSlug: string, nodes: MapNode[]): Promise<void>` | Persist nodes for a map. |

**Users & auth**

| Function | Purpose |
|----------|--------|
| `getUsers(): Promise<User[]>` | All users (local only until backend). |
| `saveUsers(users: User[]): Promise<void>` | Replace all users. |
| `getSession(): Promise<AuthSession \| null>` | Current session. |
| `saveSession(session: AuthSession): Promise<void>` | Set session (login). |
| `clearSession(): Promise<void>` | Logout. |

All functions are **async** so we can later swap to `fetch()` without changing call sites.

### 1.2 Implement with localStorage

- **`lib/data.ts`**: Implement every function above using `localStorage` and the existing keys:
  - Maps: `sceneMapper_maps`
  - Users: `sceneMapper_users`
  - Session: `sceneMapper_session`
  - Nodes: for `slug === 'torontopia'` use `torontopia_nodes`, else `scene_mapper_nodes_${slug}`.
- Keep **no** raw `localStorage` usage outside `lib/data.ts` (and optionally a small `lib/storage-keys.ts` if you want constants in one place).

### 1.3 Refactor call sites

Replace every direct `localStorage` read/write with the new API:

| File | Changes |
|------|--------|
| **`components/Dashboard.tsx`** | Use `getMaps()` / `saveMaps()` instead of `MAPS_STORAGE_KEY` and raw get/set. |
| **`components/MapExperience.tsx`** | Use `getNodes(mapSlug)`, `saveNodes(mapSlug, nodes)`; use `getUsers()`, `getSession()`, `getMaps()` for role hydration; use `getMapBySlug` + `saveMaps` when updating map (e.g. on approve). Pass `mapSlug` instead of `storageKey` where possible. |
| **`app/dashboard/page.tsx`** | Use `getUsers()`, `getSession()`, `saveUsers()`, `saveSession()`, `clearSession()` for auth; remove local `getUsers` and key constants. |
| **`app/maps/[slug]/page.tsx`** | Use `getMapBySlug(slug)` instead of reading `sceneMapper_maps`; pass `mapSlug` (e.g. `slug`) to `MapExperience` so it can call `getNodes(slug)` / `saveNodes(slug, nodes)`. |
| **`App.tsx`** | If it still touches auth/storage, switch to `getSession()`, `getUsers()`, etc. (or remove duplication if dashboard/page owns auth). |

After this phase, the app should behave exactly as before, but all persistence goes through `lib/data.ts`.

### 1.4 Checklist (Phase 1)

- [x] `lib/data.ts` exists with all functions above, implemented via localStorage.
- [x] No `localStorage` or `sessionStorage` in `components/`, `app/`, or root `App.tsx`.
- [x] Dashboard: load/save maps via data layer.
- [x] Map page: load map by slug via data layer; MapExperience loads/saves nodes by slug.
- [x] Auth (signup/login/logout) uses data layer only.
- [x] Manual smoke test: create map, add node, login, view map — all still work.

---

## Phase 2: Backend choice and schema

### 2.1 Recommended stack (free, light data)

| Layer | Choice | Why |
|-------|--------|-----|
| **App host** | **Vercel** (free) | Next.js fits perfectly; free tier is enough for light traffic. |
| **Database** | **Supabase** (free) | Postgres, 500MB free; built-in Auth; optional real-time; works well with Next.js. |

Alternative: **Vercel Postgres (Neon)** if you prefer everything under Vercel; schema below still applies (Postgres).

### 2.2 Minimal schema (Supabase/Postgres)

**users** (if not using Supabase Auth; otherwise skip and use `auth.users`)

- `id` (uuid, PK)
- `email` (text, unique)
- `name` (text)
- `password_hash` (text) — use Supabase Auth or a simple hash (e.g. bcrypt) in an API route; never store plain passwords.

**maps**

- `id` (uuid, PK)
- `slug` (text, unique)
- `title`, `description` (text)
- `background_image_url` (text, nullable)
- `theme` (jsonb) — store `MapTheme` as JSON
- `collaborator_password_hash` (text, nullable) — optional; hash if you store it
- `admin_ids` (text[] or uuid[])
- `collaborator_ids` (text[])
- `public_view` (boolean)
- `theme_id` (text, nullable)
- `invited_admin_emails`, `invited_collaborator_emails` (text[], nullable)
- `created_at`, `updated_at` (timestamptz)

**nodes**

- `id` (uuid, PK)
- `map_id` (uuid, FK → maps.id)
- `type` (text) — EVENT | PERSON | SPACE | COMMUNITY
- `title`, `description` (text)
- `website` (text, nullable)
- `x`, `y` (numeric) — 0–100
- `tags` (text[])
- `primary_tag` (text)
- `collaborator_id` (text)
- `status` (text) — pending | approved
- `created_at`, `updated_at` (timestamptz)

Use **Row Level Security (RLS)** so that only your backend (service role) or authenticated users (if you use Supabase Auth) can read/write as needed. For simplicity, you can do all writes through Next.js API routes using the **service role** key so the client never talks to Supabase directly.

### 2.3 Environment

- `NEXT_PUBLIC_APP_URL` — base URL of the app (for API calls if needed).
- `SUPABASE_URL` — Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; used in API routes. Never expose to client.

See **`.env.example`** for a template and **`docs/SUPABASE_PHASE2_SETUP.md`** for step-by-step setup.

### 2.4 Phase 2 checklist

- [x] Schema defined in `supabase/migrations/20250129000001_initial_schema.sql` (users, maps, nodes, RLS, updated_at triggers).
- [x] `.env.example` created with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`.
- [x] Setup guide added: `docs/SUPABASE_PHASE2_SETUP.md`.
- [ ] Create Supabase project at [supabase.com/dashboard](https://supabase.com/dashboard).
- [ ] Run the migration (SQL Editor or `supabase db push`).
- [ ] Copy `.env.example` to `.env.local` and set the three env vars.

---

## Phase 3: Backend implementation

### 3.1 API routes (Next.js)

Create routes that mirror the data layer so the client can stay unchanged except for the implementation of `lib/data.ts`.

| Route | Method | Purpose |
|-------|--------|--------|
| `/api/maps` | GET | Return all maps (or filter by user later). |
| `/api/maps` | POST | Create or replace maps (body: array or single; design to match `saveMaps` usage). |
| `/api/maps/[slug]` | GET | Return one map by slug. |
| `/api/maps/[slug]/nodes` | GET | Return nodes for map. |
| `/api/maps/[slug]/nodes` | PUT or POST | Save nodes for map (body: array). |
| `/api/users` | GET | Return users (or “current user” only when you add auth). |
| `/api/users` | POST | Signup: create user, return session. |
| `/api/auth/login` | POST | Login: validate, return session. |
| `/api/auth/logout` | POST | Clear session (cookie or client-side only). |
| `/api/auth/session` | GET | Return current session if any. |

Use **Supabase server client** in these routes (create one in `lib/supabase-server.ts` using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`). No Supabase client on the front end if you want maximum control and security from the start; the front end only calls these APIs.

### 3.2 Implement “backend” data layer

Add a second implementation of the same data layer that uses `fetch()` to your API routes instead of localStorage.

- **Option A (recommended):** One implementation file that chooses backend vs local by env, e.g.  
  `NEXT_PUBLIC_USE_BACKEND=true` → use `fetch('/api/...')`; otherwise use localStorage in the same functions. All in `lib/data.ts`.
- **Option B:** Two modules: `lib/data-local.ts` and `lib/data-api.ts`, and a thin `lib/data.ts` that exports from one or the other based on env.

Implement every existing data-layer function against the API (e.g. `getMaps()` → `fetch('/api/maps')`, `saveNodes(slug, nodes)` → `fetch('/api/maps/' + slug + '/nodes', { method: 'PUT', body: JSON.stringify(nodes) })`, etc.). Keep the same function signatures and return types so no component changes are required.

### 3.3 Auth handling

- **Short term:** Session can be an in-memory or cookie-backed “session id” that the API validates against the `users` table (or Supabase Auth). For minimal change, keep storing `AuthSession` (e.g. `{ userId }`) in the client (or in an httpOnly cookie) and have API routes accept a header or cookie to identify the user.
- **Later:** Replace with Supabase Auth (signUp/signInWithPassword) and use JWT in cookies or Authorization header; API routes then use Supabase to get the current user.

### 3.4 Checklist (Phase 3)

- [ ] Supabase project created; tables `users`, `maps`, `nodes` created (and RLS if desired).
- [x] `lib/supabase-server.ts` for server-side Supabase client.
- [x] API routes wired to Supabase (`lib/db-mappers.ts`, `lib/password.ts`, `lib/session-cookie.ts`; maps, users, auth).
- [x] `lib/data.ts` calls these APIs when `NEXT_PUBLIC_USE_BACKEND=true`; otherwise uses localStorage.
- [ ] Env vars set locally; full flow works against Supabase (signup, login, create map, add node, approve, view map).

---

## Phase 4: Data migration (optional) — done: /dashboard/import tool

- **One-time:** If you need to keep existing localStorage data:
  - Add a small “Import from browser” tool (or a script) that reads `sceneMapper_maps`, `sceneMapper_users`, `scene_mapper_nodes_*`, `torontopia_nodes`, and `scene_mapper_connections_*` / `torontopia_connections` from localStorage and POSTs them to your API (maps, users, nodes, connections) so they get inserted into Supabase. Run the connections migration (`20250130000001_connections.sql`) after the initial schema; see **`docs/SUPABASE_PHASE2_SETUP.md`** step 2.
- Or seed the DB manually and drop localStorage usage once the backend is the source of truth.

---

## Phase 5: Testing

- [ ] **Auth:** Signup, login, logout; session persists across reload when using backend.
- [ ] **Maps:** Create map, edit map, list maps; data comes from DB.
- [ ] **Nodes:** Open map, add node, move node, approve node (admin); nodes load/save via API.
- [ ] **Map view:** Public view works; collaborator password and roles behave as before.
- [ ] **Free-tier:** Confirm Supabase and Vercel usage stay within free limits (light data and traffic).

---

## Phase 6: Deployment

**Full order:** [DEPLOYMENT_SEQUENCE.md](./DEPLOYMENT_SEQUENCE.md) (GitHub → Supabase → Vercel → optional domain → Resend).
- [ ] **Step 1 (GitHub):** Commit and push all latest code.
- [ ] **Step 2 (Supabase):** Run all migrations (initial_schema, connections, invitation_emails).
- [ ] **Step 3 (Vercel):** Import repo, set env vars; deploy (free *.vercel.app URL).
- [ ] **Step 4 (optional) Domain:** Buy domain and add in Vercel when wanted.
- [ ] **Step 5 (Resend):** Add RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel; test invitations.
- [ ] Remove or hide “local only” mode in production (e.g. `NEXT_PUBLIC_USE_BACKEND=true` always in prod).
- [ ] Smoke test on deployed URL: signup, create map, add node, view map.

---

## Order of work (summary)

1. **Phase 1:** Data layer + localStorage implementation + refactor all call sites. Test locally.
2. **Phase 2:** Create Supabase project, define tables, set env.
3. **Phase 3:** Implement API routes and backend-backed data layer; test locally with backend on.
4. **Phase 4:** Optional migration from localStorage.
5. **Phase 5:** Full testing checklist.
6. **Phase 6:** Deploy to Vercel, point to Supabase, verify.
7. **Phase 7:** Connections — types & theme (7.1) → schema & data layer (7.2) → theme UI (7.3) → submission modal (7.4) → MapExperience flow (7.5) → admin review (7.6) → map render (7.7) → curve editing (7.8).

After this, the app runs on a free server with a real database; you can add new features on top of the existing data layer and API.

---

## Phase 7: Connections (node-to-node lines)

**Goal:** Users can add “connections” between two nodes. Connections appear as curved lines on the map. Public users submit for review; collaborators and admins add immediately. Admins review connection submissions like node submissions. Each theme can style connection lines (colour, opacity, thickness). Collaborators and admins can drag a line to adjust its curve; the curve is persisted.

**Order of work below is dependency-aware:** data model → data layer & API → theme UI → submission & review → map render → curve editing.

### 7.1 Types and theme extension

- **`types.ts`**
  - Add interface **`MapConnection`**: `id`, `fromNodeId`, `toNodeId`, `description`, `collaboratorId`, `status` (`'pending' | 'approved'`), optional curve control (e.g. `curveOffsetX`, `curveOffsetY` in 0–100 or a single control point) so the line can be a quadratic Bezier.
  - Extend **`MapTheme`** with optional **`connectionLine`**: `{ color: string; opacity: number; thickness: number }`. Each theme preset can define its own; create/edit map will allow overrides.
- **Backward compatibility:** Existing maps without `connectionLine` use a sensible default (e.g. theme primary colour, 0.6 opacity, 2px).

### 7.2 Schema and data layer

- **Database**
  - Add table **`connections`**: `id` (uuid, PK), `map_id` (uuid, FK → maps.id), `from_node_id` (uuid, FK → nodes.id), `to_node_id` (uuid, FK → nodes.id), `description` (text), `collaborator_id` (text), `status` (text: pending | approved), `curve_offset_x`, `curve_offset_y` (numeric, nullable, 0–100 for Bezier control offset), `created_at`, `updated_at`. Add RLS and `updated_at` trigger. New migration file in `supabase/migrations/`.
- **Maps table:** No change required; connection line style lives in existing `theme` jsonb (MapTheme.connectionLine).
- **localStorage**
  - New key pattern: same as nodes — e.g. `scene_mapper_connections_${slug}` and `torontopia_connections` for slug `torontopia`. Store `MapConnection[]`.
- **`lib/data.ts`**
  - Add **`getConnections(mapSlug: string): Promise<MapConnection[]>`** and **`saveConnections(mapSlug: string, connections: MapConnection[]): Promise<void>`** for both localStorage and API.
- **API**
  - **GET** `/api/maps/[slug]/connections` — return connections for map.
  - **PUT** (or POST) `/api/maps/[slug]/connections` — replace connections for map (body: array).
  - Wire routes to Supabase via `lib/db-mappers.ts` (or equivalent) when backend is used.
- **Import tool:** `/dashboard/import` imports connections from localStorage (keys `torontopia_connections`, `scene_mapper_connections_${slug}`) when present.

### 7.3 Create / Edit map — connection line theme

- In **Dashboard** (create map and edit map flows), in the **themes** section, add a subsection **“Connection lines”**.
  - Controls: colour (e.g. colour input), opacity (slider 0–1), thickness (number or slider, e.g. 1–6 px).
  - Each theme preset (e.g. Solarpunk Emerald, Night Orbit) should define a default `connectionLine`; the UI shows the current theme’s values and allows overrides (stored in map’s `theme.connectionLine`).
  - Persist in the map’s `theme` when saving; no DB schema change beyond existing `theme` jsonb.

### 7.4 Submission modal — Connection type

- In **`SubmissionModal`**:
  - Add **“Connection”** as a choice alongside Event, Person, Space, Community (e.g. a fifth button “Connection”).
  - When **Connection** is selected, show a different form:
    - **From:** dropdown of all approved nodes in the map, listed alphabetically by title.
    - **To:** same dropdown (allow same node if product accepts, or disable same-node).
    - **Description:** same as node description (textarea).
  - No x/y placement step for connections; submission only needs From, To, Description.
  - **Permissions:** Same as nodes — Public submits as `status: 'pending'`; Collaborator/Admin submit as `status: 'approved'`. Parent decides based on `userRole` and passes an `onSubmitConnection(connection: Partial<MapConnection>)` (or extend existing submit) so **MapExperience** can add to pending list or approved list and persist.

### 7.5 MapExperience — connection state and submit flow

- **MapExperience** (or equivalent owner of SubmissionModal and Map):
  - Load **connections** via `getConnections(mapSlug)`; hold in state; pass approved connections (and optionally pending for admin preview) to **Map**.
  - When user submits a **connection** from SubmissionModal, either append to pending or to approved connections based on role, then call **`saveConnections(mapSlug, connections)`**.
  - Pass **pending connections** into **AdminReviewModal** (see 7.6).
  - Ensure “Add” button or flow opens SubmissionModal with both node and connection options (already implied by “Connection” in the type list).

### 7.6 Admin review — pending connections

- **AdminReviewModal**
  - Extend to accept **pending connections** as well as pending nodes (e.g. `pendingConnections: MapConnection[]`, `onApproveConnection(id)`, `onDenyConnection(id)`).
  - For each pending connection, show **From** (node title), **To** (node title), **Description**, and Approve/Deny. Resolve node titles from current `nodes` (or map) so admins see “From: X → To: Y”.
  - On Approve: move connection from pending to approved (update status, then `saveConnections`). On Deny: remove from list and `saveConnections`.

### 7.7 Map — render connection lines

- **Map** component:
  - Accept **connections** (e.g. `MapConnection[]`) and **nodes** (to resolve `fromNodeId` / `toNodeId` to x,y). Accept **connection line style** from theme (color, opacity, thickness); default when missing.
  - Render connection lines **under** nodes (so nodes stay on top). For each approved connection, resolve from/to coordinates (nodes use 0–100; Map uses e.g. `x*10`, `y*10` — use same scale for line endpoints).
  - Draw as **curved lines**: e.g. quadratic Bezier using a control point. Control point can be derived from `curveOffsetX`, `curveOffsetY` (e.g. midpoint offset) or stored explicitly; same coordinate system as nodes (0–100 then scaled).
  - Use theme’s connection line colour, opacity, and stroke width. No click-on-line for popup required in this phase (optional later); focus on drag-to-adjust in 7.8.

### 7.8 Curve editing (drag to adjust)

- **Map**
  - For **collaborator** and **admin** only: make each connection line (or an invisible wider path on top) **draggable**. On drag, update the connection’s curve control point (e.g. `curveOffsetX`, `curveOffsetY`) so the curve bends toward the drag.
  - On drag end, call a callback e.g. **`onConnectionCurveChange(connectionId, curveOffsetX, curveOffsetY)`** so **MapExperience** updates the connection in state and calls **`saveConnections(mapSlug, connections)`**.
  - Ensure only approved connections are editable; pending connections are not draggable (or not shown on map until approved, per product choice).

### 7.9 Checklist (Phase 7)

- [x] Types: `MapConnection` added; `MapTheme.connectionLine` added with defaults.
- [x] Migration: `connections` table created; RLS and triggers.
- [x] Data layer: `getConnections` / `saveConnections` in `lib/data.ts` (localStorage + API).
- [x] API routes: GET/PUT `/api/maps/[slug]/connections` implemented and wired to DB.
- [x] Dashboard: create/edit map theme section includes “Connection lines” (colour, opacity, thickness); presets have defaults.
- [x] SubmissionModal: “Connection” type with From/To dropdowns and Description; permission logic same as nodes.
- [x] MapExperience: loads/saves connections; passes to Map and AdminReviewModal; submit flow adds to pending or approved by role.
- [x] AdminReviewModal: shows pending connections with From/To/Description; Approve/Deny updates and persists.
- [x] Map: renders curved lines under nodes; theme connection line style applied.
- [x] Map: collaborator/admin can drag connection line to adjust curve; changes persisted.

---

## Phase 8: Recent features & UX (post-Phase 7)

**Goal:** Dashboard and map UX improvements, filter/add behaviour, Region type, and consistent popup behaviour. All implemented and working with the existing data layer.

### 8.1 Dashboard — create/edit layout

- **Layout:** "Your Maps" moved to the **right**; Create/Edit map form (and intro/import link) on the **left**.
- **Your Maps block:** Only shown when user is signed in and has at least one map. Sort A–Z / Z–A; each map shows title (click → open map), role (Admin/Collaborator/Viewed), Edit (pencil), Copy link, QR, Delete.
- **Edit:** Clicking a map **title** navigates to the map; **Edit** icon (pencil) opens that map in the left-side form for editing. Submit button shows "Save changes" when editing, "Create map" when creating.
- **Delete map:** Custom confirmation modal (same style as delete node): "Delete map? This will delete [map name]. This action cannot be undone." Cancel / Delete map. No `window.confirm`.

### 8.2 Filter panel & add flow

- **Connection in filter:** "Connections" option added below node types in the filter panel. Same card style; squiggly-line icon; colour from theme `connectionLine` (or primary). Toggle shows/hides connection lines on the map.
- **Add node:** "Website" label changed to **"Link"** (add modal and edit node form).
- **Add button:** "Add Entry" button removed from top-right header; only the floating **FAB** (bottom-right) opens the add modal.
- **FAB position:** When the sidebar is **collapsed**, the FAB shifts right so it keeps the same distance from the left edge of the (collapsed) panel. Uses `onCollapsedChange` from Sidebar; transition matches panel animation.

### 8.3 Enable/disable node types and connections per map

- **SceneMap:** `enabledNodeTypes?: NodeType[]`, `connectionsEnabled?: boolean`. When absent, all types and connections are enabled.
- **Dashboard (create/edit):** "Show on map" section with checkboxes for Event, Person, Space, Community, Connections (labels in title case: "Event", "Person", etc.). Disabled types are hidden from the map, from the filter panel, and from the add-entry category list.
- **MapExperience:** Loads enabled types from map; filters nodes and filter options; passes enabled types to Sidebar and SubmissionModal; connections only passed to Map when `connectionsEnabled`; `activeFilters` trimmed to enabled types when map config loads.

### 8.4 Default map background

- **No custom image:** Default view is a **pale landmass surrounded by water** (water fill + single blob path). Landmass shape is **seeded by map slug** so each map gets a different but stable random blob (same slug → same shape). Uses `generateLandmassPath(seedString)` with mulberry32 PRNG and D3 curve.

### 8.5 Tags hidden

- Tags UI is hidden everywhere: add-node form, Sidebar node detail, AdminReviewModal, NodePopup subtitle. Data model unchanged; re-enabling is a matter of removing the `false &&` conditions (and restoring primaryTag/tags in NodePopup if desired).

### 8.6 Region (admin-only category type)

- **NodeType.REGION** added. Region behaves like a node (same entry fields, placement, move, edit, delete) but renders as **text only** (no coloured dot). Text colour from theme `categoryColors[REGION]`.
- **Map:** REGION nodes: no circles; label only, with **region font size** (base 14px × `regionFontScale`). Label font size does not affect regions. Region text is **draggable** (pointer-events enabled on region text so the group receives drag).
- **Sidebar:** When a region is selected, same options as other nodes (title, description, link, edit, delete, "Added by"). Sidebar **auto-expands** when any node (including region) is selected. "Region font size" slider below "Label font size" (admin only); persisted as `SceneMap.regionFontScale`.
- **Visibility:** Region filter option and Region category in add modal are **hidden for Public and Collaborator**; only Admin sees and can add/filter Regions.
- **Click:** Clicking a region always opens the sidebar (and node popup); no description check.

### 8.7 Popups — click away to close

- **All modals/popups** close when the user clicks the **backdrop** (outside the content). Content uses `onClick={(e) => e.stopPropagation()}` so clicks inside do not close.
- **Applied to:** SubmissionModal, AdminReviewModal, NodePopup (invisible full-screen backdrop in MapExperience), Join collaborator modal, Edit node modal, Delete node modal, Delete map modal (Dashboard). Sidebar and Dashboard QR modals already had this behaviour.

### 8.8 Checklist (Phase 8)

- [x] Dashboard: Your Maps on right; form on left; Edit icon; delete confirmation modal.
- [x] Filter: Connections option with squiggly icon and theme colour; FAB position when sidebar collapsed.
- [x] Add: Link label; FAB only; enabled types/connections checkboxes on create/edit; default landmass per map.
- [x] Tags hidden; Region type (text only, draggable, region font size, admin-only in filter/add).
- [x] All popups close on backdrop click.
