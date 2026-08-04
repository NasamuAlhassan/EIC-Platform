import type { Metadata } from "next";
import { CheckSquare, Trash2, AlertTriangle } from "lucide-react";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { formatDate } from "@/lib/utils";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { TaskForm } from "./task-form";
import { deleteTask } from "./actions";

export const metadata: Metadata = { title: "Tasks" };

export default async function AdminTasksPage() {
  await requireRole("EXECUTIVE");
  const now = new Date();

  const [members, tasks] = await Promise.all([
    db.user.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, position: true },
    }),
    db.task.findMany({
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 100,
      include: {
        assignee: { select: { name: true, avatarUrl: true } },
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  const open = tasks.filter((t) => t.status !== "DONE");
  const done = tasks.filter((t) => t.status === "DONE");
  const overdue = open.filter((t) => t.dueAt && t.dueAt < now);

  return (
    <div>
      <PageHeader
        title="Tasks"
        description={`${open.length} open · ${overdue.length} overdue · ${done.length} done`}
      />

      <Card className="mb-6">
        <CardHeader
          title="Assign a task"
          description="It appears on their dashboard immediately."
        />
        <div className="p-5">
          <TaskForm members={members} />
        </div>
      </Card>

      {open.length > 0 ? (
        <Card>
          <CardHeader title="Open tasks" />
          <ul className="divide-y divide-line">
            {open.map((t) => {
              const isOverdue = t.dueAt && t.dueAt < now;
              return (
                <li key={t.id} className="flex items-start gap-3 p-4">
                  <Avatar
                    name={t.assignee?.name ?? "?"}
                    src={t.assignee?.avatarUrl}
                    size={32}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[14.5px] font-medium">{t.title}</h3>
                      {t.priority === "HIGH" ? (
                        <Badge tone="danger">High</Badge>
                      ) : null}
                      {t.status === "IN_PROGRESS" ? (
                        <Badge tone="brand">In progress</Badge>
                      ) : t.status === "BLOCKED" ? (
                        <Badge tone="warn">Blocked</Badge>
                      ) : null}
                    </div>

                    {t.description ? (
                      <p className="mt-1 text-[13px] text-ink-2">
                        {t.description}
                      </p>
                    ) : null}

                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[12.5px] text-ink-3">
                      <span>{t.assignee?.name ?? "Unassigned"}</span>
                      {t.dueAt ? (
                        <span
                          className={
                            isOverdue
                              ? "inline-flex items-center gap-1 font-medium text-danger"
                              : ""
                          }
                        >
                          {isOverdue ? (
                            <AlertTriangle size={11} aria-hidden />
                          ) : null}
                          Due {formatDate(t.dueAt)}
                        </span>
                      ) : null}
                      {t.createdBy ? <span>by {t.createdBy.name}</span> : null}
                    </p>
                  </div>

                  <form action={deleteTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${t.title}`}
                      className="text-ink-3 hover:text-danger"
                    >
                      <Trash2 size={14} aria-hidden />
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={<CheckSquare size={20} />}
            title="No open tasks"
            description="Assign work above and it lands on the member's dashboard."
          />
        </Card>
      )}

      {done.length > 0 ? (
        <Card className="mt-6">
          <CardHeader title="Completed" description={`${done.length} done`} />
          <ul className="divide-y divide-line">
            {done.slice(0, 25).map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                <CheckSquare size={15} className="shrink-0 text-ok" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-2">
                  {t.title}
                </span>
                <span className="shrink-0 text-[12px] text-ink-3">
                  {t.assignee?.name}
                  {t.completedAt ? ` · ${formatDate(t.completedAt)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
