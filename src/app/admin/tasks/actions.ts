"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { sendEmail } from "@/lib/email";
import { site } from "@/lib/config";
import { formatDate } from "@/lib/utils";

export type TaskState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
};

const schema = z.object({
  title: z.string().trim().min(3, "What needs doing?").max(200),
  description: z.string().trim().max(2000).optional(),
  assigneeId: z.string().min(1, "Choose who this is for."),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]),
  dueAt: z.string().optional(),
  notify: z.boolean(),
});

export async function assignTask(
  _prev: TaskState,
  formData: FormData,
): Promise<TaskState> {
  const user = await requireRole("EXECUTIVE");

  const parsed = schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    assigneeId: formData.get("assigneeId"),
    priority: formData.get("priority"),
    dueAt: formData.get("dueAt") || undefined,
    notify: formData.get("notify") === "on",
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }

  const assignee = await db.user.findUnique({
    where: { id: parsed.data.assigneeId },
    select: { id: true, name: true, email: true, emailNotifications: true },
  });
  if (!assignee) return { errors: { assigneeId: "That member wasn't found." } };

  const dueAt = parsed.data.dueAt ? new Date(parsed.data.dueAt) : null;

  const task = await db.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      assigneeId: assignee.id,
      createdById: user.id,
      priority: parsed.data.priority,
      dueAt: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null,
    },
  });

  if (parsed.data.notify && assignee.emailNotifications) {
    await sendEmail({
      to: assignee.email,
      subject: `New task: ${task.title}`,
      body: [
        `Hello ${assignee.name},`,
        `${user.name} has assigned you a task.`,
        task.title,
        task.description ?? "",
        task.dueAt ? `Due: ${formatDate(task.dueAt)}` : "No due date.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      action: { label: "Open your tasks", url: `${site.url}/portal/tasks` },
    });
  }

  revalidatePath("/admin/tasks");
  revalidatePath("/portal/tasks");
  revalidatePath("/portal", "layout");

  return { ok: true, message: `Assigned to ${assignee.name}.` };
}

export async function deleteTask(formData: FormData) {
  await requireRole("EXECUTIVE");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.task.delete({ where: { id } });

  revalidatePath("/admin/tasks");
  revalidatePath("/portal/tasks");
  revalidatePath("/portal", "layout");
}
