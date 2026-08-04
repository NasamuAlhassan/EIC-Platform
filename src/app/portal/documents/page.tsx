import type { Metadata } from "next";
import Link from "next/link";
import { Search, FileText, Download, Upload, Filter } from "lucide-react";
import type { DocumentType, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { getPortalUser } from "@/lib/portal";
import { can, visibleMinRoles, ROLE_LABEL } from "@/lib/rbac";
import { formatDate, timeAgo, cn } from "@/lib/utils";
import { formatBytes } from "@/lib/storage";
import { DOC_TYPE_LABEL, DOC_TYPES } from "@/lib/labels";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";

export const metadata: Metadata = { title: "Documents" };

const PER_PAGE = 25;

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    folder?: string;
    tag?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await getPortalUser();

  const q = params.q?.trim() ?? "";
  const type = params.type ?? "";
  const folder = params.folder ?? "";
  const tag = params.tag ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  // Members only ever see documents at or below their own rank.
  const visibleRoles = visibleMinRoles(user.role);

  const where: Prisma.DocumentWhereInput = {
    minRole: { in: visibleRoles },
    ...(DOC_TYPES.includes(type as DocumentType)
      ? { type: type as DocumentType }
      : {}),
    ...(folder ? { folderId: folder } : {}),
    ...(tag ? { tags: { some: { slug: tag } } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
            { fileName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [documents, total, folders, tags] = await Promise.all([
    db.document.findMany({
      where,
      orderBy: { recordDate: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        uploadedBy: { select: { name: true } },
        folder: { select: { id: true, name: true } },
        tags: { select: { id: true, name: true, slug: true } },
      },
    }),
    db.document.count({ where }),
    db.folder.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { documents: { where: { minRole: { in: visibleRoles } } } } },
      },
    }),
    db.tag.findMany({ orderBy: { name: "asc" }, take: 30 }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const linkTo = (next: Record<string, string | undefined>) => {
    const merged = { q, type, folder, tag, page: String(page), ...next };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v && !(k === "page" && v === "1")) sp.set(k, v);
    }
    const s = sp.toString();
    return s ? `/portal/documents?${s}` : "/portal/documents";
  };

  const activeFilters = [q, type, folder, tag].filter(Boolean).length;

  return (
    <div>
      <PageHeader
        title="Document library"
        description="Minutes, reports, templates, and records — searchable and permanent."
        action={
          can.uploadDocuments(user.role) ? (
            <ButtonLink href="/admin/documents/new" size="sm">
              <Upload size={15} aria-hidden />
              Upload
            </ButtonLink>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
        {/* ------------------------------------------------------- Filters */}
        <aside className="space-y-5">
          <div>
            <h2 className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
              Folders
            </h2>
            <ul className="space-y-0.5">
              <li>
                <Link
                  href={linkTo({ folder: "", page: "1" })}
                  className={cn(
                    "block rounded-md px-2.5 py-1.5 text-[13.5px]",
                    !folder
                      ? "bg-brand-soft font-medium text-brand"
                      : "text-ink-2 hover:bg-surface-2",
                  )}
                >
                  All documents
                </Link>
              </li>
              {folders.map((f) => (
                <li key={f.id}>
                  <Link
                    href={linkTo({ folder: f.id, page: "1" })}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[13.5px]",
                      folder === f.id
                        ? "bg-brand-soft font-medium text-brand"
                        : "text-ink-2 hover:bg-surface-2",
                    )}
                  >
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0 text-[11.5px] text-ink-3 tabular-nums">
                      {f._count.documents}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {tags.length > 0 ? (
            <div>
              <h2 className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
                Tags
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Link
                    key={t.id}
                    href={linkTo({ tag: tag === t.slug ? "" : t.slug, page: "1" })}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[12px]",
                      tag === t.slug
                        ? "border-brand bg-brand text-brand-ink"
                        : "border-line-2 text-ink-2 hover:border-brand hover:text-brand",
                    )}
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        {/* --------------------------------------------------------- Results */}
        <div className="min-w-0">
          <form method="get" className="mb-4 flex flex-col gap-2.5 sm:flex-row">
            {folder ? <input type="hidden" name="folder" value={folder} /> : null}
            {tag ? <input type="hidden" name="tag" value={tag} /> : null}

            <div className="relative flex-1">
              <Search
                size={16}
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
              />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search by title, description, or filename…"
                aria-label="Search documents"
                className="pl-9"
              />
            </div>

            <Select
              name="type"
              defaultValue={type}
              aria-label="Filter by type"
              className="sm:w-52"
            >
              <option value="">All types</option>
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOC_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>

            <button
              type="submit"
              className="h-10 rounded-[var(--radius)] border border-line-2 bg-surface px-4 text-sm font-medium hover:bg-surface-2"
            >
              Search
            </button>
          </form>

          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[13px] text-ink-3">
              {total} {total === 1 ? "document" : "documents"}
              {activeFilters > 0 ? " matching your filters" : ""}
            </p>
            {activeFilters > 0 ? (
              <Link
                href="/portal/documents"
                className="inline-flex items-center gap-1 text-[13px] text-brand hover:underline"
              >
                <Filter size={13} aria-hidden />
                Clear
              </Link>
            ) : null}
          </div>

          {documents.length > 0 ? (
            <>
              <Card className="divide-y divide-line">
                {documents.map((d) => (
                  <div key={d.id} className="flex items-start gap-3.5 p-4">
                    <span
                      aria-hidden
                      className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-soft text-brand"
                    >
                      <FileText size={17} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-medium">{d.title}</h3>
                        <Badge tone="neutral">{DOC_TYPE_LABEL[d.type]}</Badge>
                        {d.minRole !== "MEMBER" ? (
                          <Badge tone="warn">
                            {ROLE_LABEL[d.minRole]}+ only
                          </Badge>
                        ) : null}
                        {d.isPublic ? <Badge tone="ok">Public</Badge> : null}
                      </div>

                      {d.description ? (
                        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
                          {d.description}
                        </p>
                      ) : null}

                      <p className="mt-1.5 text-[12px] text-ink-3">
                        {formatDate(d.recordDate)}
                        {d.folder ? ` · ${d.folder.name}` : ""} ·{" "}
                        {formatBytes(d.fileSize)} · uploaded by{" "}
                        {d.uploadedBy?.name ?? "unknown"} {timeAgo(d.createdAt)}
                      </p>

                      {d.tags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {d.tags.map((t) => (
                            <Link
                              key={t.id}
                              href={linkTo({ tag: t.slug, page: "1" })}
                              className="rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] text-ink-2 hover:text-brand"
                            >
                              #{t.name}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download
                      aria-label={`Download ${d.title}`}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line text-ink-2 hover:border-brand hover:text-brand"
                    >
                      <Download size={16} aria-hidden />
                    </a>
                  </div>
                ))}
              </Card>

              {pages > 1 ? (
                <nav
                  className="mt-6 flex items-center justify-center gap-1.5"
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
            <Card>
              <EmptyState
                icon={<FileText size={20} />}
                title={
                  activeFilters > 0
                    ? "Nothing matched those filters"
                    : "No documents yet"
                }
                description={
                  activeFilters > 0
                    ? "Try a broader search, or clear the filters."
                    : "Minutes, reports, and templates uploaded by the Board will live here."
                }
                action={
                  activeFilters > 0 ? (
                    <ButtonLink
                      href="/portal/documents"
                      size="sm"
                      variant="secondary"
                    >
                      Clear filters
                    </ButtonLink>
                  ) : can.uploadDocuments(user.role) ? (
                    <ButtonLink href="/admin/documents/new" size="sm">
                      Upload the first document
                    </ButtonLink>
                  ) : null
                }
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
