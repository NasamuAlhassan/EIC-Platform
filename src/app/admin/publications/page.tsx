import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Plus, Star, Trash2, ExternalLink } from "lucide-react";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { formatDate } from "@/lib/utils";
import { formatBytes } from "@/lib/storage";
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { PUBLICATION_LABEL } from "@/components/public-cards";
import { deletePublication, toggleFeatured } from "./actions";

export const metadata: Metadata = { title: "Publications" };

export default async function AdminPublicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  await requireRole("EDITOR");
  const { created } = await searchParams;

  const publications = await db.publication.findMany({
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Publications"
        description="The public archive of everything the Board has put out."
        action={
          <ButtonLink href="/admin/publications/new" size="sm">
            <Plus size={15} aria-hidden />
            Add
          </ButtonLink>
        }
      />

      {created ? (
        <Alert tone="ok" className="mb-5">
          Publication added to the archive.
        </Alert>
      ) : null}

      {publications.length > 0 ? (
        <Card className="divide-y divide-line">
          {publications.map((p) => (
            <div key={p.id} className="flex items-start gap-4 p-4">
              <div className="h-20 w-15 shrink-0 overflow-hidden rounded border border-line bg-surface-2">
                {p.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.coverImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-ink-3">
                    <BookOpen size={16} aria-hidden />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-medium">{p.title}</h2>
                  <Badge tone="neutral">{PUBLICATION_LABEL[p.type]}</Badge>
                  {p.featured ? <Badge tone="accent">Featured</Badge> : null}
                  {!p.isPublic ? <Badge tone="warn">Hidden</Badge> : null}
                </div>

                <p className="mt-1 text-[12.5px] text-ink-3">
                  {p.issueLabel ? `${p.issueLabel} · ` : ""}
                  {formatDate(p.publishedAt)}
                  {p.fileSize ? ` · ${formatBytes(p.fileSize)}` : " · no PDF"}
                  {p.pageCount ? ` · ${p.pageCount} pages` : ""}
                </p>

                {p.description ? (
                  <p className="mt-1.5 text-[13.5px] text-ink-2">
                    {p.description}
                  </p>
                ) : null}

                <Link
                  href={`/publications/${p.slug}`}
                  className="mt-2 inline-flex items-center gap-1 text-[12.5px] text-brand hover:underline"
                >
                  View on the site
                  <ExternalLink size={11} aria-hidden />
                </Link>
              </div>

              <div className="flex shrink-0 gap-1.5">
                <form action={toggleFeatured}>
                  <input type="hidden" name="id" value={p.id} />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    aria-label={p.featured ? "Unfeature" : "Feature on homepage"}
                  >
                    <Star
                      size={14}
                      aria-hidden
                      className={p.featured ? "fill-current" : ""}
                    />
                  </Button>
                </form>

                <form action={deletePublication}>
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
      ) : (
        <Card>
          <EmptyState
            icon={<BookOpen size={20} />}
            title="No publications yet"
            description="Add the Board's newsletters and magazines so people can read them."
            action={
              <ButtonLink href="/admin/publications/new" size="sm">
                Add the first one
              </ButtonLink>
            }
          />
        </Card>
      )}
    </div>
  );
}
