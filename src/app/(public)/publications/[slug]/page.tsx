import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText, ExternalLink } from "lucide-react";

import { db } from "@/lib/db";
import { formatFullDate } from "@/lib/utils";
import { site } from "@/lib/config";
import { formatBytes } from "@/lib/storage";
import { Badge, ButtonLink } from "@/components/ui";
import { PublicationCard, PUBLICATION_LABEL } from "@/components/public-cards";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const publication = await db.publication.findUnique({ where: { slug } });
  if (!publication || !publication.isPublic) return { title: "Not found" };

  return {
    title: publication.title,
    description:
      publication.description ??
      `${PUBLICATION_LABEL[publication.type]} published by ${site.boardName}, ${site.schoolName}.`,
    openGraph: {
      type: "article",
      title: publication.title,
      description: publication.description ?? undefined,
      publishedTime: publication.publishedAt.toISOString(),
      images: publication.coverImageUrl
        ? [{ url: publication.coverImageUrl }]
        : undefined,
    },
  };
}

export default async function PublicationPage({ params }: Props) {
  const { slug } = await params;

  const publication = await db.publication.findUnique({ where: { slug } });
  if (!publication || !publication.isPublic) notFound();

  const related = await db.publication.findMany({
    where: {
      isPublic: true,
      type: publication.type,
      id: { not: publication.id },
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/publications"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-2 hover:text-brand"
      >
        <ArrowLeft size={15} aria-hidden />
        All publications
      </Link>

      <article className="mt-6 grid gap-10 lg:grid-cols-[320px_1fr]">
        {/* Cover */}
        <div>
          <div className="overflow-hidden rounded-[var(--radius)] border border-line bg-surface-2 shadow-card">
            {publication.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={publication.coverImageUrl}
                alt={`Cover of ${publication.title}`}
                className="aspect-[3/4] w-full object-cover"
              />
            ) : (
              <div className="grid aspect-[3/4] w-full place-items-center bg-brand p-8 text-center text-brand-ink">
                <div>
                  <FileText size={30} className="mx-auto opacity-80" aria-hidden />
                  <p className="mt-4 font-serif text-2xl leading-tight">
                    {publication.title}
                  </p>
                </div>
              </div>
            )}
          </div>

          {publication.fileUrl ? (
            <div className="mt-4 space-y-2">
              <ButtonLink
                href={publication.fileUrl}
                target="_blank"
                rel="noreferrer"
                size="lg"
                className="w-full"
              >
                <Download size={16} aria-hidden />
                Download PDF
              </ButtonLink>
              <p className="text-center text-[12.5px] text-ink-3">
                {publication.fileSize
                  ? `${formatBytes(publication.fileSize)} · `
                  : ""}
                {publication.pageCount
                  ? `${publication.pageCount} pages`
                  : "PDF"}
              </p>
            </div>
          ) : null}
        </div>

        {/* Detail */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{PUBLICATION_LABEL[publication.type]}</Badge>
            {publication.featured ? <Badge tone="accent">Featured</Badge> : null}
            {publication.issueLabel ? (
              <span className="text-[13px] text-ink-3">
                {publication.issueLabel}
              </span>
            ) : null}
          </div>

          <h1 className="mt-3 font-serif text-[34px] leading-tight tracking-tight sm:text-[40px]">
            {publication.title}
          </h1>

          <p className="mt-3 text-[13.5px] text-ink-3">
            Published{" "}
            <time dateTime={publication.publishedAt.toISOString()}>
              {formatFullDate(publication.publishedAt)}
            </time>
          </p>

          {publication.description ? (
            <div className="prose-editorial mt-7">
              {publication.description.split(/\n{2,}/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : null}

          {/* Inline reader. Browsers that can't display a PDF fall back to the
              download link above, so nobody hits a dead end. */}
          {publication.fileUrl ? (
            <section className="mt-9">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <h2 className="font-sans text-[15px] font-semibold">
                  Read it here
                </h2>
                <a
                  href={publication.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] text-brand hover:underline"
                >
                  Open full screen
                  <ExternalLink size={13} aria-hidden />
                </a>
              </div>
              <object
                data={publication.fileUrl}
                type="application/pdf"
                className="h-[70vh] min-h-[420px] w-full rounded-[var(--radius)] border border-line bg-surface-2"
                aria-label={`${publication.title} (PDF)`}
              >
                <div className="grid h-full place-items-center p-8 text-center">
                  <p className="text-sm text-ink-2">
                    Your browser can&apos;t show PDFs inline.{" "}
                    <a
                      href={publication.fileUrl}
                      className="font-medium text-brand hover:underline"
                    >
                      Download it instead
                    </a>
                    .
                  </p>
                </div>
              </object>
            </section>
          ) : null}
        </div>
      </article>

      {related.length > 0 ? (
        <section className="mt-16 border-t border-line pt-10">
          <h2 className="section-marker font-serif text-[24px]">
            <span className="shrink-0">More {PUBLICATION_LABEL[publication.type].toLowerCase()}s</span>
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <PublicationCard key={p.id} publication={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
