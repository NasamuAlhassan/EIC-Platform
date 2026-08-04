import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/portal";
import { Card, PageHeader } from "@/components/ui";
import { EventForm } from "../event-form";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage() {
  await requireRole("EXECUTIVE");

  return (
    <div>
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-2 hover:text-brand"
      >
        <ArrowLeft size={15} aria-hidden />
        Events
      </Link>

      <div className="mt-5">
        <PageHeader
          title="Schedule an event"
          description="Meetings, deadlines, training, and publication dates."
        />
      </div>

      <Card className="p-5">
        <EventForm />
      </Card>
    </div>
  );
}
