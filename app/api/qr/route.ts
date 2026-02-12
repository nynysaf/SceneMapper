import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/qr?data=...&size=200
 * Proxies QR code from api.qrserver.com to avoid CORS when drawing to canvas for download.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get('data');
  const size = searchParams.get('size') || '200';
  if (!data) {
    return NextResponse.json({ error: 'data query param required' }, { status: 400 });
  }
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
  try {
    const res = await fetch(qrUrl);
    if (!res.ok) throw new Error(`QR fetch failed: ${res.status}`);
    const blob = await res.blob();
    return new NextResponse(blob, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('GET /api/qr', err);
    return NextResponse.json({ error: 'Failed to generate QR' }, { status: 500 });
  }
}
