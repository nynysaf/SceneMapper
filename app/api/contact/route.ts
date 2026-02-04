import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/contact
 * Sends a contact form message via Resend to the configured contact email.
 * Body: { name, email, subject, body }
 */
export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; subject?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const msgBody = typeof body.body === 'string' ? body.body.trim() : '';

  if (!name || !email || !subject || !msgBody) {
    return NextResponse.json(
      { error: 'Name, email, subject, and message are required' },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const toEmail = process.env.CONTACT_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? fromEmail;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Contact form is not configured. Please try again later or email us directly.' },
      { status: 503 },
    );
  }

  const text = [
    `From: ${name} <${email}>`,
    `Subject: ${subject}`,
    '',
    msgBody,
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Scene Mapper Contact <${fromEmail}>`,
      to: [toEmail],
      reply_to: email,
      subject: `[Contact] ${subject}`,
      text,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = (data as { message?: string }).message ?? res.statusText;
    return NextResponse.json(
      { error: msg || 'Could not send message. Please try again.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}
