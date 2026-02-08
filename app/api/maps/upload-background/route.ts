/**
 * POST /api/maps/upload-background
 * Returns a presigned PUT URL and public URL for a map background image (Cloudflare R2).
 * Client uploads the file directly to the presigned URL so the file never hits our server.
 * Stable path: userId/mapId.ext (one image per map; replace overwrites).
 * Body: { contentType: string, mapId: string }
 * Response: { uploadUrl: string, publicUrl: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserIdFromRequest } from '@/lib/auth-api';
import { getPresignedPutUrl } from '@/lib/r2';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function extFromMime(type: string): string {
  if (type === 'image/png') return 'png';
  if (type === 'image/jpeg' || type === 'image/jpg') return 'jpg';
  if (type === 'image/webp') return 'webp';
  return 'png';
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Sign in to upload a background image.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const contentType = typeof body?.contentType === 'string' ? body.contentType.trim() : '';
    const mapId = typeof body?.mapId === 'string' ? body.mapId.trim() : '';
    if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid or missing contentType. Use image/png, image/jpeg, or image/webp.' },
        { status: 400 }
      );
    }
    if (!mapId) {
      return NextResponse.json({ error: 'Missing mapId.' }, { status: 400 });
    }

    const ext = extFromMime(contentType);
    const { uploadUrl, publicUrl } = await getPresignedPutUrl(userId, mapId, contentType, ext);
    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to get upload URL';
    if (msg.includes('Missing R2 config')) {
      return NextResponse.json({ error: 'Background upload is not configured.' }, { status: 503 });
    }
    console.error('POST /api/maps/upload-background', err);
    return NextResponse.json({ error: 'Failed to get upload URL' }, { status: 500 });
  }
}
