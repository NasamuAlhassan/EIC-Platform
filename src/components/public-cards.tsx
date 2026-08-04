import Link from "next/link";
import { CalendarDays, FileText, MapPin, Download } from "lucide-react";

import { Badge } from "@/components/ui";
import { formatDate, formatTime, relativeDay, truncate } from "@/lib/utils";
import { formatBytes } from "@/lib/storage";
import type {
  Publication,
  Post,
  Event as BoardEvent,
  Achievement,
} from "@prisma/client";

export const PUBLICATION_LABEL: Record<Publication["type"], string> = {
  NEWSLETTER: "Newsletter",
  MAGAZINE: "Magazine",
  ARTICLE: "Article",
  SPECIAL_EDITION: "Special edition",
};

export const EVENT_LABEL: Record<BoardEvent["type"], string> = {
  MEETING: "Meeting",
  DEADLINE: "Deadline",
  TRAINING: "Training",
  PUBLICATION: "Publication",
  SOCIAL: "Social",
  OTHER: "Event",
};

/* -------------------------------------------------------------------------- */

export function PublicationCard({
  publication,
}: {
  publication: Pick<
    Publication,
    | "slug"
    | "title"
    | "description"
    | "type"
    | "issueLabel"
    | "coverImageUrl"
    | "publishedAt"
    | "fileUrl"
    | "fileSize"
  >;
}) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-[var(--radius)] border border-line bg-surface shadow-card transition-shadow hover:shadow-pop">
      <Link
        href={`/publications/${publication.slug}`}
        className="relative block aspect-[3/4] overflow-hidden bg-surface-2"
      >
        {publication.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publication.coverImageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="grid h-full w-full place-items-center bg-brand-soft text-brand">
            <FileText size={30} aria-hidden />
          </span>
        )}
        <span className="absolute left-2.5 top-2.5">
          <Badge tone="brand">{PUBLICATION_LABEL[publication.type]}</Badge>
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {publication.issueLabel ? (
          <p className="text-[11.5px] font-medium uppercase tracking-wider text-ink-3">
            {publication.issueLabel}
          </p>
        ) : null}
        <h3 className="mt-1 font-serif text-[17px] leading-snug">
          <Link
            href={`/publications/${publication.slug}`}
            className="hover:text-brand"
          >
            {publication.title}
          </Link>
        </h3>
        {publication.description ? (
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-3">
            {truncate(publication.description, 100)}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[12.5px] text-ink-3">
          <time dateTime={new Date(publication.publishedAt).toISOString()}>
            {formatDate(publication.publishedAt)}
          </time>
          {publication.fileUrl ? (
            <span className="inline-flex items-center gap-1">
              <Download size={13} aria-hidden />
              {publication.fileSize ? formatBytes(publication.fileSize) : "PDF"}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */

export function PostCard({
  post,
  authorName,
}: {
  post: Pick<
    Post,
    "slug" | "title" | "excerpt" | "coverImageUrl" | "publishedAt"
  >;
  authorName?: string | null;
}) {
  return (
    <article className="group flex gap-4 border-b border-line py-5 last:border-0">
      {post.coverImageUrl ? (
        <Link
          href={`/news/${post.slug}`}
          className="hidden h-24 w-32 shrink-0 overflow-hidden rounded-[var(--radius)] bg-surface-2 sm:block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        </Link>
      ) : null}

      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-[19px] leading-snug">
          <Link href={`/news/${post.slug}`} className="hover:text-brand">
            {post.title}
          </Link>
        </h3>
        {post.excerpt ? (
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
            {truncate(post.excerpt, 180)}
          </p>
        ) : null}
        <p className="mt-2 text-[12.5px] text-ink-3">
          {post.publishedAt ? (
            <time dateTime={new Date(post.publishedAt).toISOString()}>
              {formatDate(post.publishedAt)}
            </time>
          ) : null}
          {authorName ? <> · {authorName}</> : null}
        </p>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */

export function EventCard({
  event,
  href,
}: {
  event: Pick<
    BoardEvent,
    "id" | "title" | "description" | "location" | "startsAt" | "allDay" | "type"
  >;
  href?: string;
}) {
  const start = new Date(event.startsAt);
  const link = href ?? `/events/${event.id}`;

  return (
    <article className="flex gap-4 rounded-[var(--radius)] border border-line bg-surface p-4 shadow-card">
      {/* Tear-off calendar chip — scannable at a glance in a long list. */}
      <div
        aria-hidden
        className="grid h-14 w-14 shrink-0 place-items-center rounded-[var(--radius)] border border-line bg-surface-2 leading-none"
      >
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-accent">
          {start.toLocaleString("en", { month: "short" })}
        </span>
        <span className="font-serif text-[21px] font-semibold tabular-nums">
          {start.getDate()}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{EVENT_LABEL[event.type]}</Badge>
          <span className="text-[12.5px] text-ink-3">
            {relativeDay(start)}
            {!event.allDay ? ` · ${formatTime(start)}` : ""}
          </span>
        </div>

        <h3 className="mt-1.5 font-serif text-[17px] leading-snug">
          <Link href={link} className="hover:text-brand">
            {event.title}
          </Link>
        </h3>

        {event.description ? (
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">
            {truncate(event.description, 110)}
          </p>
        ) : null}

        {event.location ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-ink-3">
            <MapPin size={13} aria-hidden />
            {event.location}
          </p>
        ) : null}
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */

export function AchievementCard({
  achievement,
}: {
  achievement: Pick<
    Achievement,
    "title" | "description" | "achievedAt" | "imageUrl"
  >;
}) {
  return (
    <article className="overflow-hidden rounded-[var(--radius)] border border-line bg-surface shadow-card">
      {achievement.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={achievement.imageUrl}
          alt=""
          loading="lazy"
          className="aspect-[16/9] w-full object-cover"
        />
      ) : null}
      <div className="p-5">
        <p className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wider text-accent">
          <CalendarDays size={13} aria-hidden />
          {formatDate(achievement.achievedAt)}
        </p>
        <h3 className="mt-2 font-serif text-[18px] leading-snug">
          {achievement.title}
        </h3>
        {achievement.description ? (
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
            {achievement.description}
          </p>
        ) : null}
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="rule-accent font-serif text-[26px] tracking-tight sm:text-[30px]">
          {title}
        </h2>
        {description ? (
          <p className="mt-3.5 max-w-xl text-[14.5px] leading-relaxed text-ink-2">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 sm:pb-1">{action}</div> : null}
    </div>
  );
}
