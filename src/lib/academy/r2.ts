import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "stream";

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

function getR2Client() {
  const cfg = r2Config();
  if (!cfg) return null;
  return {
    cfg,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    }),
  };
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

function candidateKeys(videoUrl: string): string[] {
  const primary = resolveR2ObjectKey(videoUrl);
  if (!primary) return [];
  const keys = [primary];
  const base = primary.split("/").pop() || primary;
  if (!primary.includes("/")) {
    keys.push(`Lectures/${base}`);
  } else if (primary.startsWith("Lectures/")) {
    keys.push(base);
  } else {
    keys.push(`Lectures/${base}`);
  }
  return Array.from(new Set(keys));
}

async function resolveExistingKey(
  client: S3Client,
  bucket: string,
  videoUrl: string,
): Promise<string | null> {
  for (const key of candidateKeys(videoUrl)) {
    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return key;
    } catch {
      // try next
    }
  }
  return null;
}

export async function createR2SignedVideoUrl(
  videoUrl: string,
  expiresInSeconds = 600,
): Promise<string | null> {
  const wired = getR2Client();
  if (!wired) return null;

  const key = await resolveExistingKey(wired.client, wired.cfg.bucket, videoUrl);
  if (!key) return null;

  const command = new GetObjectCommand({
    Bucket: wired.cfg.bucket,
    Key: key,
  });

  return getSignedUrl(wired.client, command, { expiresIn: expiresInSeconds });
}

export type R2ObjectStream = {
  body: ReadableStream<Uint8Array> | null;
  contentType: string;
  contentLength?: number;
  contentRange?: string;
  acceptRanges: string;
  status: number;
  resolvedKey: string;
};

/** Fetch object from R2 for same-origin proxy playback (supports Range). */
export async function getR2ObjectStream(
  videoUrl: string,
  rangeHeader?: string | null,
): Promise<R2ObjectStream | null> {
  const wired = getR2Client();
  if (!wired) return null;

  const key = await resolveExistingKey(wired.client, wired.cfg.bucket, videoUrl);
  if (!key) return null;

  const command = new GetObjectCommand({
    Bucket: wired.cfg.bucket,
    Key: key,
    ...(rangeHeader ? { Range: rangeHeader } : {}),
  });

  const out = await wired.client.send(command);
  const nodeBody = out.Body as unknown as {
    transformToWebStream?: () => ReadableStream<Uint8Array>;
  } & Readable;
  let webBody: ReadableStream<Uint8Array> | null = null;
  if (typeof nodeBody?.transformToWebStream === "function") {
    webBody = nodeBody.transformToWebStream();
  } else if (nodeBody) {
    const { Readable: NodeReadable } = await import("stream");
    webBody = NodeReadable.toWeb(nodeBody as Readable) as ReadableStream<Uint8Array>;
  }

  return {
    body: webBody,
    contentType: out.ContentType || "video/mp4",
    contentLength: out.ContentLength,
    contentRange: out.ContentRange,
    acceptRanges: out.AcceptRanges || "bytes",
    status: rangeHeader ? 206 : 200,
    resolvedKey: key,
  };
}
