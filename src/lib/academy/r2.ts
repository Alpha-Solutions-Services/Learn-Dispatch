import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function r2Config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export function isR2Configured(): boolean {
  return r2Config() !== null;
}

/** Object key from stored video_url (key or full R2 URL). */
export function resolveR2ObjectKey(videoUrl: string): string | null {
  const raw = videoUrl.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) {
    return raw.replace(/^\//, "");
  }
  try {
    const url = new URL(raw);
    // https://<account>.r2.cloudflarestorage.com/<bucket>/<key>
    // or custom domain /pub URL — use pathname without leading slash
    const path = url.pathname.replace(/^\//, "");
    const cfg = r2Config();
    if (cfg && path.startsWith(`${cfg.bucket}/`)) {
      return path.slice(cfg.bucket.length + 1);
    }
    return path || null;
  } catch {
    return null;
  }
}

export async function createR2SignedVideoUrl(
  videoUrl: string,
  expiresInSeconds = 600,
): Promise<string | null> {
  const cfg = r2Config();
  if (!cfg) return null;

  const key = resolveR2ObjectKey(videoUrl);
  if (!key) return null;

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  const command = new GetObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
