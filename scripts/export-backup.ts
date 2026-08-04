/**
 * Command-line backup.
 *
 *   npm run export:backup                  -> ./backups/eic-backup-<timestamp>.json
 *   npm run export:backup -- --out b.json  -> a path you choose
 *   npm run export:backup -- --stdout      -> to stdout, for piping
 *
 * Writes the same payload the admin download produces (see src/lib/export.ts),
 * so a scripted backup and a manual one are interchangeable.
 *
 * Run it against production by putting the connection string in front:
 *
 *   DATABASE_URL="postgresql://…" npm run export:backup
 *
 * This is the half of the backup story that isn't the database itself —
 * uploaded files live in Vercel Blob or ./.uploads and need copying separately.
 * The script says so at the end rather than letting you assume otherwise.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { buildExportPayload } from "../src/lib/export";

type Options = {
  out: string | null;
  toStdout: boolean;
};

function parseArgs(argv: string[]): Options {
  const opts: Options = { out: null, toStdout: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--stdout") {
      opts.toStdout = true;
    } else if (arg === "--out" || arg === "-o") {
      const next = argv[++i];
      if (!next) throw new Error("--out needs a file path after it.");
      opts.out = next;
    } else if (arg.startsWith("--out=")) {
      opts.out = arg.slice("--out=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "Usage: npm run export:backup [-- options]",
          "",
          "  --out <path>   write to a specific file",
          "  --stdout       write to stdout instead of a file",
          "  --help         show this",
          "",
          "Set BACKUP_DIR to change the default output directory (./backups).",
        ].join("\n"),
      );
      process.exit(0);
    } else {
      throw new Error(`Unrecognised option: ${arg}`);
    }
  }

  return opts;
}

/** Filesystem-safe, sorts chronologically: 2026-08-04T19-30-12 */
function timestamp(at: Date): string {
  return at.toISOString().replace(/\.\d+Z$/, "").replace(/:/g, "-");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  // A separate client from src/lib/db so the script owns its own connection
  // and can close it cleanly on exit.
  const db = new PrismaClient({ log: ["error"] });

  try {
    // Fail early and legibly rather than mid-export.
    await db.$connect();

    const startedAt = new Date();
    const payload = await buildExportPayload({
      exportedBy: `command line (${process.env.USER ?? "unknown user"})`,
    });
    const json = JSON.stringify(payload, null, 2);

    if (opts.toStdout) {
      process.stdout.write(json);
      return;
    }

    const target =
      opts.out ??
      path.join(
        process.env.BACKUP_DIR ?? path.join(process.cwd(), "backups"),
        `eic-backup-${timestamp(startedAt)}.json`,
      );

    await fs.mkdir(path.dirname(path.resolve(target)), { recursive: true });
    await fs.writeFile(target, json, "utf8");

    // Everything below is progress reporting, so it goes to stderr — that keeps
    // --stdout pipeable and this consistent with it.
    const log = (line = "") => process.stderr.write(`${line}\n`);

    log(`\nBacked up to ${path.relative(process.cwd(), target) || target}`);
    log(`${formatBytes(Buffer.byteLength(json))} · ${payload.exportedAt}\n`);

    const rows = Object.entries(payload.counts).filter(([, n]) => n > 0);
    const width = Math.max(...rows.map(([name]) => name.length), 10);
    for (const [name, count] of rows) {
      log(`  ${name.padEnd(width)}  ${String(count).padStart(6)}`);
    }

    const empty = Object.entries(payload.counts).filter(([, n]) => n === 0);
    if (empty.length > 0) {
      log(`\n  (empty: ${empty.map(([n]) => n).join(", ")})`);
    }

    // The part people forget until they need it.
    const blobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
    log("\nNot included in this file — back these up separately:");
    log(
      blobConfigured
        ? "  · Uploaded files are in your Vercel Blob store."
        : "  · Uploaded files are in ./.uploads (documents, photos, PDFs).",
    );
    log("");
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(
    `\nBackup failed: ${err instanceof Error ? err.message : String(err)}`,
  );
  if (err instanceof Error && /P1001|reach database/i.test(err.message)) {
    console.error(
      "The database wasn't reachable. Check DATABASE_URL, or pass it inline:\n" +
        '  DATABASE_URL="postgresql://…" npm run export:backup',
    );
  }
  process.exit(1);
});
