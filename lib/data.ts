/**
 * Data layer: single API for maps, nodes, users, and session.
 * Implemented with localStorage now; swap to API calls when backend is ready.
 */

import type { SceneMap, MapNode, User, AuthSession } from '../types';

// --- Storage keys (internal) ---

const KEY_MAPS = 'sceneMapper_maps';
const KEY_USERS = 'sceneMapper_users';
const KEY_SESSION = 'sceneMapper_session';

function nodeStorageKey(mapSlug: string): string {
  return mapSlug === 'torontopia' ? 'torontopia_nodes' : `scene_mapper_nodes_${mapSlug}`;
}

function safeJson<T>(raw: string | null, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function guard(): void {
  if (typeof window === 'undefined') {
    throw new Error('Data layer is client-only');
  }
}

// --- Maps ---

export async function getMaps(): Promise<SceneMap[]> {
  guard();
  return safeJson<SceneMap[]>(localStorage.getItem(KEY_MAPS), []);
}

export async function getMapBySlug(slug: string): Promise<SceneMap | null> {
  const maps = await getMaps();
  return maps.find((m) => m.slug === slug) ?? null;
}

export async function saveMaps(maps: SceneMap[]): Promise<void> {
  guard();
  localStorage.setItem(KEY_MAPS, JSON.stringify(maps));
}

// --- Nodes ---

export async function getNodes(mapSlug: string): Promise<MapNode[]> {
  guard();
  const key = nodeStorageKey(mapSlug);
  return safeJson<MapNode[]>(localStorage.getItem(key), []);
}

export async function saveNodes(mapSlug: string, nodes: MapNode[]): Promise<void> {
  guard();
  const key = nodeStorageKey(mapSlug);
  localStorage.setItem(key, JSON.stringify(nodes));
}

/**
 * Copy nodes from one map slug to another (e.g. when renaming a map).
 * Does not remove the source key; call saveNodes(fromSlug, []) if you want to clear.
 */
export async function copyNodesToSlug(fromSlug: string, toSlug: string): Promise<void> {
  if (fromSlug === toSlug) return;
  const nodes = await getNodes(fromSlug);
  await saveNodes(toSlug, nodes);
}

// --- Users & session ---

export async function getUsers(): Promise<User[]> {
  guard();
  return safeJson<User[]>(localStorage.getItem(KEY_USERS), []);
}

export async function saveUsers(users: User[]): Promise<void> {
  guard();
  localStorage.setItem(KEY_USERS, JSON.stringify(users));
}

export async function getSession(): Promise<AuthSession | null> {
  guard();
  const raw = localStorage.getItem(KEY_SESSION);
  return raw ? safeJson<AuthSession>(raw, null as AuthSession | null) : null;
}

export async function saveSession(session: AuthSession): Promise<void> {
  guard();
  localStorage.setItem(KEY_SESSION, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  guard();
  localStorage.removeItem(KEY_SESSION);
}
