import "server-only";

import { db } from "./db";

/**
 * Append-only activity trail.
 *
 * `actorName` is denormalised on purpose: the trail has to stay readable even
 * after a member leaves and their account is removed, which is the whole point
 * of keeping it.
 */
export async function recordAudit(entry: {
  actorId?: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorName: entry.actorName,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        summary: entry.summary,
      },
    });
  } catch (err) {
    // Never let logging break the operation the user actually asked for.
    console.error("[audit] failed to record entry", err);
  }
}
