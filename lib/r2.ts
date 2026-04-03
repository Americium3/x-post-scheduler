import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

// ── R2 client singleton ─────────────────────────────────────────────────────

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("Missing R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)");
    }
    _client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _client;
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("Missing R2_BUCKET_NAME");
  return bucket;
}

/**
 * The public base URL for the R2 bucket.
 * Set R2_PUBLIC_URL to your custom domain or r2.dev public URL, e.g.:
 *   https://media.xpilot.jytech.us
 *   https://pub-abc123.r2.dev
 */
function getPublicBaseUrl(): string {
  const url = process.env.R2_PUBLIC_URL;
  if (!url) throw new Error("Missing R2_PUBLIC_URL — set to your R2 public bucket URL or custom domain");
  return url.replace(/\/$/, ""); // strip trailing slash
}

// ── Public API (drop-in replacement for @vercel/blob) ───────────────────────

export interface PutResult {
  url: string;
  pathname: string;
}

export interface PutOptions {
  access?: "public" | "private"; // ignored — R2 bucket-level access
  contentType?: string;
  addRandomSuffix?: boolean;
  token?: string; // ignored — R2 uses IAM credentials
}

/**
 * Upload a file to R2. Returns `{ url, pathname }` matching the @vercel/blob
 * `put()` return shape.
 */
export async function put(
  pathname: string,
  body: Buffer | Uint8Array | ReadableStream | string,
  options?: PutOptions,
): Promise<PutResult> {
  const bucket = getBucket();
  const suffix = options?.addRandomSuffix !== false ? `-${randomUUID().slice(0, 8)}` : "";

  // Insert suffix before file extension
  let key = pathname;
  if (suffix) {
    const dotIdx = pathname.lastIndexOf(".");
    if (dotIdx > 0) {
      key = pathname.slice(0, dotIdx) + suffix + pathname.slice(dotIdx);
    } else {
      key = pathname + suffix;
    }
  }

  const bodyBuffer = body instanceof Buffer
    ? body
    : body instanceof Uint8Array
      ? Buffer.from(body)
      : typeof body === "string"
        ? Buffer.from(body)
        : Buffer.from(await streamToBuffer(body as ReadableStream));

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bodyBuffer,
      ContentType: options?.contentType ?? "application/octet-stream",
    }),
  );

  const publicUrl = `${getPublicBaseUrl()}/${key}`;
  return { url: publicUrl, pathname: key };
}

/**
 * Delete a file from R2.
 * Accepts either a full public URL or a raw key.
 */
export async function del(urlOrKey: string): Promise<void> {
  const bucket = getBucket();
  const publicBase = getPublicBaseUrl();

  // Extract key from full URL
  let key = urlOrKey;
  if (urlOrKey.startsWith("http://") || urlOrKey.startsWith("https://")) {
    try {
      const parsed = new URL(urlOrKey);
      key = parsed.pathname.replace(/^\//, "");
    } catch {
      // If it's not a valid URL, treat as key
    }
  }

  await getClient().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let done = false;
  while (!done) {
    const result = await reader.read();
    if (result.value) chunks.push(result.value);
    done = result.done;
  }
  return Buffer.concat(chunks);
}
