import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge-safe: `authConfig` has no providers, so no Prisma or bcrypt is pulled in.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  /*
   * Only the two protected areas.
   *
   * This must NOT match /api/auth/* — the middleware's NextAuth instance has no
   * providers (it can't, on the Edge), so letting it see an auth callback makes
   * it try to handle the request itself and fail with InvalidProvider.
   *
   * Keeping the matcher narrow also means the public site never pays for
   * middleware at all.
   */
  matcher: ["/portal/:path*", "/admin/:path*"],
};
