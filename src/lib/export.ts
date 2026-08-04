import { Prisma } from "@prisma/client";

import { db } from "./db";

/**
 * Builds a complete copy of the database as one JSON-serialisable object.
 *
 * Shared by the in-app download (`/api/export`) and the command-line backup
 * (`scripts/export-backup.ts`) so the two can't drift — which they already did
 * once: the hand-written list in the route silently stopped covering
 * announcement read receipts and the whole SMS broadcast log when those were
 * added.
 *
 * To stop that recurring, the table list is not written down. It comes from
 * Prisma's own model metadata, so a new model is included the day it exists.
 *
 * Deliberately importable from a plain Node script: no `server-only`, and
 * nothing here reaches for a request or a session.
 */

/**
 * Never leave the database, whichever table they appear on.
 *
 * An export is a file people email to each other and drop in shared drives. It
 * must not double as a credential dump — even a bcrypt hash is worth cracking
 * offline when the passwords are school-issued.
 */
const REDACTED_FIELDS = new Set(["passwordHash"]);

/**
 * Relations that would otherwise be lost.
 *
 * Ordinary relations survive because the foreign key is a column on the row.
 * Prisma's *implicit* many-to-many relations don't — they live in a hidden join
 * table that isn't a model, so enumerating models misses them entirely. Each
 * one has to be pulled in explicitly here.
 *
 * Right now that's document↔tag. If you add another `X[] <-> Y[]` pair without
 * an explicit join model, add it here too or the links won't be in the backup.
 */
const RELATION_INCLUDES: Record<string, Record<string, unknown>> = {
  document: { tags: { select: { slug: true } } },
};

export type ExportPayload = {
  exportedAt: string;
  exportedBy: string;
  note: string;
  counts: Record<string, number>;
  data: Record<string, unknown[]>;
};

/** `Announcement` -> `announcement`, matching the Prisma client's delegates. */
function delegateName(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function redact<T extends Record<string, unknown>>(row: T): T {
  let touched = false;
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (REDACTED_FIELDS.has(key)) {
      touched = true;
      continue;
    }
    out[key] = value;
  }

  return (touched ? out : row) as T;
}

export async function buildExportPayload(options: {
  /** Who asked for it — an email address, or a description for automated runs. */
  exportedBy: string;
}): Promise<ExportPayload> {
  const data: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  for (const model of Prisma.dmmf.datamodel.models) {
    const key = delegateName(model.name);

    const delegate = (db as unknown as Record<string, unknown>)[key] as
      | { findMany?: (args?: unknown) => Promise<Record<string, unknown>[]> }
      | undefined;

    if (typeof delegate?.findMany !== "function") continue;

    const include = RELATION_INCLUDES[key];
    const rows = await delegate.findMany(include ? { include } : undefined);

    data[key] = rows.map(redact);
    counts[key] = rows.length;
  }

  return {
    exportedAt: new Date().toISOString(),
    exportedBy: options.exportedBy,
    note:
      "Complete copy of the database. Password hashes are excluded. " +
      "Uploaded files (documents, publication PDFs, photos) are referenced by " +
      "URL and are NOT contained in this file — back those up separately.",
    counts,
    data,
  };
}

/** `editorial-board-export-2026-08-04.json` */
export function exportFilename(at: Date = new Date()): string {
  return `editorial-board-export-${at.toISOString().slice(0, 10)}.json`;
}
