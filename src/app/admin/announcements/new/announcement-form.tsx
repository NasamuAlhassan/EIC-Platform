"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Send } from "lucide-react";

import { ALL_ROLES, ROLE_LABEL } from "@/lib/rbac";
import {
  Alert,
  Button,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import {
  createAnnouncement,
  type AnnouncementState,
} from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? (
        "Posting…"
      ) : (
        <>
          <Send size={16} aria-hidden />
          Post announcement
        </>
      )}
    </Button>
  );
}

export function AnnouncementForm({ emailConfigured }: { emailConfigured: boolean }) {
  const [state, action] = useActionState<AnnouncementState, FormData>(
    createAnnouncement,
    {},
  );

  return (
    <form action={action} className="space-y-5">
      {state.errors?.form ? (
        <Alert tone="danger">{state.errors.form}</Alert>
      ) : null}

      <Field label="Title" required htmlFor="a-title" error={state.errors?.title}>
        <Input
          id="a-title"
          name="title"
          required
          placeholder="e.g. Deadline moved for the March issue"
        />
      </Field>

      <Field
        label="Announcement"
        required
        htmlFor="a-body"
        hint="Leave a blank line between paragraphs."
        error={state.errors?.body}
      >
        <Textarea id="a-body" name="body" rows={9} required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Priority" htmlFor="a-priority">
          <Select id="a-priority" name="priority" defaultValue="NORMAL">
            <option value="NORMAL">Normal</option>
            <option value="IMPORTANT">Important</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </Field>

        <Field
          label="Stop showing after"
          htmlFor="a-expires"
          hint="Optional. Leave empty to keep it up."
          error={state.errors?.expiresAt}
        >
          <Input id="a-expires" name="expiresAt" type="date" />
        </Field>
      </div>

      <fieldset className="rounded-[var(--radius)] border border-line p-4">
        <legend className="px-1.5 text-[13px] font-medium">Who sees this</legend>
        <p className="mb-3 text-[12.5px] text-ink-3">
          Tick nothing to show it to everyone.
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {ALL_ROLES.map((r) => (
            <Checkbox
              key={r}
              name="audienceRoles"
              value={r}
              label={ROLE_LABEL[r]}
            />
          ))}
        </div>
      </fieldset>

      <div className="space-y-3 rounded-[var(--radius)] border border-line p-4">
        <Checkbox
          name="pinned"
          label="Pin to the top of the announcements list"
        />
        <Checkbox
          name="sendEmail"
          label="Also email this to the members it's addressed to"
          hint={
            emailConfigured
              ? "Only members who have email notifications switched on will receive it."
              : "Email isn't configured yet — the message will be written to the server log instead of being sent."
          }
        />
      </div>

      <Submit />
    </form>
  );
}
