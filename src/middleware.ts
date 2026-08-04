import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";

// Edge-safe: `authConfig` has no providers, so no Prisma or bcrypt is pulled in.
const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const { pathname, search } = request.nextUrl;

  if (!request.auth) {
    const login = new URL("/login", request.nextUrl);
    login.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  /*
   * Pass the path down to the server components.
   *
   * A layout can't otherwise know which page is rendering inside it, and
   * `getPortalUser` needs that to hold someone on the profile page until they
   * have replaced a temporary password — without also blocking the page it is
   * sending them to.
   *
   * Deliberately not doing that check here: middleware runs on the Edge with
   * no database access, so it could only read the flag from the session token,
   * and a token that says "must change" after the password has already been
   * changed locks the member out of the site entirely.
   */
  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname);

  return NextResponse.next({ request: { headers } });
});

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
