# Map Page Data Flow

How data flows from the map page to MapExperience (Tier 1–3 optimizations).

## Overview

When a user visits `/maps/[slug]`:

1. **Page** (`app/maps/[slug]/page.tsx`) fetches all map data in one call.
2. **MapExperience** receives data as props and renders. It does not refetch map, nodes, or connections.

## Flow

```
User → /maps/torontopia
         ↓
    Map Page (client)
         ↓
    getMapPageData(slug)  ←  One HTTP call: GET /api/maps/[slug]/page
         ↓                   Returns { map, nodes, connections }
    State: map, nodes, connections, loaded
         ↓
    MapExperience (map, initialNodes, initialConnections, isDataLoading)
         ↓
    - Uses map for display settings (nodeSizeScale, theme, etc.) and role (adminIds, collaboratorIds)
    - Uses initialNodes/initialConnections when provided; skips fetch
    - Loads getUsers() + getSession() for role hydration only
```

## Key Points

- **Single source of truth:** The page owns the initial fetch. MapExperience is a presentational + interaction layer.
- **One round-trip:** `GET /api/maps/[slug]/page` returns map, nodes, connections in one response (Tier 3).
- **Shell first:** MapExperience renders immediately with "Loading map…" overlay; data arrives and populates when ready (Tier 2).
- **Edit/save:** MapExperience still calls `saveNodes`, `saveConnections`, `saveMaps` via `lib/data.ts` (PUT requests). Those use the existing per-resource API routes.

## Data Layer

- **Backend mode** (`NEXT_PUBLIC_USE_BACKEND=true`): `getMapPageData` → `/api/maps/[slug]/page`.
- **localStorage mode**: `getMapPageData` runs `Promise.all([getMapBySlug, getNodes, getConnections])` locally.

## Files

| File | Role |
|------|------|
| `app/maps/[slug]/page.tsx` | Fetches via `getMapPageData`, passes props to MapExperience |
| `components/MapExperience.tsx` | Receives map, initialNodes, initialConnections; hydrates users/session for role |
| `lib/data.ts` | `getMapPageData(slug)` — combined fetch |
| `app/api/maps/[slug]/page/route.ts` | Server: one handler returns map + nodes + connections |
