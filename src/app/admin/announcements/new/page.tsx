import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/portal";
import { isEmailConfigured } from "@/lib/email";
import { Card, PageHeader } from "@/components/ui";
import { AnnouncementForm } from "./announcement-form";

export const metadata: Metadata = { title: "New announcement" };

export default async function NewAnnouncementPage() {
  await requireRole("EXECUTIVE");

  return (
    <div>
      <Link
        href="/admin/announcements"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-2 hover:text-brand"
      >
        <ArrowLeft size={15} aria-hidden />
        Announcements
      </Link>

      <div className="mt-5">
        <PageHeader
          title="New announcement"
          description="Members see this the moment they open the portal."
        />
      </div>

      <Card className="p-5">
        <AnnouncementForm emailConfigured={isEmailConfigured()} />
      </Card>
    </div>
  );
}
