import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Mail, Phone, Archive, CheckCheck } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { site } from "@/lib/config";
import { formatFullDate, timeAgo, cn } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { setSubmissionStatus } from "./actions";

export const metadata: Metadata = { title: "Inbox" };

const FILTERS = [
  { key: "new", label: "New", status: "NEW" },
  { key: "read", label: "Read", status: "READ" },
  { key: "archived", label: "Archived", status: "ARCHIVED" },
  { key: "all", label: "All", status: null },
] as const;

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireRole("EXECUTIVE");
  const { filter = "new" } = await searchParams;

  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];

  const where: Prisma.SubmissionWhereInput = active.status
    ? { status: active.status }
    : {};

  const [submissions, counts] = await Promise.all([
    db.submission.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
    db.submission.groupBy({ by: ["status"], _count: true }),
  ]);

  const countOf = (s: string) =>
    counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div>
      <PageHeader
        title="Inbox"
        description="Messages and applications sent through the website's contact form."
      />

      <nav className="mb-5 flex flex-wrap gap-1.5" aria-label="Filter">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/submissions?filter=${f.key}`}
            aria-current={active.key === f.key ? "true" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[13px]",
              active.key === f.key
                ? "border-brand bg-brand text-brand-ink"
                : "border-line-2 text-ink-2 hover:border-brand hover:text-brand",
            )}
          >
            {f.label}
            {f.status ? ` (${countOf(f.status)})` : ""}
          </Link>
        ))}
      </nav>

      {submissions.length > 0 ? (
        <div className="space-y-4">
          {submissions.map((s) => (
            <Card key={s.id} id={s.id} className="scroll-mt-24 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15.5px] font-medium">{s.name}</h2>
                    <Badge tone={s.type === "JOIN" ? "accent" : "neutral"}>
                      {s.type === "JOIN" ? "Application" : "Message"}
                    </Badge>
                    {s.status === "NEW" ? <Badge tone="warn">New</Badge> : null}
                    {s.status === "ARCHIVED" ? (
                      <Badge tone="neutral">Archived</Badge>
                    ) : null}
                  </div>

                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
                    <a
                      href={`mailto:${s.email}`}
                      className="inline-flex items-center gap-1 hover:text-brand"
                    >
                      <Mail size={12} aria-hidden />
                      {s.email}
                    </a>
                    {s.phone ? (
                      <a
                        href={`tel:${s.phone}`}
                        className="inline-flex items-center gap-1 hover:text-brand"
                      >
                        <Phone size={12} aria-hidden />
                        {s.phone}
                      </a>
                    ) : null}
                    <span title={formatFullDate(s.createdAt)}>
                      {timeAgo(s.createdAt)}
                    </span>
                  </p>

                  {s.type === "JOIN" ? (
                    <p className="mt-2 text-[13px] text-ink-2">
                      {s.classYear ? <>Class: {s.classYear}. </> : null}
                      {s.interestArea ? (
                        <>Interested in: {s.interestArea}.</>
                      ) : null}
                    </p>
                  ) : s.subject ? (
                    <p className="mt-2 text-[13.5px] font-medium">{s.subject}</p>
                  ) : null}

                  <div className="prose-editorial mt-2.5 text-[14px]">
                    {s.message.split(/\n{2,}/).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-1.5">
                  {s.status !== "READ" ? (
                    <form action={setSubmissionStatus}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="status" value="READ" />
                      <Button
                        type="submit"
                        variant="secondary"
                        size="sm"
                        className="w-full"
                      >
                        <CheckCheck size={14} aria-hidden />
                        Mark read
                      </Button>
                    </form>
                  ) : null}

                  {s.status !== "ARCHIVED" ? (
                    <form action={setSubmissionStatus}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="status" value="ARCHIVED" />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                      >
                        <Archive size={14} aria-hidden />
                        Archive
                      </Button>
                    </form>
                  ) : (
                    <form action={setSubmissionStatus}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="status" value="READ" />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                      >
                        Restore
                      </Button>
                    </form>
                  )}

                  <a
                    href={`mailto:${s.email}?subject=${encodeURIComponent(
                      s.type === "JOIN"
                        ? `Your application to ${site.boardName}`
                        : `Re: ${s.subject ?? "your message"}`,
                    )}`}
                    className="rounded-[var(--radius)] bg-brand px-3 py-1.5 text-center text-[13px] font-medium text-brand-ink hover:bg-brand-hover"
                  >
                    Reply
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Inbox size={20} />}
            title={
              active.key === "new" ? "Nothing new" : "Nothing in this folder"
            }
            description="Messages sent through the website's contact and join forms land here."
          />
        </Card>
      )}
    </div>
  );
}
