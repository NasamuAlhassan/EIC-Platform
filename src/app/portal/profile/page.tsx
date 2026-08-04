import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarCheck, FileText, Megaphone, CheckSquare } from "lucide-react";

import { db } from "@/lib/db";
import { getPortalUser } from "@/lib/portal";
import { ROLE_LABEL, ROLE_DESCRIPTION } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  CardHeader,
  PageHeader,
  Stat,
} from "@/components/ui";
import { ProfileForm, PasswordForm } from "./forms";

export const metadata: Metadata = { title: "My profile" };

export default async function ProfilePage() {
  const session = await getPortalUser();

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      position: true,
      classYear: true,
      phone: true,
      bio: true,
      avatarUrl: true,
      isExecutive: true,
      joinedAt: true,
      lastLoginAt: true,
      showEmail: true,
      showPhone: true,
      emailNotifications: true,
      smsNotifications: true,
      mustChangePassword: true,
    },
  });

  if (!user) notFound();

  // A small contribution history — what this member has actually done.
  const [docCount, postCount, rsvpCount, taskCount] = await Promise.all([
    db.document.count({ where: { uploadedById: user.id } }),
    db.post.count({ where: { authorId: user.id, status: "PUBLISHED" } }),
    db.rsvp.count({ where: { userId: user.id, status: "ATTENDING" } }),
    db.task.count({ where: { assigneeId: user.id, status: "DONE" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="My profile"
        description="Your details, what other members can see, and your password."
      />

      {user.mustChangePassword ? (
        <Alert
          tone="warn"
          title="Please set your own password"
          className="mb-6"
        >
          You&apos;re still using the password an administrator gave you. Change
          it below.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <div className="p-5">
              <ProfileForm user={user} />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Password"
              description="Use something you don't use anywhere else."
            />
            <div className="p-5">
              <PasswordForm />
            </div>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-5 text-center">
            <Avatar
              name={user.name}
              src={user.avatarUrl}
              size={72}
              className="mx-auto"
            />
            <p className="mt-3 font-serif text-[18px]">{user.name}</p>
            <p className="text-[13px] text-ink-2">
              {user.position ?? ROLE_LABEL[user.role]}
            </p>
            <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
              <Badge tone="brand">{ROLE_LABEL[user.role]}</Badge>
              {user.isExecutive ? <Badge tone="accent">Executive</Badge> : null}
            </div>
            <p className="mt-3.5 border-t border-line pt-3 text-[12.5px] text-ink-3">
              Member since {formatDate(user.joinedAt)}
              {user.lastLoginAt ? (
                <>
                  <br />
                  Last signed in {formatDate(user.lastLoginAt)}
                </>
              ) : null}
            </p>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Documents"
              value={docCount}
              icon={<FileText size={16} />}
            />
            <Stat
              label="Posts"
              value={postCount}
              icon={<Megaphone size={16} />}
            />
            <Stat
              label="Attended"
              value={rsvpCount}
              icon={<CalendarCheck size={16} />}
            />
            <Stat
              label="Tasks done"
              value={taskCount}
              icon={<CheckSquare size={16} />}
            />
          </div>

          <Card className="p-4">
            <h2 className="text-[13px] font-semibold">
              What {ROLE_LABEL[user.role]} means
            </h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
              {ROLE_DESCRIPTION[user.role]}
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
