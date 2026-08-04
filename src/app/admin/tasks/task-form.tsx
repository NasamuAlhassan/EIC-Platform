"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckSquare } from "lucide-react";

import {
  Alert,
  Button,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { assignTask, type TaskState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        "Assigning…"
      ) : (
        <>
          <CheckSquare size={16} aria-hidden />
          Assign task
        </>
      )}
    </Button>
  );
}

export function TaskForm({
  members,
}: {
  members: { id: string; name: string; position: string | null }[];
}) {
  const [state, action] = useActionState<TaskState, FormData>(assignTask, {});

  return (
    <form action={action} className="space-y-4">
      {state.ok && state.message ? (
        <Alert tone="ok">{state.message}</Alert>
      ) : null}

      <Field label="Task" required htmlFor="t-title" error={state.errors?.title}>
        <Input
          id="t-title"
          name="title"
          required
          placeholder="e.g. Write up the debate club feature"
        />
      </Field>

      <Field label="Details" htmlFor="t-desc" error={state.errors?.description}>
        <Textarea id="t-desc" name="description" rows={3} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Assign to"
          required
          htmlFor="t-assignee"
          error={state.errors?.assigneeId}
        >
          <Select id="t-assignee" name="assigneeId" required defaultValue="">
            <option value="" disabled>
              Choose a member…
            </option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.position ? ` — ${m.position}` : ""}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Priority" htmlFor="t-priority">
          <Select id="t-priority" name="priority" defaultValue="NORMAL">
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
          </Select>
        </Field>

        <Field label="Due" htmlFor="t-due" error={state.errors?.dueAt}>
          <Input id="t-due" name="dueAt" type="date" />
        </Field>
      </div>

      <Checkbox name="notify" label="Email them about it" defaultChecked />

      <Submit />
    </form>
  );
}
