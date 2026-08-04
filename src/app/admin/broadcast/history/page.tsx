import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageSquareWarning, Plus } from "lucide-react";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { ROLE_LABEL } from "@/lib/rbac";
import { formatMoney } from "@/lib/sms";
import { sms as smsConfig } from "@/lib/config";
import { formatFullDate, formatTime, truncate } from "@/lib/utils";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  Stat,
} from "@/components/ui";

export const metadata: Metadata = { title: "Broadcast history" };

export default async function BroadcastHistoryPage() {
  await requireRole("EXECUTIVE");

  const [broadcasts, totals] = await Promise.all([
    db.broadcast.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.broadcast.aggregate({
      _sum: { estimatedCost: true, sentCount: true, failedCount: true },
      _count: true,
    }),
  ]);

  return (
    <div>
      <Link
        href="/admin/broadcast"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-2 hover:text-brand"
      >
        <ArrowLeft size={15} aria-hidden />
        Urgent SMS
      </Link>

      <div className="mt-5">
        <PageHeader
          title="Broadcast history"
          description="Every text the Board has sent, what it cost, and who received it."
          action={
            <ButtonLink href="/admin/broadcast" size="sm">
              <Plus size={15} aria-hidden />
              New broadcast
            </ButtonLink>
          }
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Broadcasts" value={totals._count} />
        <Stat label="Messages sent" value={totals._sum.sentCount ?? 0} />
        <Stat label="Failed" value={totals._sum.failedCount ?? 0} />
        <Stat
          label="Spent"
          value={formatMoney(totals._sum.estimatedCost ?? 0)}
          hint={`estimated, in ${smsConfig.currency}`}
        />
      </div>

      {broadcasts.length > 0 ? (
        <Card className="divide-y divide-line">
          {broadcasts.map((b) => (
            <Link
              key={b.id}
              href={`/admin/broadcast/${b.id}`}
              className="block p-4 hover:bg-surface-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                {b.status === "SENT" ? (
                  <Badge tone="ok">Sent</Badge>
                ) : b.status === "PARTIAL" ? (
                  <Badge tone="warn">Partial</Badge>
                ) : b.status === "FAILED" ? (
                  <Badge tone="danger">Failed</Badge>
                ) : (
                  <Badge tone="neutral">Sending</Badge>
                )}
                <span className="text-[12.5px] text-ink-3">
                  {b.sentCount} of {b.recipientCount} delivered
                  {b.skippedCount > 0 ? ` · ${b.skippedCount} skipped` : ""}
                </span>
                <span className="ml-auto text-[12.5px] text-ink-3 tabular-nums">
                  {formatMoney(b.estimatedCost)}
                </span>
              </div>

              <p className="mt-1.5 text-[14px] leading-snug text-ink">
                {truncate(b.body, 140)}
              </p>

              <p className="mt-1.5 text-[12px] text-ink-3">
                {b.senderName} · {formatFullDate(b.createdAt)} at{" "}
                {formatTime(b.createdAt)} ·{" "}
                {b.audienceRoles.length === 0
                  ? "everyone"
                  : b.audienceRoles.map((r) => ROLE_LABEL[r]).join(", ")}
              </p>
            </Link>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={<MessageSquareWarning size={20} />}
            title="No broadcasts yet"
            description="Texts you send to the whole Board will be recorded here, with their delivery status and cost."
            action={
              <ButtonLink href="/admin/broadcast" size="sm">
                Send one
              </ButtonLink>
            }
          />
        </Card>
      )}
    </div>
  );
}
