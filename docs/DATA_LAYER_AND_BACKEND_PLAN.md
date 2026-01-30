# Data Layer & Backend Plan

**Goal:** Introduce a single data layer, then swap it to a real backend so we can deploy on a free server with light data. Features will be added after the backend is built and tested.

**Constraints:** Light data, free-tier hosting (e.g. Vercel + free DB).

**Session state:** Phase 1 complete (data layer + refactor). Phase 3 API routes exist as stubs; next: Phase 2 (Supabase schema) then wire routes to DB and add `NEXT_PUBLIC_USE_BACKEND` switch in `lib/data.ts`.

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
- [ ] `lib/supabase-server.ts` (or equivalent) for server-side Supabase client.
- [x] API routes exist as stubs (`app/api/maps`, `app/api/maps/[slug]`, `app/api/maps/[slug]/nodes`, `app/api/users`, `app/api/auth/login`, `app/api/auth/logout`, `app/api/auth/session`) — return empty/default data; not yet wired to Supabase.
- [ ] `lib/data.ts` (or data-api) implemented to call these APIs when `NEXT_PUBLIC_USE_BACKEND=true`.
- [ ] Env vars set locally; full flow works against Supabase (signup, login, create map, add node, approve, view map).

---

## Phase 4: Data migration (optional)

- **One-time:** If you need to keep existing localStorage data:
  - Add a small “Import from browser” tool (or a script) that reads `sceneMapper_maps`, `sceneMapper_users`, `scene_mapper_nodes_*`, `torontopia_nodes` from localStorage and POSTs them to your API so they get inserted into Supabase.
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

- [ ] **Vercel:** Connect repo, set env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_USE_BACKEND=true`, `NEXT_PUBLIC_APP_URL`).
- [ ] **Supabase:** Production project (or same project) with same schema; point Vercel env to it.
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

After this, the app runs on a free server with a real database; you can add new features on top of the existing data layer and API.
