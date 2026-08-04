/**
 * Production build.
 *
 *   prisma generate  ->  prisma migrate deploy  ->  next build
 *
 * The only reason this isn't a one-line npm script is `DIRECT_URL`.
 *
 * Migrations need a direct (unpooled) connection — the pooled endpoint runs
 * PgBouncer, which can't hold the session-level advisory lock Prisma takes
 * while applying one. But every host names that second connection string
 * differently, and Prisma's `env()` has no fallback, so a missing variable
 * fails the whole build before it starts.
 *
 * Hosts already provide it, just not under the name the schema asks for:
 *   Vercel + Neon    -> DATABASE_URL_UNPOOLED
 *   Vercel Postgres  -> POSTGRES_URL_NON_POOLING
 *
 * So we look for it under the names it actually goes by, and only fall back to
 * the pooled URL as a last resort — with a warning, because that is the one
 * case where a migration might hang.
 */

import { spawnSync } from "node:child_process";

const CANDIDATES = [
  // Set explicitly — always wins.
  "DIRECT_URL",
  // Vercel's Neon integration.
  "DATABASE_URL_UNPOOLED",
  // Vercel Postgres.
  "POSTGRES_URL_NON_POOLING",
  // Supabase and others often expose only the one string.
  "POSTGRES_URL_NON_POOLED",
];

function resolveDirectUrl() {
  for (const name of CANDIDATES) {
    const value = process.env[name];
    if (value) return { value, source: name };
  }

  if (process.env.DATABASE_URL) {
    return { value: process.env.DATABASE_URL, source: "DATABASE_URL" };
  }

  return null;
}

function run(command, args, env) {
  const result = spawnSync(command, args, { stdio: "inherit", env, shell: false });

  if (result.error) {
    console.error(`\nCouldn't run ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const resolved = resolveDirectUrl();

if (!resolved) {
  console.error(
    [
      "",
      "No database connection string found.",
      "",
      "Set DATABASE_URL to your Postgres connection string. On Vercel, add it",
      "under Settings -> Environment Variables, or create a database from the",
      "Storage tab and it will be added for you.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

if (resolved.source === "DATABASE_URL") {
  console.warn(
    [
      "",
      "! Using the pooled connection for migrations.",
      "!",
      "! No unpooled connection string was found. Migrations take a session-",
      "! level lock that a connection pooler may not hold, so this can hang or",
      "! half-apply. It usually works, but it is not the safe path.",
      "!",
      "! To fix: copy your provider's direct / non-pooling connection string",
      "! into an environment variable named DIRECT_URL.",
      "",
    ].join("\n"),
  );
} else if (resolved.source !== "DIRECT_URL") {
  console.log(`Using ${resolved.source} for migrations.`);
}

// Only the migration step gets the direct connection. `generate` doesn't touch
// the database, and the built app must use the pooled URL — serverless opens a
// lot of short-lived connections, which is what the pooler is for.
run("npx", ["prisma", "generate"], process.env);
run("npx", ["prisma", "migrate", "deploy"], {
  ...process.env,
  DATABASE_URL: resolved.value,
});
run("npx", ["next", "build"], process.env);
