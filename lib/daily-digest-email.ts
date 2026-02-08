/**
 * Daily digest email for map admins (pending submissions).
 * Uses Resend like invitation emails.
 */

function getOrigin(): string {
  if (typeof process !== 'undefined') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_ORIGIN;
    if (appUrl) {
      const url = String(appUrl).trim();
      return url.startsWith('http') ? url.replace(/\/+$/, '') : `https://${url.replace(/\/+$/, '')}`;
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
  }
  return 'https://scenemapper.ca';
}

export interface DigestMapEntry {
  mapId: string;
  mapTitle: string;
  mapSlug: string;
  nodeCount: number;
  connectionCount: number;
  nodeTitles: string[];
  connectionDescriptions: string[];
}

/**
 * Send daily digest email to one admin.
 */
export async function sendDailyDigestEmail(
  to: string,
  entries: DigestMapEntry[],
): Promise<{ sent: true } | { sent: false; error: string }> {
  const apiKey = typeof process !== 'undefined' ? process.env.RESEND_API_KEY : undefined;
  if (!apiKey) {
    return { sent: false, error: 'RESEND_API_KEY not configured' };
  }

  const origin = getOrigin();
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

  const lines: string[] = [
    'Hi,',
    '',
    'Here are the new submissions from public users that need your review:',
    '',
  ];

  for (const e of entries) {
    const total = e.nodeCount + e.connectionCount;
    lines.push(`**${e.mapTitle}** (${total} new):`);
    lines.push(`Open map: ${origin}/maps/${e.mapSlug}`);
    if (e.nodeTitles.length > 0) {
      lines.push('  Nodes: ' + e.nodeTitles.slice(0, 10).join(', ') + (e.nodeTitles.length > 10 ? '…' : ''));
    }
    if (e.connectionDescriptions.length > 0) {
      lines.push('  Connections: ' + e.connectionDescriptions.length + ' new');
    }
    lines.push('');
  }

  lines.push('— Scene Mapper');

  const body = lines.join('\n');
  const subject = 'Scene Mapper: New submissions for review';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Scene Mapper <${fromEmail}>`,
      to: [to],
      subject,
      text: body.replace(/\*\*(.+?)\*\*/g, '$1'),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = (data as { message?: string }).message ?? res.statusText;
    return { sent: false, error: msg };
  }
  return { sent: true };
}

export interface FeatureRequestEntry {
  mapTitle: string;
  mapSlug: string;
}

/**
 * Send daily digest to platform admin(s) listing maps that requested to be featured today.
 */
export async function sendPlatformAdminFeatureRequestDigest(
  to: string,
  entries: FeatureRequestEntry[],
): Promise<{ sent: true } | { sent: false; error: string }> {
  const apiKey = typeof process !== 'undefined' ? process.env.RESEND_API_KEY : undefined;
  if (!apiKey) {
    return { sent: false, error: 'RESEND_API_KEY not configured' };
  }

  const origin =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
      ? String(process.env.NEXT_PUBLIC_APP_URL).replace(/\/+$/, '')
      : 'https://scenemapper.ca';
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

  const lines: string[] = [
    'Hi,',
    '',
    'The following maps have requested to be featured on the home page:',
    '',
  ];

  for (const e of entries) {
    lines.push(`• **${e.mapTitle}** — ${origin}/dashboard?edit=${encodeURIComponent(e.mapSlug)}`);
  }

  lines.push('');
  lines.push('Open the Dashboard to approve or deny.');
  lines.push('');
  lines.push('— Scene Mapper');

  const body = lines.join('\n');
  const subject = 'Scene Mapper: New feature requests';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Scene Mapper <${fromEmail}>`,
      to: [to],
      subject,
      text: body.replace(/\*\*(.+?)\*\*/g, '$1'),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = (data as { message?: string }).message ?? res.statusText;
    return { sent: false, error: msg };
  }
  return { sent: true };
}
