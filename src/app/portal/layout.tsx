import type { Metadata } from "next";

import { db } from "@/lib/db";
import { getPortalUser, announcementVisibility } from "@/lib/portal";
import { PortalShell } from "@/components/portal-shell";

export const metadata: Metadata = {
  title: { default: "Portal", template: "%s · Portal" },
  robots: { index: false, follow: false },
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getPortalUser();

  const [visible, readCount, openTaskCount] = await Promise.all([
    db.announcement.count({ where: announcementVisibility(user.role) }),
    db.announcementRead.count({
      where: {
        userId: user.id,
        announcement: announcementVisibility(user.role),
      },
    }),
    db.task.count({
      where: { assigneeId: user.id, status: { not: "DONE" } },
    }),
  ]);

  return (
    <PortalShell
      user={user}
      unreadCount={Math.max(0, visible - readCount)}
      openTaskCount={openTaskCount}
    >
      {children}
    </PortalShell>
  );
}
