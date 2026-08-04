import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authConfig } from "./auth.config";
import { db } from "./db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase().trim();

        const user = await db.user.findUnique({ where: { email } });

        // Compare against a dummy hash when the user doesn't exist, so that a
        // missing account and a wrong password take the same amount of time.
        const hash =
          user?.passwordHash ??
          "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
        const ok = await bcrypt.compare(parsed.data.password, hash);

        if (!user || !ok) return null;
        if (user.status === "ARCHIVED") return null;

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date(), status: "ACTIVE" },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          position: user.position,
          avatarUrl: user.avatarUrl,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
});

/** Session or bust. Use in server components under /portal and /admin. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    // middleware.ts normally catches this first; this is the backstop.
    throw new Error("UNAUTHENTICATED");
  }
  return session.user;
}
