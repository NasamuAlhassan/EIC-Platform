import type { Metadata } from "next";
import { FileText, Trash2, Download, Plus, Globe } from "lucide-react";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { can, ROLE_LABEL } from "@/lib/rbac";
import { formatDate, timeAgo } from "@/lib/utils";
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
import { DOC_TYPE_LABEL } from "@/lib/labels";
import { deleteDocument } from "./actions";

export const metadata: Metadata = { title: "Documents" };

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ uploaded?: string }>;
}) {
  const user = await requireRole("EDITOR");
  const { uploaded } = await searchParams;

  const [documents, totalSize] = await Promise.all([
    db.document.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        uploadedBy: { select: { name: true } },
        folder: { select: { name: true } },
        tags: { select: { id: true, name: true } },
      },
    }),
    db.document.aggregate({ _sum: { fileSize: true }, _count: true }),
  ]);

  return (
    <div>
      <PageHeader
        title="Documents"
        description={`${totalSize._count} files · ${formatBytes(totalSize._sum.fileSize ?? 0)} stored`}
        action={
          <ButtonLink href="/admin/documents/new" size="sm">
            <Plus size={15} aria-hidden />
            Upload
          </ButtonLink>
        }
      />

      {uploaded ? (
        <Alert tone="ok" className="mb-5">
          Document uploaded and added to the library.
        </Alert>
      ) : null}

      {documents.length > 0 ? (
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
                  <h2 className="text-[15px] font-medium">{d.title}</h2>
                  <Badge tone="neutral">{DOC_TYPE_LABEL[d.type]}</Badge>
                  {d.minRole !== "MEMBER" ? (
                    <Badge tone="warn">{ROLE_LABEL[d.minRole]}+</Badge>
                  ) : null}
                  {d.isPublic ? (
                    <Badge tone="ok">
                      <Globe size={10} aria-hidden />
                      Public
                    </Badge>
                  ) : null}
                </div>

                {d.description ? (
                  <p className="mt-1 text-[13.5px] text-ink-2">{d.description}</p>
                ) : null}

                <p className="mt-1.5 text-[12px] text-ink-3">
                  {d.fileName} · {formatBytes(d.fileSize)} ·{" "}
                  {formatDate(d.recordDate)}
                  {d.folder ? ` · ${d.folder.name}` : ""} · uploaded by{" "}
                  {d.uploadedBy?.name ?? "unknown"} {timeAgo(d.createdAt)}
                </p>

                {d.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {d.tags.map((t) => (
                      <span
                        key={t.id}
                        className="rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] text-ink-2"
                      >
                        #{t.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex shrink-0 gap-1.5">
                <a
                  href={d.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Download ${d.title}`}
                  className="grid h-9 w-9 place-items-center rounded-md border border-line text-ink-2 hover:border-brand hover:text-brand"
                >
                  <Download size={16} aria-hidden />
                </a>

                {can.manageDocuments(user.role) ? (
                  <form action={deleteDocument}>
                    <input type="hidden" name="id" value={d.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${d.title}`}
                      className="h-9 w-9 p-0 text-ink-3 hover:text-danger"
                    >
                      <Trash2 size={16} aria-hidden />
                    </Button>
                  </form>
                ) : null}
              </div>
            </div>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={<FileText size={20} />}
            title="Nothing uploaded yet"
            description="Meeting minutes, reports, and templates go here."
            action={
              <ButtonLink href="/admin/documents/new" size="sm">
                Upload the first document
              </ButtonLink>
            }
          />
        </Card>
      )}
    </div>
  );
}
