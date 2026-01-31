/**
 * Data layer: single API for maps, nodes, users, and session.
 * When NEXT_PUBLIC_USE_BACKEND=true, uses API routes (Supabase-backed).
 * Otherwise uses localStorage.
 */

import type { SceneMap, MapNode, MapConnection, User, AuthSession } from '../types';

const USE_BACKEND =
  typeof process !== 'undefined' &&
  (process.env as Record<string, string | undefined>).NEXT_PUBLIC_USE_BACKEND === 'true';

function apiBase(): string {
  if (typeof window === 'undefined') return '';
  return '';
}

function fetchOpts(method: string, body?: unknown): RequestInit {
  return {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
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

async function saveMapsApi(maps: SceneMap[]): Promise<void> {
  const r = await fetch(`${apiBase()}/api/maps`, fetchOpts('POST', maps));
  if (!r.ok) throw new Error(`saveMaps: ${r.status}`);
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
  const r = await fetch(`${apiBase()}/api/maps/${encodeURIComponent(mapSlug)}/nodes`, fetchOpts('PUT', nodes));
  if (!r.ok) throw new Error(`saveNodes: ${r.status}`);
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
  const r = await fetch(`${apiBase()}/api/maps/${encodeURIComponent(mapSlug)}/connections`, fetchOpts('PUT', connections));
  if (!r.ok) throw new Error(`saveConnections: ${r.status}`);
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
  return data && typeof data.userId === 'string' ? data : null;
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

export async function saveMaps(maps: SceneMap[]): Promise<void> {
  guard();
  if (USE_BACKEND) {
    await saveMapsApi(maps);
    return;
  }
  localStorage.setItem(KEY_MAPS, JSON.stringify(maps));
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
