import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/db";
import { formatFullDate, truncate, toPlainText } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import { PostCard } from "@/components/public-cards";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.post.findUnique({ where: { slug } });
  if (!post || post.status !== "PUBLISHED") return { title: "Not found" };

  const description =
    post.excerpt ?? truncate(toPlainText(post.body), 155);

  return {
    title: post.title,
    description,
    openGraph: {
      type: "article",
      title: post.title,
      description,
      publishedTime: post.publishedAt?.toISOString(),
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;

  const post = await db.post.findUnique({
    where: { slug },
    include: {
      author: { select: { name: true, position: true, avatarUrl: true } },
    },
  });

  // Drafts and future-dated posts stay invisible to the public.
  if (
    !post ||
    post.status !== "PUBLISHED" ||
    (post.publishedAt && post.publishedAt > new Date())
  ) {
    notFound();
  }

  const more = await db.post.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      id: { not: post.id },
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
    include: { author: { select: { name: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/news"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-2 hover:text-brand"
      >
        <ArrowLeft size={15} aria-hidden />
        All news
      </Link>

      <article className="mt-6">
        <header>
          <h1 className="font-serif text-[34px] leading-[1.15] tracking-tight sm:text-[42px]">
            {post.title}
          </h1>

          <div className="mt-5 flex items-center gap-3 border-b border-line pb-5">
            {post.author ? (
              <Avatar
                name={post.author.name}
                src={post.author.avatarUrl}
                size={40}
              />
            ) : null}
            <div className="text-[13.5px]">
              {post.author ? (
                <p className="font-medium text-ink">{post.author.name}</p>
              ) : null}
              <p className="text-ink-3">
                {post.author?.position ? <>{post.author.position} · </> : null}
                {post.publishedAt ? (
                  <time dateTime={post.publishedAt.toISOString()}>
                    {formatFullDate(post.publishedAt)}
                  </time>
                ) : null}
              </p>
            </div>
          </div>
        </header>

        {post.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImageUrl}
            alt=""
            className="mt-7 aspect-[16/9] w-full rounded-[var(--radius)] border border-line object-cover"
          />
        ) : null}

        {post.excerpt ? (
          <p className="mt-7 font-serif text-[20px] leading-relaxed text-ink">
            {post.excerpt}
          </p>
        ) : null}

        {/* Body is stored as plain text with blank-line paragraphs. Rendering it
            as text rather than HTML means a compromised editor account can't
            inject scripts into a public page. */}
        <div className="prose-editorial mt-7">
          {post.body.split(/\n{2,}/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </article>

      {more.length > 0 ? (
        <section className="mt-16 border-t border-line pt-8">
          <h2 className="rule-accent font-serif text-[22px]">More from the Board</h2>
          <div className="mt-5">
            {more.map((p) => (
              <PostCard key={p.id} post={p} authorName={p.author?.name} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
