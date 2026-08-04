import { Role } from "@prisma/client";

/**
 * Roles are *ranked*. A higher rank can see and do everything a lower rank can.
 * This keeps permission checks to a single comparison instead of a matrix.
 */
export const ROLE_RANK: Record<Role, number> = {
  MEMBER: 0,
  EDITOR: 1,
  EXECUTIVE: 2,
  ADMIN: 3,
};

export const ROLE_LABEL: Record<Role, string> = {
  MEMBER: "Member",
  EDITOR: "Editor",
  EXECUTIVE: "Executive",
  ADMIN: "Administrator",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  MEMBER:
    "Can read announcements, browse the document library, RSVP to events, and see the directory.",
  EDITOR:
    "Everything a Member can do, plus publishing news posts and uploading documents and media.",
  EXECUTIVE:
    "Everything an Editor can do, plus creating events and announcements, assigning tasks, and viewing attendance.",
  ADMIN:
    "Full access, including managing members and roles, and the audit log.",
};

export const ALL_ROLES: Role[] = ["MEMBER", "EDITOR", "EXECUTIVE", "ADMIN"];

/** Does `role` meet or exceed `required`? */
export function hasRole(role: Role | undefined | null, required: Role): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/**
 * Named capabilities. Pages and actions check these rather than comparing roles
 * inline, so changing who can do what is a one-line edit here.
 */
export const can = {
  // Content
  uploadDocuments: (r?: Role | null) => hasRole(r, "EDITOR"),
  manageDocuments: (r?: Role | null) => hasRole(r, "EXECUTIVE"),
  uploadMedia: (r?: Role | null) => hasRole(r, "EDITOR"),
  managePosts: (r?: Role | null) => hasRole(r, "EDITOR"),
  managePublications: (r?: Role | null) => hasRole(r, "EDITOR"),

  // Operations
  manageEvents: (r?: Role | null) => hasRole(r, "EXECUTIVE"),
  manageAnnouncements: (r?: Role | null) => hasRole(r, "EXECUTIVE"),
  assignTasks: (r?: Role | null) => hasRole(r, "EXECUTIVE"),
  viewAttendance: (r?: Role | null) => hasRole(r, "EXECUTIVE"),
  viewSubmissions: (r?: Role | null) => hasRole(r, "EXECUTIVE"),
  sendGroupMessages: (r?: Role | null) => hasRole(r, "EXECUTIVE"),

  // Administration
  manageMembers: (r?: Role | null) => hasRole(r, "ADMIN"),
  viewAuditLog: (r?: Role | null) => hasRole(r, "ADMIN"),
  exportData: (r?: Role | null) => hasRole(r, "ADMIN"),

  /** Anyone who should see the /admin area at all. */
  accessAdmin: (r?: Role | null) => hasRole(r, "EDITOR"),
};

/**
 * The set of `minRole` values a member of `userRole` is allowed to see.
 *
 * Documents and events carry a `minRole` meaning "this rank and above may read
 * it". So a member can see anything whose `minRole` is at or *below* their own
 * rank: an Executive sees MEMBER, EDITOR, and EXECUTIVE material, while a
 * Member sees only MEMBER material.
 *
 * Use this for `where: { minRole: { in: ... } }` filters. Getting the direction
 * wrong inverts the whole permission model — a Member would read the executive
 * committee's minutes — so it lives in one place rather than inline.
 */
export function visibleMinRoles(userRole: Role): Role[] {
  return ALL_ROLES.filter((r) => ROLE_RANK[r] <= ROLE_RANK[userRole]);
}

/**
 * The inverse: given something's `minRole`, which members can reach it.
 *
 * Use this when you start from the *record* and need its audience — picking
 * who to email about an event, say. `visibleMinRoles` starts from the person
 * and filters records; this starts from the record and filters people. Reaching
 * for the wrong one silently produces the wrong audience, so both are named for
 * the direction they run in.
 */
export function rolesWithAccessTo(minRole: Role): Role[] {
  return ALL_ROLES.filter((r) => ROLE_RANK[r] >= ROLE_RANK[minRole]);
}
