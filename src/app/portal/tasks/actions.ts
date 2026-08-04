"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { getPortalUser } from "@/lib/portal";

const schema = z.object({
  taskId: z.string().min(1),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]),
});

export async function updateTaskStatus(formData: FormData) {
  const parsed = schema.safeParse({
    taskId: formData.get("taskId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const user = await getPortalUser();

  // A member may only move their own assignments.
  const task = await db.task.findFirst({
    where: { id: parsed.data.taskId, assigneeId: user.id },
    select: { id: true },
  });
  if (!task) return;

  await db.task.update({
    where: { id: task.id },
    data: {
      status: parsed.data.status,
      completedAt: parsed.data.status === "DONE" ? new Date() : null,
    },
  });

  revalidatePath("/portal/tasks");
  revalidatePath("/portal", "layout");
}
