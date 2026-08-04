/**
 * Creates the Board's first real administrator.
 *
 *   npm run create:admin -- --email ama@oseitutushs.edu.gh --name "Ama Boateng"
 *
 * This exists so a live deployment never has to run the demo seed. `db:seed`
 * creates eight accounts that share one published password — fine for clicking
 * around locally, a genuine hole on a school's public site.
 *
 * Options:
 *   --email <address>     required
 *   --name "<full name>"  required
 *   --password <value>    optional; one is generated and printed if omitted
 *   --role <ROLE>         MEMBER | EDITOR | EXECUTIVE | ADMIN (default ADMIN)
 *   --position "<title>"  optional, e.g. "Editor-in-Chief"
 *   --promote             allow updating someone who already exists
 *
 * Run against production by putting the connection string in front:
 *   DATABASE_URL="postgresql://…" npm run create:admin -- --email … --name …
 */

import crypto from "node:crypto";

import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const ROLES: Role[] = ["MEMBER", "EDITOR", "EXECUTIVE", "ADMIN"];

type Options = {
  email: string;
  name: string;
  password: string | null;
  role: Role;
  position: string | null;
  promote: boolean;
};

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    email: "",
    name: "",
    password: null,
    role: "ADMIN",
    position: null,
    promote: false,
  };

  const need = (value: string | undefined, flag: string) => {
    if (!value || value.startsWith("--")) {
      throw new Error(`${flag} needs a value after it.`);
    }
    return value;
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--email":
        opts.email = need(argv[++i], "--email").trim().toLowerCase();
        break;
      case "--name":
        opts.name = need(argv[++i], "--name").trim();
        break;
      case "--password":
        opts.password = need(argv[++i], "--password");
        break;
      case "--position":
        opts.position = need(argv[++i], "--position").trim();
        break;
      case "--role": {
        const value = need(argv[++i], "--role").toUpperCase() as Role;
        if (!ROLES.includes(value)) {
          throw new Error(`--role must be one of: ${ROLES.join(", ")}`);
        }
        opts.role = value;
        break;
      }
      case "--promote":
        opts.promote = true;
        break;
      case "--help":
      case "-h":
        console.log(
          [
            "Usage:",
            '  npm run create:admin -- --email you@school.edu --name "Your Name"',
            "",
            "  --email <address>     required",
            "  --name <full name>    required",
            "  --password <value>    optional; generated and printed if omitted",
            "  --role <ROLE>         MEMBER | EDITOR | EXECUTIVE | ADMIN (default ADMIN)",
            "  --position <title>    optional, e.g. 'Editor-in-Chief'",
            "  --promote             update someone who already exists",
          ].join("\n"),
        );
        process.exit(0);
        break;
      default:
        throw new Error(`Unrecognised option: ${arg}`);
    }
  }

  if (!opts.email) throw new Error("--email is required.");
  if (!opts.name) throw new Error("--name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(opts.email)) {
    throw new Error(`That doesn't look like an email address: ${opts.email}`);
  }
  if (opts.password && opts.password.length < 10) {
    throw new Error("--password must be at least 10 characters.");
  }

  return opts;
}

/** Random, but still readable enough to pass on out loud once. */
function generatePassword(): string {
  return `EIC-${crypto.randomBytes(9).toString("base64url").replace(/[-_]/g, "")}`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const db = new PrismaClient({ log: ["error"] });

  try {
    await db.$connect();

    const existing = await db.user.findUnique({
      where: { email: opts.email },
      select: { id: true, name: true, role: true },
    });

    if (existing && !opts.promote) {
      throw new Error(
        `${opts.email} already exists (${existing.name}, ${existing.role}).\n` +
          "Pass --promote to change their role and reset their password.",
      );
    }

    // Only generate one when the caller didn't choose. Someone who supplies a
    // password has chosen it deliberately and shouldn't be forced to change it.
    const generated = opts.password === null;
    const password = opts.password ?? generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);

    const user = existing
      ? await db.user.update({
          where: { id: existing.id },
          data: {
            name: opts.name,
            role: opts.role,
            status: "ACTIVE",
            passwordHash,
            mustChangePassword: generated,
            ...(opts.position ? { position: opts.position } : {}),
          },
        })
      : await db.user.create({
          data: {
            email: opts.email,
            name: opts.name,
            role: opts.role,
            status: "ACTIVE",
            passwordHash,
            mustChangePassword: generated,
            position: opts.position,
            isExecutive: opts.role === "ADMIN" || opts.role === "EXECUTIVE",
          },
        });

    await db.auditLog.create({
      data: {
        actorId: null,
        actorName: "Command line",
        action: existing ? "user.update" : "user.create",
        entityType: "User",
        entityId: user.id,
        summary: existing
          ? `Promoted ${user.name} to ${user.role} from the command line`
          : `Created ${user.name} (${user.email}) as ${user.role} from the command line`,
      },
    });

    const log = (line = "") => process.stderr.write(`${line}\n`);
    log(`\n${existing ? "Updated" : "Created"} ${user.name} — ${user.role}`);
    log(`  Email:    ${user.email}`);

    if (generated) {
      log(`  Password: ${password}`);
      log("\n  Shown once and not recoverable — copy it now.");
      log("  They'll be asked to choose their own on first sign-in.");
    } else {
      log("  Password: (the one you supplied)");
    }
    log("");
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : String(err)}`);
  if (err instanceof Error && /P1001|reach database/i.test(err.message)) {
    console.error(
      "\nThe database wasn't reachable. Check DATABASE_URL, or pass it inline:\n" +
        '  DATABASE_URL="postgresql://…" npm run create:admin -- --email … --name …',
    );
  }
  process.exit(1);
});
