import { NextResponse } from "next/server";
import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleMinRoles } from "@/lib/rbac";
import { LOCAL_UPLOAD_ROOT } from "@/lib/storage";

/**
 * Serves files saved by the local storage adapter.
 *
 * The local adapter writes outside `public/`, so this is the only way those
 * files are reachable — which is the point. Serving them through code means an
 * executive-only document can be permission-checked before it is handed over,
 * whereas anything under `public/` is baked into the build and served by the
 * static handler with no checks at all.
 *
 * Only used when BLOB_READ_WRITE_TOKEN is unset; with Blob storage the URLs
 * point at the CDN and never reach here.
 */

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const UPLOAD_ROOT = LOCAL_UPLOAD_ROOT;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const url = `/uploads/${segments.join("/")}`;

  const target = path.resolve(UPLOAD_ROOT, ...segments);

  // Never serve anything outside the uploads directory, whatever the URL says.
  if (!target.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!(await allowed(url, segments[0]))) {
    return new NextResponse("Not found", { status: 404 });
  }

  let stat;
  try {
    stat = await fs.stat(target);
    if (!stat.isFile()) throw new Error("not a file");
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(target).toLowerCase();
  const stream = Readable.toWeb(
    createReadStream(target),
  ) as unknown as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Content-Length": String(stat.size),
      "Cache-Control": "private, max-age=0, must-revalidate",
      // Never let an uploaded file execute as script in the site's origin.
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Documents carry a `minRole`; everything else under /uploads (avatars, covers,
 * publication PDFs, gallery images) is content the site publishes anyway.
 */
async function allowed(url: string, prefix: string): Promise<boolean> {
  if (prefix !== "documents") return true;

  const doc = await db.document.findFirst({
    where: { fileUrl: url },
    select: { minRole: true, isPublic: true },
  });

  // Not a tracked document — nothing to authorise against, so refuse.
  if (!doc) return false;
  if (doc.isPublic) return true;

  const session = await auth();
  if (!session?.user) return false;

  return visibleMinRoles(session.user.role).includes(doc.minRole);
}
