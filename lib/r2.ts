/**
 * Cloudflare R2 helpers for map background images.
 * R2 is S3-compatible; we use presigned PUT URLs so the client uploads directly
 * and the file never hits our server (avoids Vercel 4.5 MB body limit).
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REGION = 'auto';
const PRESIGN_EXPIRES_IN = 600; // 10 minutes

function getConfig() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicBaseUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '') ?? '';
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    throw new Error(
      'Missing R2 config: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL'
    );
  }
  return {
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl,
  };
}

function createClient() {
  const { endpoint, accessKeyId, secretAccessKey } = getConfig();
  return new S3Client({
    region: REGION,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

/**
 * Generate a presigned PUT URL and the public URL for the object.
 * Path is userId/mapId.ext (stable path: one image per map, overwrite on replace).
 */
export async function getPresignedPutUrl(
  userId: string,
  mapId: string,
  contentType: string,
  ext: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const { bucket, publicBaseUrl } = getConfig();
  const key = `${userId}/${mapId}.${ext}`;
  const client = createClient();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: PRESIGN_EXPIRES_IN });
  const publicUrl = `${publicBaseUrl}/${key}`;
  return { uploadUrl, publicUrl };
}

/**
 * Delete an object from R2 by its public URL (if it's our R2 bucket).
 * Returns true if the URL was ours and delete was attempted; false if not our URL or R2 not configured.
 */
export async function deleteObjectByPublicUrl(publicUrl: string | null | undefined): Promise<boolean> {
  if (!publicUrl || typeof publicUrl !== 'string') return false;
  let config: ReturnType<typeof getConfig>;
  try {
    config = getConfig();
  } catch {
    return false;
  }
  const { bucket, publicBaseUrl } = config;
  if (!publicBaseUrl || !publicUrl.startsWith(publicBaseUrl + '/')) return false;
  const key = publicUrl.slice(publicBaseUrl.length).replace(/^\//, '').split('?')[0];
  if (!key) return false;
  const client = createClient();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  return true;
}
