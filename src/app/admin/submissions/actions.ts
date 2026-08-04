"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";

export async function setSubmissionStatus(formData: FormData) {
  await requireRole("EXECUTIVE");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !["NEW", "READ", "ARCHIVED"].includes(status)) return;

  await db.submission.update({
    where: { id },
    data: { status: status as "NEW" | "READ" | "ARCHIVED" },
  });

  revalidatePath("/admin/submissions");
  revalidatePath("/admin", "layout");
}
