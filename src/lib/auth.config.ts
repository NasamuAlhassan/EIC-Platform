import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe half of the auth setup.
 *
 * `middleware.ts` runs on the Edge runtime, where Prisma and bcrypt can't run.
 * So the parts middleware needs (cookie handling, the `authorized` callback)
 * live here, and the Credentials provider — which touches the database — is
 * added on top in `auth.ts`, which only ever runs in Node.
 */
export const authConfig = {
  /*
   * Auth.js refuses to serve requests for a host it hasn't been told to trust,
   * which otherwise breaks every deployment that isn't Vercel — including
   * `next start` locally and any school-hosted server. We're behind whatever
   * host the site is actually served from, so trust it.
   */
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
  callbacks: {
    // Runs on every request that middleware matches.
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const { pathname } = request.nextUrl;

      const isProtected =
        pathname.startsWith("/portal") || pathname.startsWith("/admin");

      if (isProtected) return isLoggedIn;
      return true;
    },

    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.position = user.position;
        token.avatarUrl = user.avatarUrl;
        token.mustChangePassword = user.mustChangePassword;
      }

      /*
       * Lets the app refresh the token after a profile or password update
       * without forcing a re-login.
       *
       * The payload arrives in one of two shapes and Auth.js types it as `any`,
       * so both are handled: `update({ name })` from a client component sends
       * the fields flat, while `unstable_update({ user: { … } })` on the server
       * nests them under `user`. Reading only the flat shape silently ignored
       * the server-side call — which left `mustChangePassword` set after
       * someone had changed their password, and the middleware then kept
       * redirecting them back to do it again.
       */
      if (trigger === "update" && session) {
        type Patch = {
          name?: string;
          avatarUrl?: string | null;
          mustChangePassword?: boolean;
        };

        const payload = session as Patch & { user?: Patch };
        const patch: Patch = { ...payload, ...(payload.user ?? {}) };

        if (patch.name) token.name = patch.name;
        if (patch.avatarUrl !== undefined) token.avatarUrl = patch.avatarUrl;
        if (patch.mustChangePassword !== undefined) {
          token.mustChangePassword = patch.mustChangePassword;
        }
      }

      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.position = token.position;
        session.user.avatarUrl = token.avatarUrl;
        session.user.mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
  providers: [], // filled in by auth.ts
} satisfies NextAuthConfig;
