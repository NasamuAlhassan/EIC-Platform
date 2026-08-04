import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { site } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Input, EmptyState } from "@/components/ui";
import { PostCard } from "@/components/public-cards";

export const metadata: Metadata = {
  title: "News & announcements",
  description: `The latest from the ${site.boardName} — announcements, reports, and features.`,
};

const PER_PAGE = 10;

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.PostWhereInput = {
    status: "PUBLISHED",
    publishedAt: { lte: new Date() },
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { excerpt: { contains: q, mode: "insensitive" as const } },
            { body: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [posts, total] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { author: { select: { name: true } } },
    }),
    db.post.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const linkTo = (n: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (n !== 1) sp.set("page", String(n));
    const s = sp.toString();
    return s ? `/news?${s}` : "/news";
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <header className="mb-8">
        <p className="text-[12px] font-medium uppercase tracking-wider text-accent">
          From the Board
        </p>
        <h1 className="mt-2.5 font-serif text-[36px] leading-tight tracking-tight sm:text-[42px]">
          News &amp; announcements
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-2">
          Reports, notices, and features written by members of the Board.
        </p>
      </header>

      <form method="get" className="mb-6 border-y border-line py-4">
        <div className="relative">
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search the news…"
            aria-label="Search news"
            className="pl-9"
          />
        </div>
      </form>

      {posts.length > 0 ? (
        <>
          {q ? (
            <p className="mb-3 text-[13px] text-ink-3">
              {total} {total === 1 ? "result" : "results"} for “{q}”
            </p>
          ) : null}

          <div>
            {posts.map((p) => (
              <PostCard key={p.id} post={p} authorName={p.author?.name} />
            ))}
          </div>

          {pages > 1 ? (
            <nav
              className="mt-9 flex items-center justify-center gap-1.5"
              aria-label="Pagination"
            >
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={linkTo(n)}
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
          icon={<Newspaper size={20} />}
          title={q ? "Nothing matched that search" : "No news yet"}
          description={
            q
              ? "Try different words, or browse everything."
              : "Posts published by the Board will show up here."
          }
          action={
            q ? (
              <Link
                href="/news"
                className="text-sm font-medium text-brand hover:underline"
              >
                Show all news
              </Link>
            ) : null
          }
        />
      )}
    </div>
  );
}
