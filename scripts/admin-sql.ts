/**
 * Prints the SQL to create an administrator, without connecting to anything.
 *
 *   npm run admin:sql -- --email you@school.edu --name "Your Name"
 *
 * For when `create:admin` can't reach the database — most often because the
 * network you're on blocks outbound Postgres (port 5432), which is common on
 * school and office wifi. Paste the output into your provider's browser SQL
 * editor (Neon: SQL Editor in the left menu) and it runs from their side
 * instead of yours.
 *
 * The password is hashed here on your machine. Neither it nor the hash is sent
 * anywhere by this script — you choose what to paste, and where.
 *
 * Options match create:admin: --email, --name, --password, --role, --position.
 * Re-running with the same email resets that account's password rather than
 * failing, so it doubles as a recovery path if you lose the first one.
 */

import crypto from "node:crypto";

import bcrypt from "bcryptjs";

const ROLES = ["MEMBER", "EDITOR", "EXECUTIVE", "ADMIN"] as const;
type Role = (typeof ROLES)[number];

type Options = {
  email: string;
  name: string;
  password: string | null;
  role: Role;
  position: string | null;
};

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    email: "",
    name: "",
    password: null,
    role: "ADMIN",
    position: null,
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
      case "--help":
      case "-h":
        console.log(
          'Usage: npm run admin:sql -- --email you@school.edu --name "Your Name"',
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

/** Postgres string literal — double any single quotes. */
function quote(value: string | null): string {
  if (value === null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

/** Shaped like the cuid() values Prisma generates. Only needs to be unique. */
function id(): string {
  return `c${crypto.randomBytes(12).toString("hex").slice(0, 24)}`;
}

function generatePassword(): string {
  return `EIC-${crypto.randomBytes(9).toString("base64url").replace(/[-_]/g, "")}`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const generated = opts.password === null;
  const password = opts.password ?? generatePassword();
  const hash = await bcrypt.hash(password, 12);
  const isExec = opts.role === "ADMIN" || opts.role === "EXECUTIVE";

  const sql = `-- Creates (or resets) the ${opts.role} account for ${opts.email}
-- Safe to run more than once.
INSERT INTO "User" (
  "id", "email", "passwordHash", "name", "role", "status",
  "position", "isExecutive", "mustChangePassword", "updatedAt"
) VALUES (
  ${quote(id())},
  ${quote(opts.email)},
  ${quote(hash)},
  ${quote(opts.name)},
  '${opts.role}',
  'ACTIVE',
  ${quote(opts.position)},
  ${isExec},
  ${generated},
  NOW()
)
ON CONFLICT ("email") DO UPDATE SET
  "passwordHash"       = EXCLUDED."passwordHash",
  "name"               = EXCLUDED."name",
  "role"               = EXCLUDED."role",
  "status"             = 'ACTIVE',
  "position"           = COALESCE(EXCLUDED."position", "User"."position"),
  "mustChangePassword" = EXCLUDED."mustChangePassword",
  "updatedAt"          = NOW();`;

  process.stdout.write(`${sql}\n`);

  const note = (line = "") => process.stderr.write(`${line}\n`);
  note();
  note("Paste the SQL above into your database provider's SQL editor.");
  note("  Neon: left menu -> SQL Editor -> paste -> Run");
  note();
  note(`  Email:    ${opts.email}`);
  note(`  Password: ${password}`);
  note();
  note(
    generated
      ? "  Generated here and shown once. Copy it now — the SQL contains only\n" +
          "  the hash, which cannot be turned back into the password. You'll be\n" +
          "  required to set your own on first sign-in."
      : "  The password you supplied. You won't be prompted to change it.",
  );
  note();
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
