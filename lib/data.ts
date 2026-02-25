/**
 * Data layer: single API for maps, nodes, users, and session.
 * When NEXT_PUBLIC_USE_BACKEND=true, uses API routes (Supabase-backed).
 * Otherwise uses localStorage.
 */

import type { SceneMap, MapNode, MapConnection, User, AuthSession } from '../types';

export const USE_BACKEND =
  typeof process !== 'undefined' &&
  (process.env as Record<string, string | undefined>).NEXT_PUBLIC_USE_BACKEND === 'true';

function apiBase(): string {
  if (typeof window === 'undefined') return '';
  return '';
}

function fetchOpts(method: string, body?: unknown, keepalive = false): RequestInit {
  return {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    keepalive,
  };
}

function guard(): void {
  if (typeof window === 'undefined') {
    throw new Error('Data layer is client-only');
  }
}

/** Options for data-layer fetches; pass signal to cancel on unmount/navigation. */
export interface DataLayerOptions {
  signal?: AbortSignal;
}

/** True when the error is from an aborted fetch (e.g. navigation/unmount). Don't treat as real error. */
export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

// --- Maps (backend) ---

async function getMapsApi(options?: DataLayerOptions): Promise<SceneMap[]> {
  const r = await fetch(`${apiBase()}/api/maps`, {
    ...fetchOpts('GET'),
    credentials: 'include',
    signal: options?.signal,
  });
  if (!r.ok) throw new Error(`getMaps: ${r.status}`);
  return r.json();
}

