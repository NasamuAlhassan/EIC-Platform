import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/portal";
import { isBlobConfigured } from "@/lib/storage";
import { Alert, Card, PageHeader } from "@/components/ui";
import { PublicationForm } from "./publication-form";

export const metadata: Metadata = { title: "New publication" };

export default async function NewPublicationPage() {
  await requireRole("EDITOR");

  return (
    <div>
      <Link
        href="/admin/publications"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-2 hover:text-brand"
      >
        <ArrowLeft size={15} aria-hidden />
        Publications
      </Link>

      <div className="mt-5">
        <PageHeader
          title="Add a publication"
          description="Newsletters, magazines, and special editions for the public archive."
        />
      </div>

      {!isBlobConfigured() ? (
        <Alert tone="warn" title="Uploads are saved to local disk" className="mb-5">
          Set BLOB_READ_WRITE_TOKEN before deploying, or uploaded PDFs will be
          lost.
        </Alert>
      ) : null}

      <Card className="p-5">
        <PublicationForm />
      </Card>
    </div>
  );
}
