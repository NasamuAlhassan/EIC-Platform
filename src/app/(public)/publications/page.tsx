import type { Metadata } from "next";
import Link from "next/link";
import { Search, BookOpen } from "lucide-react";
import type { PublicationType, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { site } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Input, EmptyState } from "@/components/ui";
import { PublicationCard, PUBLICATION_LABEL } from "@/components/public-cards";

export const metadata: Metadata = {
  title: "Publications",
  description: `Newsletters, magazines, and features published by the ${site.boardName}. Free to read and download.`,
};

const TYPES: (PublicationType | "ALL")[] = [
  "ALL",
  "NEWSLETTER",
  "MAGAZINE",
  "ARTICLE",
  "SPECIAL_EDITION",
];

const PER_PAGE = 12;

export default async function PublicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const type = (params.type ?? "ALL").toUpperCase();
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.PublicationWhereInput = {
    isPublic: true,
    ...(TYPES.includes(type as PublicationType) && type !== "ALL"
      ? { type: type as PublicationType }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
            { issueLabel: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [publications, total] = await Promise.all([
    db.publication.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.publication.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  /** Preserve the current filters when switching one of them. */
  const linkTo = (next: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { q, type, page: String(page), ...next };
    if (merged.q) sp.set("q", merged.q);
    if (merged.type && merged.type !== "ALL") sp.set("type", merged.type);
    if (merged.page && merged.page !== "1") sp.set("page", merged.page);
    const s = sp.toString();
    return s ? `/publications?${s}` : "/publications";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <header className="mb-9">
        <p className="text-[12px] font-medium uppercase tracking-wider text-accent">
          The archive
        </p>
        <h1 className="mt-2.5 font-serif text-[36px] leading-tight tracking-tight sm:text-[42px]">
          Publications
        </h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-2">
          Everything the Board has published, newest first. All of it is free to
          read online or download.
        </p>
      </header>

      {/* Search + filters. A plain GET form, so it works without JavaScript. */}
      <form
        method="get"
        className="mb-8 flex flex-col gap-3 border-y border-line py-4 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search by title or issue…"
            aria-label="Search publications"
            className="pl-9"
          />
        </div>
        {type !== "ALL" ? (
          <input type="hidden" name="type" value={type} />
        ) : null}

        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter by type"
        >
          {TYPES.map((t) => (
            <Link
              key={t}
              href={linkTo({ type: t, page: "1" })}
              aria-current={type === t ? "true" : undefined}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                type === t
                  ? "border-brand bg-brand text-brand-ink"
                  : "border-line-2 text-ink-2 hover:border-brand hover:text-brand",
              )}
            >
              {t === "ALL" ? "All" : PUBLICATION_LABEL[t]}
            </Link>
          ))}
        </div>
      </form>

      {publications.length > 0 ? (
        <>
          <p className="mb-5 text-[13px] text-ink-3">
            {total} {total === 1 ? "publication" : "publications"}
            {q ? <> matching “{q}”</> : null}
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {publications.map((p) => (
              <PublicationCard key={p.id} publication={p} />
            ))}
          </div>

          {pages > 1 ? (
            <nav
              className="mt-10 flex items-center justify-center gap-1.5"
              aria-label="Pagination"
            >
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={linkTo({ page: String(n) })}
                  aria-current={n === page ? "page" : undefined}
                  className={cn(
                    "grid h-9 min-w-9 place-items-center rounded-md px-2.5 text-sm",
                    n === page
                      ? "bg-brand text-brand-ink font-medium"
                      : "border border-line text-ink-2 hover:border-brand hover:text-brand",
                  )}
                >
                  {n}
                </Link>
              ))}
            </nav>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={<BookOpen size={20} />}
          title={q ? "Nothing matched that search" : "No publications yet"}
          description={
            q
              ? "Try a different title, or clear the filters to see everything."
              : "Once the Board publishes an issue it will appear here."
          }
          action={
            q ? (
              <Link
                href="/publications"
                className="text-sm font-medium text-brand hover:underline"
              >
                Clear filters
              </Link>
            ) : null
          }
        />
      )}
    </div>
  );
}
