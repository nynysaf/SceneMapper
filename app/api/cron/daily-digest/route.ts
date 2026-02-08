import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-server';
import { sendDailyDigestEmail, sendPlatformAdminFeatureRequestDigest, type DigestMapEntry } from '@/lib/daily-digest-email';

/**
 * GET /api/cron/daily-digest
 * Runs at 11:59 PM ET daily (Vercel cron). Sends digest emails to map admins with new pending submissions.
 * Secured by CRON_SECRET header (Vercel sets this for cron invocations).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && (!cronSecret || token !== cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();

    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const y = parseInt(parts.find((p) => p.type === 'year')!.value, 10);
    const m = parseInt(parts.find((p) => p.type === 'month')!.value, 10) - 1;
    const d = parseInt(parts.find((p) => p.type === 'day')!.value, 10);
    const utcHour = m >= 2 && m <= 10 ? 4 : 5;
    const startOfDayET = new Date(Date.UTC(y, m, d, utcHour, 0, 0));
    const startTs = startOfDayET.toISOString();

    const { data: pendingNodes } = await supabase
      .from('nodes')
      .select('id, map_id, title, created_at')
      .eq('status', 'pending')
      .gte('created_at', startTs);

    const { data: pendingConnections } = await supabase
      .from('connections')
      .select('id, map_id, description, created_at')
      .eq('status', 'pending')
      .gte('created_at', startTs);

    const nodeByMap = new Map<string, { title: string }[]>();
    for (const n of pendingNodes ?? []) {
      const list = nodeByMap.get(n.map_id) ?? [];
      list.push({ title: n.title ?? 'Untitled' });
      nodeByMap.set(n.map_id, list);
    }

    const connByMap = new Map<string, string[]>();
    for (const c of pendingConnections ?? []) {
      const list = connByMap.get(c.map_id) ?? [];
      list.push(c.description ?? '');
      connByMap.set(c.map_id, list);
    }

    const mapIds = new Set([...nodeByMap.keys(), ...connByMap.keys()]);
    if (mapIds.size === 0) {
      return NextResponse.json({ ok: true, message: 'No pending submissions today' });
    }

    const { data: maps } = await supabase
      .from('maps')
      .select('id, title, slug, admin_ids')
      .in('id', Array.from(mapIds));

    const { data: prefs } = await supabase
      .from('user_map_notification_prefs')
      .select('user_id, map_id, enabled');

    const prefMap = new Map<string, boolean>();
    for (const p of prefs ?? []) {
      prefMap.set(`${p.user_id}:${p.map_id}`, p.enabled);
    }

    const userToEntries = new Map<string, DigestMapEntry[]>();

    for (const map of maps ?? []) {
      const adminIds = (map.admin_ids ?? []) as string[];
      const nodes = nodeByMap.get(map.id) ?? [];
      const conns = connByMap.get(map.id) ?? [];
      if (nodes.length === 0 && conns.length === 0) continue;

      const entry: DigestMapEntry = {
        mapId: map.id,
        mapTitle: map.title ?? map.slug,
        mapSlug: map.slug,
        nodeCount: nodes.length,
        connectionCount: conns.length,
        nodeTitles: nodes.map((n) => n.title),
        connectionDescriptions: conns,
      };

      for (const userId of adminIds) {
        const enabled = prefMap.get(`${userId}:${map.id}`) ?? true;
        if (!enabled) continue;
        const list = userToEntries.get(userId) ?? [];
        list.push(entry);
        userToEntries.set(userId, list);
      }
    }

    const userEmails = new Map<string, string>();
    for (const userId of userToEntries.keys()) {
      const { data: { user: u } } = await supabase.auth.admin.getUserById(userId);
      if (u?.email) userEmails.set(userId, u.email);
    }

    let sent = 0;
    for (const [userId, entries] of userToEntries) {
      const email = userEmails.get(userId);
      if (!email) continue;
      const result = await sendDailyDigestEmail(email, entries);
      if (result.sent) sent++;
      else console.error('Daily digest send failed', email, result);
    }

    // Platform admin: feature requests from today (maps that requested to be featured, not yet approved)
    const platformAdminEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? 'naryan@gmail.com')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const { data: featureRequestMaps } = await supabase
      .from('maps')
      .select('id, title, slug, feature_requested_at, featured_order')
      .not('feature_requested_at', 'is', null)
      .is('featured_order', null)
      .gte('feature_requested_at', startTs);

    if (featureRequestMaps && featureRequestMaps.length > 0 && platformAdminEmails.length > 0) {
      const featureEntries = featureRequestMaps.map((m) => ({
        mapTitle: m.title ?? m.slug,
        mapSlug: m.slug,
      }));
      for (const adminEmail of platformAdminEmails) {
        const result = await sendPlatformAdminFeatureRequestDigest(adminEmail, featureEntries);
        if (result.sent) sent++;
        else console.error('Platform admin feature-request digest failed', adminEmail, result);
      }
    }

    return NextResponse.json({ ok: true, sent, total: userToEntries.size });
  } catch (err) {
    console.error('GET /api/cron/daily-digest', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
