import type { Metadata } from "next";
import { CheckSquare, AlertTriangle, Clock } from "lucide-react";
import type { TaskStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { getPortalUser } from "@/lib/portal";
import { formatDate, timeAgo } from "@/lib/utils";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Select,
} from "@/components/ui";
import { updateTaskStatus } from "./actions";

export const metadata: Metadata = { title: "My tasks" };

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};

export default async function TasksPage() {
  const user = await getPortalUser();
  const now = new Date();

  const tasks = await db.task.findMany({
    where: { assigneeId: user.id },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { name: true } } },
  });

  const open = tasks.filter((t) => t.status !== "DONE");
  const done = tasks.filter((t) => t.status === "DONE");

  return (
    <div>
      <PageHeader
        title="My tasks"
        description="Assignments given to you by the executive committee."
      />

      <Card>
        <CardHeader
          title="Open"
          description={`${open.length} ${open.length === 1 ? "assignment" : "assignments"}`}
        />
        {open.length > 0 ? (
          <ul className="divide-y divide-line">
            {open.map((t) => {
              const overdue = t.dueAt && t.dueAt < now;
              return (
                <li key={t.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-medium">{t.title}</h3>
                        {t.priority === "HIGH" ? (
                          <Badge tone="danger">High priority</Badge>
                        ) : t.priority === "LOW" ? (
                          <Badge tone="neutral">Low</Badge>
                        ) : null}
                        {t.status === "BLOCKED" ? (
                          <Badge tone="warn">Blocked</Badge>
                        ) : t.status === "IN_PROGRESS" ? (
                          <Badge tone="brand">In progress</Badge>
                        ) : null}
                      </div>

                      {t.description ? (
                        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
                          {t.description}
                        </p>
                      ) : null}

                      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
                        {t.dueAt ? (
                          <span
                            className={`inline-flex items-center gap-1 ${
                              overdue ? "font-medium text-danger" : ""
                            }`}
                          >
                            {overdue ? (
                              <AlertTriangle size={12} aria-hidden />
                            ) : (
                              <Clock size={12} aria-hidden />
                            )}
                            {overdue ? "Overdue — was due" : "Due"}{" "}
                            {formatDate(t.dueAt)}
                          </span>
                        ) : (
                          <span>No due date</span>
                        )}
                        {t.createdBy ? (
                          <span>Assigned by {t.createdBy.name}</span>
                        ) : null}
                        <span>{timeAgo(t.createdAt)}</span>
                      </p>
                    </div>

                    {/* A plain form post, so this works without JavaScript. */}
                    <form action={updateTaskStatus} className="shrink-0">
                      <input type="hidden" name="taskId" value={t.id} />
                      <label className="sr-only" htmlFor={`status-${t.id}`}>
                        Status for {t.title}
                      </label>
                      <Select
                        id={`status-${t.id}`}
                        name="status"
                        defaultValue={t.status}
                        className="w-40"
                        // Submitting on change keeps it to a single interaction.
                        // The surrounding form still works if JS is disabled —
                        // the button below is the fallback.
                      >
                        {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </Select>
                      <button
                        type="submit"
                        className="mt-1.5 w-full rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-1.5 text-[12.5px] font-medium hover:bg-surface-2"
                      >
                        Update
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={<CheckSquare size={20} />}
            title="Nothing open"
            description="You have no outstanding assignments."
          />
        )}
      </Card>

      {done.length > 0 ? (
        <Card className="mt-6">
          <CardHeader title="Completed" description={`${done.length} done`} />
          <ul className="divide-y divide-line">
            {done.slice(0, 20).map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                <CheckSquare size={16} className="shrink-0 text-ok" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink-2 line-through decoration-ink-3/40">
                  {t.title}
                </span>
                <span className="shrink-0 text-[12px] text-ink-3">
                  {t.completedAt ? timeAgo(t.completedAt) : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
