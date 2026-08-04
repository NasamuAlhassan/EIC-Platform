import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Coins,
  Users,
  MessageSquare,
  Clock,
} from "lucide-react";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { ROLE_LABEL } from "@/lib/rbac";
import { formatMoney, maskPhone } from "@/lib/sms";
import { formatFullDate, formatTime } from "@/lib/utils";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  PageHeader,
  Stat,
} from "@/components/ui";

export const metadata: Metadata = { title: "Broadcast" };

export default async function BroadcastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("EXECUTIVE");
  const { id } = await params;

  const broadcast = await db.broadcast.findUnique({
    where: { id },
    include: {
      recipients: { orderBy: [{ status: "asc" }, { name: "asc" }] },
    },
  });

  if (!broadcast) notFound();

  const delivered = broadcast.recipients.filter((r) => r.status === "DELIVERED");
  const inFlight = broadcast.recipients.filter(
    (r) => r.status === "SENT" || r.status === "QUEUED",
  );
  const failed = broadcast.recipients.filter(
    (r) => r.status === "FAILED" || r.status === "UNDELIVERED",
  );
  const skipped = broadcast.recipients.filter((r) => r.status === "SKIPPED");

  // With receipts on, "sent" is only a waypoint — the number that matters is
  // how many handsets confirmed.
  const receiptsExpected = delivered.length > 0 || broadcast.deliveredCount > 0;

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
          title="Broadcast"
          description={`Sent by ${broadcast.senderName} on ${formatFullDate(
            broadcast.createdAt,
          )} at ${formatTime(broadcast.createdAt)}`}
        />
      </div>

      {broadcast.status === "FAILED" ? (
        <Alert tone="danger" title="Nothing was delivered" className="mb-5">
          Every message failed. Check the errors below — usually a provider
          credential or an account balance. Nobody has been told.
        </Alert>
      ) : broadcast.status === "PARTIAL" ? (
        <Alert
          tone="warn"
          title={`${failed.length} ${failed.length === 1 ? "message" : "messages"} didn't get through`}
          className="mb-5"
        >
          The rest were delivered. The people listed under &ldquo;Failed&rdquo;
          below have not been told — reach them another way.
        </Alert>
      ) : receiptsExpected ? (
        <Alert tone="ok" title="Delivered" className="mb-5">
          {delivered.length} of {broadcast.recipientCount} confirmed as received
          on the handset.
          {inFlight.length > 0
            ? ` ${inFlight.length} still in flight — this page updates as carriers report back.`
            : ""}
        </Alert>
      ) : (
        <Alert tone="ok" title="Accepted by the provider" className="mb-5">
          {inFlight.length} {inFlight.length === 1 ? "message" : "messages"}{" "}
          handed over successfully. Confirmation that they reached the handsets
          needs delivery receipts switched on.
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader title="What was sent" />
        <div className="p-5">
          <p className="whitespace-pre-wrap break-words rounded-[var(--radius)] border border-line bg-surface-2 p-4 font-mono text-[13.5px] leading-relaxed">
            {broadcast.body}
          </p>
          <p className="mt-3 text-[12.5px] text-ink-3">
            Audience:{" "}
            {broadcast.audienceRoles.length === 0
              ? "everyone"
              : broadcast.audienceRoles.map((r) => ROLE_LABEL[r]).join(", ")}
          </p>
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={receiptsExpected ? "Delivered" : "Accepted"}
          value={receiptsExpected ? delivered.length : inFlight.length}
          hint={
            receiptsExpected && inFlight.length > 0
              ? `${inFlight.length} in flight`
              : undefined
          }
          icon={<CheckCircle2 size={17} />}
        />
        <Stat label="Failed" value={failed.length} icon={<XCircle size={17} />} />
        <Stat
          label="Skipped"
          value={skipped.length}
          hint="No number, or opted out"
          icon={<MinusCircle size={17} />}
        />
        <Stat
          label="Cost"
          value={formatMoney(broadcast.estimatedCost)}
          hint={`${broadcast.segments} segment${broadcast.segments === 1 ? "" : "s"} each`}
          icon={<Coins size={17} />}
        />
      </div>

      <Card>
        <CardHeader
          title="Delivery log"
          description="Who it reached, and what happened to the ones it didn't."
        />

        {broadcast.recipients.length > 0 ? (
          <ul className="divide-y divide-line">
            {broadcast.recipients.map((r) => (
              <li key={r.id} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-0.5 shrink-0" aria-hidden>
                  {r.status === "DELIVERED" ? (
                    <CheckCircle2 size={16} className="text-ok" />
                  ) : r.status === "SENT" || r.status === "QUEUED" ? (
                    <Clock size={16} className="text-ink-3" />
                  ) : r.status === "FAILED" || r.status === "UNDELIVERED" ? (
                    <XCircle size={16} className="text-danger" />
                  ) : (
                    <MinusCircle size={16} className="text-ink-3" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">{r.name}</p>
                  <p className="mt-0.5 text-[12px] text-ink-3">
                    {r.phone === "—" ? "no number" : maskPhone(r.phone)}
                    {r.deliveredAt
                      ? ` · delivered ${formatTime(r.deliveredAt)}`
                      : r.sentAt
                        ? ` · sent ${formatTime(r.sentAt)}`
                        : ""}
                    {r.providerMessageId && r.providerMessageId !== "simulated"
                      ? ` · ref ${r.providerMessageId.slice(0, 12)}`
                      : ""}
                  </p>
                  {r.error ? (
                    <p className="mt-1 text-[12.5px] text-danger">{r.error}</p>
                  ) : null}
                </div>

                {r.status === "DELIVERED" ? (
                  <Badge tone="ok">Delivered</Badge>
                ) : r.status === "SENT" ? (
                  <Badge tone="brand">Sent</Badge>
                ) : r.status === "QUEUED" ? (
                  <Badge tone="neutral">Queued</Badge>
                ) : r.status === "UNDELIVERED" ? (
                  <Badge tone="danger">Undelivered</Badge>
                ) : r.status === "FAILED" ? (
                  <Badge tone="danger">Failed</Badge>
                ) : (
                  <Badge tone="neutral">Skipped</Badge>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-[13px] text-ink-3">
            No recipients recorded.
          </p>
        )}
      </Card>

      {skipped.length > 0 ? (
        <Card className="mt-6 p-4">
          <p className="flex items-start gap-2 text-[13px] text-ink-2">
            <Users size={15} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
            <span>
              <strong className="font-medium text-ink">
                {skipped.length} {skipped.length === 1 ? "member was" : "members were"}{" "}
                skipped
              </strong>{" "}
              and did not receive this. If it was genuinely urgent, reach them
              another way — then add their numbers so it doesn&apos;t happen
              again.
            </span>
          </p>
        </Card>
      ) : null}

      <p className="mt-6 flex items-start gap-1.5 text-[12.5px] text-ink-3">
        <MessageSquare size={13} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          A text message cannot be recalled or edited once sent. This record is
          permanent.
          {receiptsExpected
            ? " Delivery states update as carriers report back — reload to see the latest."
            : ""}
        </span>
      </p>
    </div>
  );
}
