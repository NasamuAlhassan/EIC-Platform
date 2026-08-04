"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Award } from "lucide-react";

import {
  Alert,
  Button,
  Checkbox,
  Field,
  Input,
  Textarea,
} from "@/components/ui";
import { createAchievement, type AchievementState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        "Saving…"
      ) : (
        <>
          <Award size={16} aria-hidden />
          Record achievement
        </>
      )}
    </Button>
  );
}

export function AchievementForm() {
  const [state, action] = useActionState<AchievementState, FormData>(
    createAchievement,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      {state.ok && state.message ? (
        <Alert tone="ok">{state.message}</Alert>
      ) : null}

      <Field label="What happened" required htmlFor="ac-title" error={state.errors?.title}>
        <Input
          id="ac-title"
          name="title"
          required
          placeholder="e.g. Best School Magazine, Regional Media Awards"
        />
      </Field>

      <Field label="Details" htmlFor="ac-desc" error={state.errors?.description}>
        <Textarea id="ac-desc" name="description" rows={3} />
      </Field>

      <Field label="Date" required htmlFor="ac-date" error={state.errors?.achievedAt}>
        <Input id="ac-date" name="achievedAt" type="date" required />
      </Field>

      <Field label="Photo" htmlFor="ac-image" hint="Optional." error={state.errors?.image}>
        <input
          id="ac-image"
          name="image"
          type="file"
          accept="image/*"
          className="block w-full text-[13.5px] text-ink-2
                     file:mr-3 file:rounded-md file:border-0 file:bg-surface-2
                     file:px-3 file:py-2 file:text-[13px] file:font-medium
                     file:text-ink hover:file:bg-surface-3"
        />
      </Field>

      <Checkbox
        name="featured"
        label="Highlight this at the top of the achievements page"
      />

      <Submit />
    </form>
  );
}
