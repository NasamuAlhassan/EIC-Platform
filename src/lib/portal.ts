import "server-only";

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
};

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
    },
  });

  if (!user || user.status === "ARCHIVED") redirect("/login");

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
