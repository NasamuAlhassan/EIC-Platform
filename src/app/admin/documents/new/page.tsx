import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { isBlobConfigured } from "@/lib/storage";
import { Card, PageHeader } from "@/components/ui";
import { DocumentForm } from "./document-form";

export const metadata: Metadata = { title: "Upload document" };

export default async function NewDocumentPage() {
  await requireRole("EDITOR");

  const folders = await db.folder.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <Link
        href="/admin/documents"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-2 hover:text-brand"
      >
        <ArrowLeft size={15} aria-hidden />
        Documents
      </Link>

      <div className="mt-5">
        <PageHeader
          title="Upload a document"
          description="Minutes, reports, templates, and records — the Board's permanent memory."
        />
      </div>

      <Card className="p-5">
        <DocumentForm folders={folders} storageIsLocal={!isBlobConfigured()} />
      </Card>
    </div>
  );
}
