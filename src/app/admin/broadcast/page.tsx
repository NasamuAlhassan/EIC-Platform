import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareWarning, PhoneOff, ArrowRight } from "lucide-react";
import type { Role } from "@prisma/client";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { ALL_ROLES, ROLE_LABEL } from "@/lib/rbac";
import { sms as smsConfig } from "@/lib/config";
import {
  isSmsConfigured,
  normalisePhone,
  smsProvider,
  smsProviderLabel,
  statusCallbackUrl,
} from "@/lib/sms";
import { formatDate, timeAgo, truncate } from "@/lib/utils";
import {
  Badge,
  Card,
  CardHeader,
  PageHeader,
} from "@/components/ui";
import { BroadcastForm, type AudienceCounts } from "./broadcast-form";
import { SetupPanel } from "./setup-panel";

export const metadata: Metadata = { title: "Urgent SMS" };

export default async function BroadcastPage() {
  await requireRole("EXECUTIVE");

  const [members, recent] = await Promise.all([
    db.user.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: {
        id: true,
        name: true,
        role: true,
        phone: true,
        smsNotifications: true,
      },
      orderBy: { name: "asc" },
    }),
    db.broadcast.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Counted here, once, using the same rule the send action uses: a usable
  // number and SMS switched on.
  const counts = { ALL: 0 } as AudienceCounts;
  for (const r of ALL_ROLES) counts[r] = 0;

  const unreachable: { id: string; name: string; role: Role; reason: string }[] =
    [];

  for (const m of members) {
    const phone = normalisePhone(m.phone);
    if (m.smsNotifications && phone) {
      counts[m.role] += 1;
      counts.ALL += 1;
    } else {
      unreachable.push({
        id: m.id,
        name: m.name,
        role: m.role,
        reason: !m.smsNotifications
          ? "Has turned SMS off"
          : m.phone
            ? "Number isn't usable"
            : "No phone number",
      });
    }
  }

  return (
    <div>
      <PageHeader
        title="Urgent SMS"
        description="Text every member directly. For things that can't wait until they next open the portal."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader
            title="Compose"
            description={`Sent as "${smsConfig.prefix.trim()}" via ${smsProviderLabel()}`}
          />
          <div className="p-5">
            <BroadcastForm
              prefix={smsConfig.prefix}
              counts={counts}
              providerLabel={smsProviderLabel()}
              providerConfigured={isSmsConfigured()}
            />
          </div>
        </Card>

        <aside className="space-y-5">
          <SetupPanel isTwilio={smsProvider() === "twilio"} />

          {smsProvider() === "twilio" && !statusCallbackUrl() ? (
            <Card className="p-4">
              <h2 className="text-[13px] font-semibold text-warn">
                Delivery receipts are off
              </h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
                Twilio can only report delivery back to a public HTTPS address.
                Set <code className="font-mono">NEXT_PUBLIC_SITE_URL</code> to
                the deployed site and messages will be marked as confirmed on
                the handset rather than just accepted by Twilio.
              </p>
            </Card>
          ) : null}

          <Card className="p-4">
            <h2 className="text-[13px] font-semibold">
              When to use this instead of an announcement
            </h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
              An announcement waits for someone to log in. A text arrives on the
              phone in their pocket, and it costs money each time.
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
              Use it for a meeting moved to today, a deadline brought forward, or
              something cancelled at short notice. Use an announcement for
              everything else.
            </p>
          </Card>

          {unreachable.length > 0 ? (
            <Card>
              <CardHeader
                title="Can't be reached"
                description={`${unreachable.length} of ${members.length} members`}
              />
              <ul className="max-h-72 divide-y divide-line overflow-y-auto">
                {unreachable.map((u) => (
                  <li key={u.id} className="px-4 py-2.5">
                    <p className="flex items-center gap-1.5 text-[13.5px] font-medium">
                      <PhoneOff size={12} className="shrink-0 text-ink-3" aria-hidden />
                      {u.name}
                    </p>
                    <p className="mt-0.5 pl-[18px] text-[12px] text-ink-3">
                      {ROLE_LABEL[u.role]} · {u.reason}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line p-3">
                <Link
                  href="/admin/members"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline"
                >
                  Add their numbers
                  <ArrowRight size={13} aria-hidden />
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="p-4">
              <p className="text-[13px] font-medium text-ok">
                Every member is reachable
              </p>
              <p className="mt-1 text-[12.5px] text-ink-2">
                All {members.length} have a usable phone number and SMS switched
                on.
              </p>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Recent broadcasts"
              action={
                <Link
                  href="/admin/broadcast/history"
                  className="text-[13px] font-medium text-brand hover:underline"
                >
                  All
                </Link>
              }
            />
            {recent.length > 0 ? (
              <ul className="divide-y divide-line">
                {recent.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/admin/broadcast/${b.id}`}
                      className="block px-4 py-3 hover:bg-surface-2"
                    >
                      <div className="flex items-center gap-2">
                        {b.status === "SENT" ? (
                          <Badge tone="ok">Sent</Badge>
                        ) : b.status === "PARTIAL" ? (
                          <Badge tone="warn">Partial</Badge>
                        ) : b.status === "FAILED" ? (
                          <Badge tone="danger">Failed</Badge>
                        ) : (
                          <Badge tone="neutral">Sending</Badge>
                        )}
                        <span className="text-[12px] text-ink-3">
                          {b.sentCount}/{b.recipientCount}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] leading-snug text-ink-2">
                        {truncate(b.body, 70)}
                      </p>
                      <p className="mt-1 text-[11.5px] text-ink-3">
                        {b.senderName} · {timeAgo(b.createdAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-[13px] text-ink-3">
                Nothing sent yet.
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
