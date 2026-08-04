import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Plus, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { formatDate, timeAgo } from "@/lib/utils";
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { deletePost, togglePostStatus } from "./actions";

export const metadata: Metadata = { title: "News posts" };

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  await requireRole("EDITOR");
  const { created } = await searchParams;

  const posts = await db.post.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { author: { select: { name: true } } },
  });

  const drafts = posts.filter((p) => p.status === "DRAFT");
  const published = posts.filter((p) => p.status === "PUBLISHED");

  const list = (items: typeof posts) => (
    <Card className="divide-y divide-line">
      {items.map((p) => (
        <div key={p.id} className="flex items-start gap-3.5 p-4">
          {p.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.coverImageUrl}
              alt=""
              className="h-14 w-20 shrink-0 rounded border border-line object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="grid h-14 w-20 shrink-0 place-items-center rounded border border-line bg-surface-2 text-ink-3"
            >
              <Newspaper size={16} />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-medium">{p.title}</h3>
              {p.status === "DRAFT" ? (
                <Badge tone="warn">Draft</Badge>
              ) : (
                <Badge tone="ok">Live</Badge>
              )}
            </div>

            {p.excerpt ? (
              <p className="mt-1 text-[13.5px] text-ink-2">{p.excerpt}</p>
            ) : null}

            <p className="mt-1.5 text-[12px] text-ink-3">
              {p.author?.name ?? "Unknown"} ·{" "}
              {p.publishedAt
                ? `published ${formatDate(p.publishedAt)}`
                : `created ${timeAgo(p.createdAt)}`}
            </p>

            {p.status === "PUBLISHED" ? (
              <Link
                href={`/news/${p.slug}`}
                className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] text-brand hover:underline"
              >
                View on the site
                <ExternalLink size={11} aria-hidden />
              </Link>
            ) : null}
          </div>

          <div className="flex shrink-0 gap-1.5">
            <form action={togglePostStatus}>
              <input type="hidden" name="id" value={p.id} />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                aria-label={
                  p.status === "PUBLISHED" ? "Move to draft" : "Publish"
                }
              >
                {p.status === "PUBLISHED" ? (
                  <>
                    <EyeOff size={14} aria-hidden />
                    Unpublish
                  </>
                ) : (
                  <>
                    <Eye size={14} aria-hidden />
                    Publish
                  </>
                )}
              </Button>
            </form>

            <form action={deletePost}>
              <input type="hidden" name="id" value={p.id} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                aria-label={`Delete ${p.title}`}
                className="text-ink-3 hover:text-danger"
              >
                <Trash2 size={14} aria-hidden />
              </Button>
            </form>
          </div>
        </div>
      ))}
    </Card>
  );

  return (
    <div>
      <PageHeader
        title="News posts"
        description="The public news feed. Drafts stay hidden until you publish them."
        action={
          <ButtonLink href="/admin/posts/new" size="sm">
            <Plus size={15} aria-hidden />
            Write
          </ButtonLink>
        }
      />

      {created ? (
        <Alert tone="ok" className="mb-5">
          Post saved.
        </Alert>
      ) : null}

      {posts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Newspaper size={20} />}
            title="Nothing written yet"
            description="News posts appear on the public site and on the homepage."
            action={
              <ButtonLink href="/admin/posts/new" size="sm">
                Write the first post
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {drafts.length > 0 ? (
            <section>
              <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
                Drafts ({drafts.length})
              </h2>
              {list(drafts)}
            </section>
          ) : null}

          {published.length > 0 ? (
            <section>
              <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
                Published ({published.length})
              </h2>
              {list(published)}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
