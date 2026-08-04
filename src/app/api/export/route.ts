import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { buildExportPayload, exportFilename } from "@/lib/export";

/**
 * Full data export, as one JSON document.
 *
 * This is the "you can always get your data out" guarantee. The payload itself
 * is assembled in `lib/export.ts`, shared with `npm run export:backup` so the
 * download and the scripted backup always contain the same thing.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const session = await auth();

  if (!session?.user || !can.exportData(session.user.role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const payload = await buildExportPayload({
    exportedBy: session.user.email ?? session.user.name ?? "Unknown",
  });

  await recordAudit({
    actorId: session.user.id,
    actorName: session.user.name ?? "Unknown",
    action: "data.export",
    entityType: "System",
    summary: "Exported a full copy of the database",
  });

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${exportFilename()}"`,
      "Cache-Control": "no-store",
    },
  });
}