async function getMapBySlugApi(slug: string, options?: DataLayerOptions): Promise<SceneMap | null> {
  const r = await fetch(`${apiBase()}/api/maps/${encodeURIComponent(slug)}`, {
    credentials: 'include',
    signal: options?.signal,
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`getMapBySlug: ${r.status}`);
  return r.json();
}

export interface MapPageData {
  map: SceneMap | null;
  nodes: MapNode[];
  connections: MapConnection[];
}

async function getMapPageDataApi(slug: string, options?: DataLayerOptions): Promise<MapPageData> {
  const r = await fetch(`${apiBase()}/api/maps/${encodeURIComponent(slug)}/page`, {
    credentials: 'include',
    signal: options?.signal,
  });
  if (!r.ok) throw new Error(`getMapPageData: ${r.status}`);
  return r.json();
}

/**
 * Vercel serverless request body limit is ~4.5 MB, but some Next.js route
 * handlers and proxies can have a lower effective limit (~1 MB) that surfaces
 * to the client as a generic "NetworkError when attempting to fetch resource".
 *
 * To stay on the safe side for all environments, we keep our JSON payloads
 * well below 1 MB and chunk larger saves on the client before sending.
 */
const SAVE_MAPS_BODY_LIMIT = 900 * 1024; // ~0.9 MB
/** Same conservative limit for nodes/connections PUT (e.g. xlsx import). */
const SAVE_BODY_LIMIT = 900 * 1024; // ~0.9 MB

async function saveMapsApi(maps: SceneMap[]): Promise<void> {
  const body = JSON.stringify(maps);
  if (body.length <= SAVE_MAPS_BODY_LIMIT) {
    const r = await fetch(`${apiBase()}/api/maps`, fetchOpts('POST', maps));
    if (!r.ok) {
      const resBody = await r.json().catch(() => ({}));
      const msg =
        typeof (resBody as { error?: string }).error === 'string'
          ? (resBody as { error: string }).error
          : `saveMaps: ${r.status}`;
      throw new Error(msg);
    }
    return;
  }

  // Chunk by size so each request stays under the limit (avoids 413 Payload Too Large).
  const chunks: SceneMap[][] = [];
  let current: SceneMap[] = [];
  for (const m of maps) {
    current.push(m);
    if (JSON.stringify(current).length > SAVE_MAPS_BODY_LIMIT) {
      current.pop();
      if (current.length === 0) {
        // Single map exceeds limit; send it anyway and let server/network handle or error
        chunks.push([m]);
      } else {
        chunks.push(current);
        current = [m];
      }
    }
  }
  if (current.length > 0) chunks.push(current);

  for (const chunk of chunks) {
    const r = await fetch(`${apiBase()}/api/maps`, fetchOpts('POST', chunk));
    if (!r.ok) {
      const resBody = await r.json().catch(() => ({}));
      const msg =
        typeof (resBody as { error?: string }).error === 'string'
          ? (resBody as { error: string }).error
          : `saveMaps: ${r.status}`;
      throw new Error(msg);
    }
  }
}

async function deleteMapApi(mapSlug: string): Promise<void> {
  const r = await fetch(`${apiBase()}/api/maps/${encodeURIComponent(mapSlug)}`, {
    method: 'DELETE',
    credentials: 'include',
    signal: undefined,
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    const msg =
      typeof (body as { error?: string }).error === 'string'
        ? (body as { error: string }).error
        : `deleteMap: ${r.status}`;
    throw new Error(msg);
  }
}

/**
 * Delete a map by slug. With backend: calls DELETE /api/maps/[slug].
 * Without backend: removes from localStorage (via saveMaps with filtered list).
 */
export async function deleteMap(mapSlug: string): Promise<void> {
  guard();
  if (USE_BACKEND) {
    await deleteMapApi(mapSlug);
    return;
  }
  const maps = safeJson<SceneMap[]>(localStorage.getItem(KEY_MAPS), []);
  const next = maps.filter((m) => m.slug !== mapSlug);
  localStorage.setItem(KEY_MAPS, JSON.stringify(next));
}

/** Records that the current user has viewed this map (for Your Maps filtering). No-op when not using backend or not logged in. */
export async function recordMapView(mapSlug: string, options?: DataLayerOptions): Promise<void> {
  guard();
  if (!USE_BACKEND) return;
  try {
    await fetch(`${apiBase()}/api/maps/${encodeURIComponent(mapSlug)}/view`, {
      method: 'POST',
      credentials: 'include',
      signal: options?.signal,
    });
  } catch {
    // Non-fatal; don't break map load
  }
}

// --- Nodes (backend) ---

async function getNodesApi(mapSlug: string, options?: DataLayerOptions): Promise<MapNode[]> {
  const r = await fetch(`${apiBase()}/api/maps/${encodeURIComponent(mapSlug)}/nodes`, {
    credentials: 'include',
    signal: options?.signal,
  });
  if (!r.ok) throw new Error(`getNodes: ${r.status}`);
  return r.json();
}

async function saveNodesApi(mapSlug: string, nodes: MapNode[]): Promise<void> {
  const body = JSON.stringify(nodes);
  if (body.length <= SAVE_BODY_LIMIT) {
    // Use standard fetch (no keepalive) to avoid browser keepalive body size limits that can surface
    // as "NetworkError when attempting to fetch resource" on larger payloads.
    const r = await fetch(`${apiBase()}/api/maps/${encodeURIComponent(mapSlug)}/nodes`, fetchOpts('PUT', nodes));
    if (!r.ok) {
      const resBody = await r.json().catch(() => ({}));
      const msg = typeof (resBody as { error?: string }).error === 'string' ? (resBody as { error: string }).error : `saveNodes: ${r.status}`;
      throw new Error(msg);
    }
    return;
  }
  const chunkSize = Math.max(1, Math.floor(nodes.length / Math.ceil(body.length / SAVE_BODY_LIMIT)));
  for (let i = 0; i < nodes.length; i += chunkSize) {
    const chunk = nodes.slice(i, i + chunkSize);
    let current = chunk;
    if (i > 0) {
      const existing = await getNodesApi(mapSlug);
      current = [...existing, ...chunk];
    }
    const r = await fetch(`${apiBase()}/api/maps/${encodeURIComponent(mapSlug)}/nodes`, fetchOpts('PUT', current));
    if (!r.ok) {
      const resBody = await r.json().catch(() => ({}));
      const msg = typeof (resBody as { error?: string }).error === 'string' ? (resBody as { error: string }).error : `saveNodes: ${r.status}`;
      throw new Error(msg);
    }
  }
}

// --- Connections (backend) ---

async function getConnectionsApi(mapSlug: string, options?: DataLayerOptions): Promise<MapConnection[]> {
  const r = await fetch(`${apiBase()}/api/maps/${encodeURIComponent(mapSlug)}/connections`, {
    credentials: 'include',
    signal: options?.signal,
  });
  if (!r.ok) throw new Error(`getConnections: ${r.status}`);
  return r.json();
}

async function saveConnectionsApi(mapSlug: string, connections: MapConnection[]): Promise<void> {
  const body = JSON.stringify(connections);
  if (body.length <= SAVE_BODY_LIMIT) {
    // Likewise, avoid keepalive here; connections payloads can also be large during imports.
    const r = await fetch(`${apiBase()}/api/maps/${encodeURIComponent(mapSlug)}/connections`, fetchOpts('PUT', connections));
    if (!r.ok) {
      const resBody = await r.json().catch(() => ({}));
      const msg = typeof (resBody as { error?: string }).error === 'string' ? (resBody as { error: string }).error : `saveConnections: ${r.status}`;
      throw new Error(msg);
    }
    return;
  }
  const chunkSize = Math.max(1, Math.floor(connections.length / Math.ceil(body.length / SAVE_BODY_LIMIT)));
  for (let i = 0; i < connections.length; i += chunkSize) {
    const chunk = connections.slice(i, i + chunkSize);
    let current = chunk;
    if (i > 0) {
      const existing = await getConnectionsApi(mapSlug);
      current = [...existing, ...chunk];
    }
    const r = await fetch(`${apiBase()}/api/maps/${encodeURIComponent(mapSlug)}/connections`, fetchOpts('PUT', current));
    if (!r.ok) {
      const resBody = await r.json().catch(() => ({}));
      const msg = typeof (resBody as { error?: string }).error === 'string' ? (resBody as { error: string }).error : `saveConnections: ${r.status}`;
      throw new Error(msg);
    }
  }
}

// --- Users & session (backend) ---

async function getUsersApi(): Promise<User[]> {
  const r = await fetch(`${apiBase()}/api/users`, { credentials: 'include' });
  if (!r.ok) throw new Error(`getUsers: ${r.status}`);
  return r.json();
}

async function saveUsersApi(users: User[]): Promise<void> {
  const r = await fetch(`${apiBase()}/api/users`, fetchOpts('PUT', users));
  if (!r.ok) throw new Error(`saveUsers: ${r.status}`);
}

async function getSessionApi(): Promise<AuthSession | null> {
  const r = await fetch(`${apiBase()}/api/auth/session`, { credentials: 'include' });
  if (!r.ok) return null;
  const data = await r.json();
  if (!data || typeof data.userId !== 'string') return null;
  return {
    userId: data.userId,
    email: data.email,
    name: data.name,
    platformAdmin: !!data.platformAdmin,
  };
}

async function saveSessionApi(_session: AuthSession): Promise<void> {
  // Session is set by login/signup API responses (cookie). No-op for client.
}

async function clearSessionApi(): Promise<void> {
  await fetch(`${apiBase()}/api/auth/logout`, { method: 'POST', credentials: 'include' });
}

// --- localStorage impl ---

const KEY_MAPS = 'sceneMapper_maps';
const KEY_USERS = 'sceneMapper_users';
const KEY_SESSION = 'sceneMapper_session';

function nodeStorageKey(mapSlug: string): string {
  return mapSlug === 'torontopia' ? 'torontopia_nodes' : `scene_mapper_nodes_${mapSlug}`;
}

function connectionStorageKey(mapSlug: string): string {
  return mapSlug === 'torontopia' ? 'torontopia_connections' : `scene_mapper_connections_${mapSlug}`;
}

function safeJson<T>(raw: string | null, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// --- Public API: Maps ---

export async function getMaps(options?: DataLayerOptions): Promise<SceneMap[]> {
  guard();
  if (USE_BACKEND) return getMapsApi(options);
  return safeJson<SceneMap[]>(localStorage.getItem(KEY_MAPS), []);
}

export async function getMapBySlug(slug: string, options?: DataLayerOptions): Promise<SceneMap | null> {
  guard();
  if (USE_BACKEND) return getMapBySlugApi(slug, options);
  const maps = await safeJson<SceneMap[]>(localStorage.getItem(KEY_MAPS), []);
  return maps.find((m) => m.slug === slug) ?? null;
}

async function getFeaturedMapsApi(options?: DataLayerOptions): Promise<SceneMap[]> {
  const r = await fetch(`${apiBase()}/api/featured-maps`, {
    credentials: 'include',
    signal: options?.signal,
  });
  if (!r.ok) throw new Error(`getFeaturedMaps: ${r.status}`);
  return r.json();
}

async function getFeatureRequestsApi(options?: DataLayerOptions): Promise<SceneMap[]> {
  const r = await fetch(`${apiBase()}/api/admin/feature-requests`, {
    credentials: 'include',
    signal: options?.signal,
  });
  if (!r.ok) throw new Error(`getFeatureRequests: ${r.status}`);
  return r.json();
}

export async function getFeaturedMaps(options?: DataLayerOptions): Promise<SceneMap[]> {
  guard();
  if (USE_BACKEND) return getFeaturedMapsApi(options);
  const maps = await safeJson<SceneMap[]>(localStorage.getItem(KEY_MAPS), []);
  return maps.filter((m) => m.featuredOrder != null).sort((a, b) => (a.featuredOrder ?? 0) - (b.featuredOrder ?? 0));
}

export async function getFeatureRequests(options?: DataLayerOptions): Promise<SceneMap[]> {
  guard();
  if (USE_BACKEND) return getFeatureRequestsApi(options);
  return [];
}

export interface UpdateMapFeatureParams {
  featuredOrder?: number | null;
  featuredActive?: boolean;
  clearFeatureRequest?: boolean;
}

export async function updateMapFeature(mapSlug: string, params: UpdateMapFeatureParams): Promise<void> {
  guard();
  if (!USE_BACKEND) return;
  const r = await fetch(`${apiBase()}/api/maps/${encodeURIComponent(mapSlug)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    const msg =
      typeof (body as { error?: string }).error === 'string'
        ? (body as { error: string }).error
        : `updateMapFeature: ${r.status}`;
    throw new Error(msg);
  }
}

/**
 * Tier 3: Combined API - map, nodes, connections in one response (one HTTP round-trip).
 * Use for map page initial load; keeps existing GET /api/maps/[slug], nodes, connections for edit/save flows.
 */
export async function getMapPageData(slug: string, options?: DataLayerOptions): Promise<MapPageData> {
  guard();
  if (USE_BACKEND) return getMapPageDataApi(slug, options);
  const [map, nodes, connections] = await Promise.all([
    getMapBySlug(slug, options),
    getNodes(slug, options),
    getConnections(slug, options),
  ]);
  return { map: map ?? null, nodes, connections };
}

export async function saveMaps(maps: SceneMap[]): Promise<void> {
  guard();
  if (USE_BACKEND) {
    await saveMapsApi(maps);
    return;
  }
  localStorage.setItem(KEY_MAPS, JSON.stringify(maps));
}

/** Get presigned upload URL and public URL for a map background image (R2, backend only). Client PUTs file to uploadUrl. */
export async function getMapBackgroundUploadUrl(
  contentType: string,
  mapId: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  guard();
  const r = await fetch(`${apiBase()}/api/maps/upload-background`, {
    ...fetchOpts('POST', { contentType, mapId }),
    credentials: 'include',
  });
  if (!r.ok) {
    const resBody = await r.json().catch(() => ({}));
    const msg = typeof (resBody as { error?: string }).error === 'string' ? (resBody as { error: string }).error : `upload-background: ${r.status}`;
    throw new Error(msg);
  }
  const data = (await r.json()) as { uploadUrl: string; publicUrl: string };
  if (!data.uploadUrl || !data.publicUrl) throw new Error('Invalid upload URL response');
  return data;
}

// --- Public API: Nodes ---

export async function getNodes(mapSlug: string, options?: DataLayerOptions): Promise<MapNode[]> {
  guard();
  if (USE_BACKEND) return getNodesApi(mapSlug, options);
  const key = nodeStorageKey(mapSlug);
  return safeJson<MapNode[]>(localStorage.getItem(key), []);
}

export async function saveNodes(mapSlug: string, nodes: MapNode[]): Promise<void> {
  guard();
  if (USE_BACKEND) {
    await saveNodesApi(mapSlug, nodes);
    return;
  }
  const key = nodeStorageKey(mapSlug);
  localStorage.setItem(key, JSON.stringify(nodes));
}

/**
 * Copy nodes from one map slug to another (e.g. when renaming a map).
 */
export async function copyNodesToSlug(fromSlug: string, toSlug: string): Promise<void> {
  if (fromSlug === toSlug) return;
  const nodes = await getNodes(fromSlug);
  await saveNodes(toSlug, nodes);
}

// --- Public API: Connections ---

export async function getConnections(mapSlug: string, options?: DataLayerOptions): Promise<MapConnection[]> {
  guard();
  if (USE_BACKEND) return getConnectionsApi(mapSlug, options);
  const key = connectionStorageKey(mapSlug);
  return safeJson<MapConnection[]>(localStorage.getItem(key), []);
}

export async function saveConnections(mapSlug: string, connections: MapConnection[]): Promise<void> {
  guard();
  if (USE_BACKEND) {
    await saveConnectionsApi(mapSlug, connections);
    return;
  }
  const key = connectionStorageKey(mapSlug);
  localStorage.setItem(key, JSON.stringify(connections));
}

/** Public submission: insert a single node (no auth). Use when user is public. Returns created node id. */
export async function submitNode(
  mapSlug: string,
  node: Omit<MapNode, 'id' | 'collaboratorId' | 'status'>,
  options?: DataLayerOptions
): Promise<{ id: string }> {
  guard();
  if (!USE_BACKEND) {
    throw new Error('Public submission requires backend');
  }
  const r = await fetch(`${apiBase()}/api/maps/${encodeURIComponent(mapSlug)}/submissions/nodes`, {
    ...fetchOpts('POST', {
      type: node.type,
      title: node.title,
      description: node.description ?? '',
      website: node.website ?? null,
      x: node.x,
      y: node.y,
      tags: node.tags ?? [],
      primaryTag: node.primaryTag ?? 'other',
    }),
    signal: options?.signal,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = typeof (data as { error?: string }).error === 'string' ? (data as { error: string }).error : `submitNode: ${r.status}`;
    throw new Error(msg);
  }
  const id = (data as { id?: string }).id;
  if (!id) throw new Error('Invalid response from submit node');
  return { id };
}

/** Public submission: insert a single connection (no auth). Use when user is public. Returns created connection id. */
export async function submitConnection(
  mapSlug: string,
  connection: { fromNodeId: string; toNodeId: string; description?: string },
  options?: DataLayerOptions
): Promise<{ id: string }> {
  guard();
  if (!USE_BACKEND) {
    throw new Error('Public submission requires backend');
  }
  const r = await fetch(`${apiBase()}/api/maps/${encodeURIComponent(mapSlug)}/submissions/connections`, {
    ...fetchOpts('POST', {
      fromNodeId: connection.fromNodeId,
      toNodeId: connection.toNodeId,
      description: connection.description ?? '',
    }),
    signal: options?.signal,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = typeof (data as { error?: string }).error === 'string' ? (data as { error: string }).error : `submitConnection: ${r.status}`;
    throw new Error(msg);
  }
  const id = (data as { id?: string }).id;
  if (!id) throw new Error('Invalid response from submit connection');
  return { id };
}

// --- Public API: Users & session ---

export async function getUsers(): Promise<User[]> {
  guard();
  if (USE_BACKEND) return getUsersApi();
  return safeJson<User[]>(localStorage.getItem(KEY_USERS), []);
}

export async function saveUsers(users: User[]): Promise<void> {
  guard();
  if (USE_BACKEND) {
    await saveUsersApi(users);
    return;
  }
  localStorage.setItem(KEY_USERS, JSON.stringify(users));
}

export async function getSession(): Promise<AuthSession | null> {
  guard();
  if (USE_BACKEND) return getSessionApi();
  const raw = localStorage.getItem(KEY_SESSION);
  return raw ? safeJson<AuthSession>(raw, null as AuthSession | null) : null;
}

export async function saveSession(session: AuthSession): Promise<void> {
  guard();
  if (USE_BACKEND) {
    await saveSessionApi(session);
    return;
  }
  localStorage.setItem(KEY_SESSION, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  guard();
  if (USE_BACKEND) {
    await clearSessionApi();
    return;
  }
  localStorage.removeItem(KEY_SESSION);
}
