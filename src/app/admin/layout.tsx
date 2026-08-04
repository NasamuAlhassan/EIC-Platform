import type { Metadata } from "next";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin-shell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Editors and above can reach the admin area; each page enforces its own,
  // stricter requirement on top of this.
  const user = await requireRole("EDITOR");

  const newSubmissions = can.viewSubmissions(user.role)
    ? await db.submission.count({ where: { status: "NEW" } })
    : 0;

  return (
    <AdminShell role={user.role} newSubmissions={newSubmissions}>
      {children}
    </AdminShell>
  );
}
