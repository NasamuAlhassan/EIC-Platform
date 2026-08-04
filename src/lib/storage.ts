import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * File storage, behind one interface.
 *
 *  - With BLOB_READ_WRITE_TOKEN set  -> Vercel Blob (what production uses).
 *  - Without it                      -> ./.uploads on local disk.
 *
 * Vercel's filesystem is read-only at runtime, so the local branch is strictly
 * a development convenience. The app never calls either one directly.
 *
 * Note the local directory is deliberately NOT under `public/`. Next.js bakes
 * `public/` into the build and serves it as static assets with no code in the
 * path — an executive-only document sitting there would be downloadable by
 * anyone who knew the URL. Files go outside the served tree and are handed out
 * by `app/uploads/[...path]/route.ts`, which checks permissions first.
 */

/** Local storage root. Outside `public/` on purpose — see above. */
export const LOCAL_UPLOAD_ROOT = path.join(process.cwd(), ".uploads");

export type StoredFile = {
  url: string;
  pathname: string;
  size: number;
  contentType: string;
};

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
]);

export const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Can we actually store a file remotely from here?
 *
 * @vercel/blob accepts credentials two ways, and Vercel now provisions the
 * second one by default:
 *
 *   BLOB_READ_WRITE_TOKEN                  — a long-lived token, any host
 *   BLOB_STORE_ID + an OIDC token          — what "Connect Store" sets up
 *
 * Checking only for the token made a correctly-connected store look unset, so
 * uploads silently fell back to local disk — which on Vercel is read-only, so
 * every upload would have failed with the dashboard insisting storage was fine.
 *
 * The OIDC token is injected by the platform at runtime, so a store id alone is
 * only usable when we're actually running on Vercel. Locally that combination
 * would fail, and falling back to disk is the better answer there.
 */
export function isBlobConfigured() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;

  const hasStore = Boolean(process.env.BLOB_STORE_ID);
  const canMintOidc = Boolean(
    process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL,
  );

  return hasStore && canMintOidc;
}

/** Strip anything that could escape the upload directory or confuse a browser. */
function safeName(name: string) {
  const base = path.basename(name).replace(/[^\w.\- ]+/g, "_").slice(0, 120);
  return base || "file";
}

export class UploadError extends Error {}

export async function putFile(
  file: File,
  opts: { prefix?: string } = {},
): Promise<StoredFile> {
  if (file.size === 0) throw new UploadError("The file is empty.");
  if (file.size > MAX_BYTES) {
    throw new UploadError(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). The limit is 25 MB.`,
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    throw new UploadError(
      `Files of type "${file.type || "unknown"}" aren't allowed. Use PDF, Office documents, or images.`,
    );
  }

  const prefix = opts.prefix ?? "files";
  // Random prefix keeps two uploads of "minutes.pdf" from colliding, and stops
  // anyone guessing URLs of files they haven't been shown.
  const key = `${prefix}/${crypto.randomUUID()}-${safeName(file.name)}`;

  if (isBlobConfigured()) {
    const { put } = await import("@vercel/blob");
    // Only pass a token when we have one. Handing the SDK `undefined` is fine,
    // but being explicit keeps the OIDC path obvious.
    const blob = await put(key, file, {
      access: "public",
      contentType: file.type,
      ...(process.env.BLOB_READ_WRITE_TOKEN
        ? { token: process.env.BLOB_READ_WRITE_TOKEN }
        : {}),
    });
    return {
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
      contentType: file.type,
    };
  }

  const dir = path.join(LOCAL_UPLOAD_ROOT, prefix);
  await fs.mkdir(dir, { recursive: true });

  const filename = key.slice(prefix.length + 1);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), buffer);

  return {
    url: `/uploads/${prefix}/${filename}`,
    pathname: key,
    size: file.size,
    contentType: file.type,
  };
}

export async function deleteFile(url: string): Promise<void> {
  try {
    if (isBlobConfigured() && url.startsWith("http")) {
      const { del } = await import("@vercel/blob");
      await del(url, {
        ...(process.env.BLOB_READ_WRITE_TOKEN
          ? { token: process.env.BLOB_READ_WRITE_TOKEN }
          : {}),
      });
      return;
    }

    if (url.startsWith("/uploads/")) {
      const rel = url.replace(/^\/uploads\//, "");
      const target = path.resolve(LOCAL_UPLOAD_ROOT, rel);
      // Never follow a path out of the uploads directory.
      if (!target.startsWith(path.resolve(LOCAL_UPLOAD_ROOT) + path.sep)) return;
      await fs.unlink(target);
    }
  } catch {
    // A missing file is not worth failing the surrounding delete over — the
    // database row is the source of truth.
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
