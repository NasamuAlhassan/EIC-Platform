import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/portal";
import { Card, PageHeader } from "@/components/ui";
import { PostForm } from "./post-form";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  await requireRole("EDITOR");

  return (
    <div>
      <Link
        href="/admin/posts"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-2 hover:text-brand"
      >
        <ArrowLeft size={15} aria-hidden />
        News posts
      </Link>

      <div className="mt-5">
        <PageHeader
          title="Write a news post"
          description="Reports, notices, and features for the public news feed."
        />
      </div>

      <Card className="p-5">
        <PostForm />
      </Card>
    </div>
  );
}
