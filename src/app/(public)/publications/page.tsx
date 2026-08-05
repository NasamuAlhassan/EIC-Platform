import type { Metadata } from "next";
import Link from "next/link";
import { Search, BookOpen, ArrowRight } from "lucide-react";
import type { PublicationType, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { site } from "@/lib/config";
import { cn, formatDate } from "@/lib/utils";
import { Input, EmptyState } from "@/components/ui";
import { PUBLICATION_LABEL } from "@/components/public-cards";

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

  // Lead on the newest issue, but only when looking at the whole archive.
  const showLead = page === 1 && !q && type === "ALL";
  const leadIssue = showLead ? publications[0] : null;
  const rest = leadIssue ? publications.slice(1) : publications;

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
        <p className="label label-accent">The archive</p>
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
                "label border px-3 py-1.5 transition-colors",
                type === t
                  ? "border-ink bg-ink text-paper"
                  : "border-line-2 hover:border-ink hover:text-ink",
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

          {/*
            A four-column grid of covers is a shop. An archive is a record: the
            current issue shown properly, and everything before it as a list you
            can run your eye down. It stays readable at fifty issues, where a
            grid becomes wallpaper.

            The lead only appears unfiltered on the first page — inside a search
            result "the current issue" would be a lie.
           */}
          {showLead && leadIssue ? (
            <article className="mb-10 grid gap-8 border-b border-ink pb-10 sm:grid-cols-[minmax(0,240px)_1fr] sm:gap-10">
              <Link href={`/publications/${leadIssue.slug}`} className="group block">
                <div className="arch overflow-hidden border border-ink bg-surface-2">
                  {leadIssue.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={leadIssue.coverImageUrl}
                      alt={`Cover of ${leadIssue.title}`}
                      className="aspect-[3/4] w-full object-cover"
                    />
                  ) : (
                    <div className="grid aspect-[3/4] w-full place-items-center bg-brand px-5 pb-5 pt-14 text-center text-brand-ink">
                      <p className="font-serif text-[24px] leading-tight">
                        {leadIssue.title}
                      </p>
                    </div>
                  )}
                </div>
              </Link>

              <div className="min-w-0">
                <p className="label label-accent">The current issue</p>
                <h2 className="mt-2.5 font-serif text-[30px] leading-tight sm:text-[36px]">
                  <Link
                    href={`/publications/${leadIssue.slug}`}
                    className="hover:text-brand"
                  >
                    {leadIssue.title}
                  </Link>
                </h2>
                <p className="label mt-2">
                  {leadIssue.issueLabel ? `${leadIssue.issueLabel} · ` : ""}
                  {formatDate(leadIssue.publishedAt)}
                  {leadIssue.pageCount ? ` · ${leadIssue.pageCount} pages` : ""}
                </p>
                {leadIssue.description ? (
                  <p className="standfirst mt-4">{leadIssue.description}</p>
                ) : null}
                <Link
                  href={`/publications/${leadIssue.slug}`}
                  className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-brand hover:underline"
                >
                  Read this issue
                  <ArrowRight size={15} aria-hidden />
                </Link>
              </div>
            </article>
          ) : null}

          {rest.length > 0 ? (
            <ul>
              {rest.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/publications/${p.slug}`}
                    className="group flex flex-wrap items-baseline gap-x-5 gap-y-1 border-b border-line py-4"
                  >
                    <span className="label w-36 shrink-0">
                      {p.issueLabel ?? PUBLICATION_LABEL[p.type]}
                    </span>
                    <span className="min-w-0 flex-1 font-serif text-[19px] group-hover:text-brand">
                      {p.title}
                    </span>
                    <span className="label shrink-0">
                      {formatDate(p.publishedAt)}
                    </span>
                    <ArrowRight
                      size={14}
                      aria-hidden
                      className="shrink-0 text-ink-3 group-hover:text-brand"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

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
                    "grid h-9 min-w-9 place-items-center px-2.5 text-sm",
                    n === page
                      ? "bg-ink font-medium text-paper"
                      : "border border-line text-ink-2 hover:border-ink hover:text-ink",
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
