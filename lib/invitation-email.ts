/**
 * Invitation email defaults and send helper (Resend).
 * Templates match docs/INVITATION_EMAILS.md; {Map title}, {origin}, {slug} are substituted.
 */
import type { SceneMap } from '@/types';

export const DEFAULT_ADMIN_SUBJECT = "You're invited as an admin of **{Map title}**";
export const DEFAULT_ADMIN_BODY = `Hi,

You've been invited to help manage the map "{Map title}" on Scene Mapper.

As an admin you can:
• Add new people, spaces, events, and communities
• Approve or deny submissions
• Move, edit and delete elements
• Change map settings

Open the map: {origin}/maps/{slug}

If you don't have an account yet, sign up at {origin}/dashboard — then use the link above to open the map.

— Scene Mapper`;

export const DEFAULT_COLLABORATOR_SUBJECT = "You're invited to collaborate on **{Map title}**";
export const DEFAULT_COLLABORATOR_BODY = `Hi,

You've been invited to add and edit entries on the map "{Map title}" on Scene Mapper.

As a collaborator you can:
• Add new people, spaces, events, and communities
• Move your nodes on the map
• Edit your own entries

Open the map: {origin}/maps/{slug}

If you don't have an account yet, sign up at {origin}/dashboard — then open the map and, if needed, use "Join as collaborator" with the password shared by the map owner.

— Scene Mapper`;

function substitute(template: string, mapTitle: string, origin: string, slug: string): string {
  return template
    .replace(/\{Map title\}/g, mapTitle)
    .replace(/\{\s*origin\s*\}/g, origin)
    .replace(/\{\s*slug\s*\}/g, slug);
}

export type InvitationRole = 'admin' | 'collaborator';

export function getInvitationSubject(map: SceneMap, role: InvitationRole): string {
  const raw =
    role === 'admin'
      ? (map.invitationEmailSubjectAdmin ?? DEFAULT_ADMIN_SUBJECT)
      : (map.invitationEmailSubjectCollaborator ?? DEFAULT_COLLABORATOR_SUBJECT);
  return substitute(raw, map.title, getOrigin(), map.slug);
}

export function getInvitationBody(map: SceneMap, role: InvitationRole): string {
  const raw =
    role === 'admin'
      ? (map.invitationEmailBodyAdmin ?? DEFAULT_ADMIN_BODY)
      : (map.invitationEmailBodyCollaborator ?? DEFAULT_COLLABORATOR_BODY);
  return substitute(raw, map.title, getOrigin(), map.slug);
}

function getOrigin(): string {
  if (typeof process !== 'undefined' && process.env?.VERCEL_URL) {
    const url = process.env.VERCEL_URL;
    return url.startsWith('http') ? url : `https://${url}`;
  }
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_ORIGIN) {
    return process.env.NEXT_PUBLIC_APP_ORIGIN;
  }
  return 'https://scenemapper.example.com';
}

const FROM_NAME_DEFAULT = 'Scene Mapper';

export interface SendInvitationOptions {
  map: SceneMap;
  to: string;
  role: InvitationRole;
  fromEmail: string;
  fromName?: string;
}

/**
 * Send one invitation email via Resend.
 * Returns { sent: true } or { sent: false, error: string }.
 */
export async function sendInvitationEmail(options: SendInvitationOptions): Promise<
  | { sent: true }
  | { sent: false; error: string }
> {
  const { map, to, role, fromEmail, fromName } = options;
  const apiKey = typeof process !== 'undefined' ? process.env.RESEND_API_KEY : undefined;
  if (!apiKey) {
    return { sent: false, error: 'RESEND_API_KEY not configured' };
  }

  const subject = getInvitationSubject(map, role);
  const body = getInvitationBody(map, role);
  const displayName = fromName ?? map.invitationSenderName ?? FROM_NAME_DEFAULT;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${displayName} <${fromEmail}>`,
      to: [to],
      subject: subject.replace(/\*\*(.+?)\*\*/g, '$1'), // strip markdown bold for subject
      text: body,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = (data as { message?: string }).message ?? res.statusText;
    return { sent: false, error: msg };
  }
  return { sent: true };
}
