import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { auth } from "./auth";
import { db } from "./db";
import { hasRole } from "./rbac";

export type PortalUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  position: string | null;
  avatarUrl: string | null;
  mustChangePassword: boolean;
};

/** Where someone on a temporary password is held until they replace it. */
const PASSWORD_PAGE = "/portal/profile";

/**
 * Loads the signed-in member from the database rather than trusting the JWT.
 *
 * The token is only refreshed on sign-in, so a role change or an archived
 * account wouldn't take effect until the member signed out. Reading the row on
 * each request means a revoked member loses access immediately.
 */
export async function getPortalUser(): Promise<PortalUser> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      position: true,
      avatarUrl: true,
      status: true,
      mustChangePassword: true,
    },
  });

  if (!user || user.status === "ARCHIVED") redirect("/login");

  /*
   * Hold anyone still using an administrator-issued password on the profile
   * page until they have set their own.
   *
   * The flag is read from the row we just loaded rather than from the session
   * token, so it goes false the instant the password changes. An earlier
   * version checked the token in middleware; the token could not be refreshed
   * reliably, which meant a member who *had* changed their password was still
   * redirected to change it — locked out of the site by the very check meant
   * to protect them.
   *
   * `x-pathname` is set by middleware. If it is somehow absent we skip the
   * check rather than guess, because guessing wrong here means a redirect loop
   * on the page we would be redirecting to.
   */
  if (user.mustChangePassword) {
    const pathname = (await headers()).get("x-pathname");
    if (pathname && pathname !== PASSWORD_PAGE) redirect(PASSWORD_PAGE);
  }

  const { status: _status, ...rest } = user;
  return rest;
}

/** As above, but also enforces a minimum role. */
export async function requireRole(min: Role): Promise<PortalUser> {
  const user = await getPortalUser();
  if (!hasRole(user.role, min)) redirect("/portal?denied=1");
  return user;
}

/** Announcements this member is allowed to see. */
export function announcementVisibility(role: Role) {
  return {
    publishedAt: { lte: new Date() },
    OR: [
      { audienceRoles: { isEmpty: true } },
      { audienceRoles: { has: role } },
    ],
    AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
  };
}
