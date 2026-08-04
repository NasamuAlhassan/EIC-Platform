"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarPlus, Save } from "lucide-react";
import type { Event as BoardEvent } from "@prisma/client";

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
import { createEvent, updateEvent, type EventState } from "./actions";

const TYPES = [
  ["MEETING", "Meeting"],
  ["DEADLINE", "Deadline"],
  ["TRAINING", "Training"],
  ["PUBLICATION", "Publication date"],
  ["SOCIAL", "Social"],
  ["OTHER", "Other"],
] as const;

/** `<input type="date">` and `type="time"` want these exact formats. */
function dateValue(d?: Date | null) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function timeValue(d?: Date | null) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Submit({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? (
        "Saving…"
      ) : editing ? (
        <>
          <Save size={16} aria-hidden />
          Save changes
        </>
      ) : (
        <>
          <CalendarPlus size={16} aria-hidden />
          Schedule event
        </>
      )}
    </Button>
  );
}

export function EventForm({ event }: { event?: BoardEvent }) {
  const editing = Boolean(event);
  const [state, action] = useActionState<EventState, FormData>(
    editing ? updateEvent : createEvent,
    {},
  );

  return (
    <form action={action} className="space-y-5">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}

      {state.errors?.form ? (
        <Alert tone="danger">{state.errors.form}</Alert>
      ) : null}

      <Field label="Title" required htmlFor="e-title" error={state.errors?.title}>
        <Input
          id="e-title"
          name="title"
          required
          defaultValue={event?.title ?? ""}
          placeholder="e.g. General Meeting — Term 2"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="e-type">
          <Select id="e-type" name="type" defaultValue={event?.type ?? "MEETING"}>
            {TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Location" htmlFor="e-location" error={state.errors?.location}>
          <Input
            id="e-location"
            name="location"
            defaultValue={event?.location ?? ""}
            placeholder="e.g. Library, Room 4"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date" required htmlFor="e-date" error={state.errors?.date}>
          <Input
            id="e-date"
            name="date"
            type="date"
            required
            defaultValue={dateValue(event?.startsAt)}
          />
        </Field>
        <Field label="Start time" htmlFor="e-start" error={state.errors?.startTime}>
          <Input
            id="e-start"
            name="startTime"
            type="time"
            defaultValue={timeValue(event?.startsAt)}
          />
        </Field>
        <Field label="End time" htmlFor="e-end" error={state.errors?.endTime}>
          <Input
            id="e-end"
            name="endTime"
            type="time"
            defaultValue={timeValue(event?.endsAt)}
          />
        </Field>
      </div>

      <Checkbox
        name="allDay"
        label="All-day event"
        hint="Times are ignored when this is ticked."
        defaultChecked={event?.allDay ?? false}
      />

      <Field
        label="Description"
        htmlFor="e-description"
        error={state.errors?.description}
      >
        <Textarea
          id="e-description"
          name="description"
          rows={4}
          defaultValue={event?.description ?? ""}
        />
      </Field>

      <Field
        label="Agenda"
        htmlFor="e-agenda"
        hint="Optional. Shown on the event page."
        error={state.errors?.agenda}
      >
        <Textarea
          id="e-agenda"
          name="agenda"
          rows={5}
          defaultValue={event?.agenda ?? ""}
        />
      </Field>

      <Field
        label="What to bring"
        htmlFor="e-materials"
        error={state.errors?.requiredMaterials}
      >
        <Input
          id="e-materials"
          name="requiredMaterials"
          defaultValue={event?.requiredMaterials ?? ""}
          placeholder="e.g. Draft articles, notebook"
        />
      </Field>

      <fieldset className="space-y-3 rounded-[var(--radius)] border border-line p-4">
        <legend className="px-1.5 text-[13px] font-medium">Visibility</legend>

        <Field label="Minimum role" htmlFor="e-minrole">
          <Select
            id="e-minrole"
            name="minRole"
            defaultValue={event?.minRole ?? "MEMBER"}
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]} and above
              </option>
            ))}
          </Select>
        </Field>

        <Checkbox
          name="isPublic"
          label="Also show on the public website calendar"
          defaultChecked={event?.isPublic ?? false}
        />
        <Checkbox
          name="rsvpEnabled"
          label="Let members RSVP"
          defaultChecked={event?.rsvpEnabled ?? true}
        />
        {!editing ? (
          <Checkbox
            name="notify"
            label="Email members about this event now"
          />
        ) : null}
      </fieldset>

      <Submit editing={editing} />
    </form>
  );
}
