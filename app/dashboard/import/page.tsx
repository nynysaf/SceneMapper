'use client';

import { useState, useCallback } from 'react';
import type { SceneMap, MapNode, User } from '../../../types';
import Link from 'next/link';

const KEY_MAPS = 'sceneMapper_maps';
const KEY_USERS = 'sceneMapper_users';

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

function readLocalData(): {
  maps: SceneMap[];
  users: User[];
  nodesBySlug: Record<string, MapNode[]>;
} {
  const maps = safeJson<SceneMap[]>(typeof window !== 'undefined' ? localStorage.getItem(KEY_MAPS) : null, []);
  const users = safeJson<User[]>(typeof window !== 'undefined' ? localStorage.getItem(KEY_USERS) : null, []);
  const nodesBySlug: Record<string, MapNode[]> = {};

  if (typeof window === 'undefined') return { maps, users, nodesBySlug };

  for (const m of maps) {
    const key = nodeStorageKey(m.slug);
    nodesBySlug[m.slug] = safeJson<MapNode[]>(localStorage.getItem(key), []);
  }
  if (maps.length === 0 && localStorage.getItem('torontopia_nodes')) {
    nodesBySlug['torontopia'] = safeJson<MapNode[]>(localStorage.getItem('torontopia_nodes'), []);
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('scene_mapper_nodes_')) {
      const slug = key.replace('scene_mapper_nodes_', '');
      if (!nodesBySlug[slug]) nodesBySlug[slug] = safeJson<MapNode[]>(localStorage.getItem(key), []);
    }
  }

  return { maps, users, nodesBySlug };
}

export default function ImportPage() {
  const [preview, setPreview] = useState<{ maps: number; users: number; nodes: number } | null>(null);
  const [status, setStatus] = useState<'idle' | 'importing' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const loadPreview = useCallback(() => {
    const { maps, users, nodesBySlug } = readLocalData();
    const nodes = Object.values(nodesBySlug).reduce((a, n) => a + n.length, 0);
    setPreview({ maps: maps.length, users: users.length, nodes });
    setStatus('idle');
    setMessage('');
  }, []);

  const runImport = useCallback(async () => {
    const { maps, users, nodesBySlug } = readLocalData();
    if (maps.length === 0 && users.length === 0 && Object.values(nodesBySlug).every((n) => n.length === 0)) {
      setMessage('No data found in browser storage.');
      setStatus('idle');
      return;
    }
    setStatus('importing');
    setMessage('');
    try {
      if (maps.length > 0) {
        const r = await fetch('/api/maps', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(maps),
        });
        if (!r.ok) throw new Error(`Maps: ${r.status} ${await r.text()}`);
      }
      if (users.length > 0) {
        const r = await fetch('/api/users', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(users),
        });
        if (!r.ok) throw new Error(`Users: ${r.status} ${await r.text()}`);
      }
      for (const slug of Object.keys(nodesBySlug)) {
        const nodes = nodesBySlug[slug];
        if (nodes.length === 0) continue;
        const r = await fetch(`/api/maps/${encodeURIComponent(slug)}/nodes`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nodes),
        });
        if (!r.ok) throw new Error(`Nodes (${slug}): ${r.status} ${await r.text()}`);
      }
      setStatus('done');
      setMessage(`Imported ${maps.length} maps, ${users.length} users, and nodes for ${Object.keys(nodesBySlug).length} map(s).`);
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Import failed.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/80 to-amber-50/50 p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            ← Dashboard
          </Link>
        </div>
        <div className="rounded-2xl glass p-6 space-y-4">
          <h1 className="text-xl font-semibold text-emerald-900">Import from browser storage</h1>
          <p className="text-sm text-emerald-800">
            Copy data from this browser&apos;s localStorage into Supabase. Use this once when
            switching to the backend. Session is not migrated; log in again after importing.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={loadPreview}
              className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 font-medium hover:bg-emerald-200"
            >
              Scan browser storage
            </button>
            {preview && (
              <>
                <p className="text-sm text-emerald-700">
                  Found: <strong>{preview.maps}</strong> maps, <strong>{preview.users}</strong> users,{' '}
                  <strong>{preview.nodes}</strong> nodes.
                </p>
                <button
                  type="button"
                  onClick={runImport}
                  disabled={status === 'importing'}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50"
                >
                  {status === 'importing' ? 'Importing…' : 'Import to Supabase'}
                </button>
              </>
            )}
          </div>
          {message && (
            <p
              className={`text-sm ${status === 'error' ? 'text-red-700' : 'text-emerald-700'}`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
