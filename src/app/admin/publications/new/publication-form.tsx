"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { BookOpen } from "lucide-react";

import {
  Button,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { createPublication, type PublicationState } from "../actions";

const TYPES = [
  ["NEWSLETTER", "Newsletter"],
  ["MAGAZINE", "Magazine"],
  ["ARTICLE", "Article"],
  ["SPECIAL_EDITION", "Special edition"],
] as const;

const fileInputClass =
  "block w-full text-[13.5px] text-ink-2 file:mr-3 file:rounded-md file:border-0 " +
  "file:bg-surface-2 file:px-3 file:py-2 file:text-[13px] file:font-medium " +
  "file:text-ink hover:file:bg-surface-3";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? (
        "Publishing…"
      ) : (
        <>
          <BookOpen size={16} aria-hidden />
          Publish
        </>
      )}
    </Button>
  );
}

export function PublicationForm() {
  const [state, action] = useActionState<PublicationState, FormData>(
    createPublication,
    {},
  );

  return (
    <form action={action} className="space-y-5">
      <Field label="Title" required htmlFor="p-title" error={state.errors?.title}>
        <Input
          id="p-title"
          name="title"
          required
          placeholder="e.g. The Chronicle"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="p-type">
          <Select id="p-type" name="type" defaultValue="NEWSLETTER">
            {TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Issue label"
          htmlFor="p-issue"
          hint="e.g. Vol. 3, Issue 2"
          error={state.errors?.issueLabel}
        >
          <Input id="p-issue" name="issueLabel" />
        </Field>
      </div>

      <Field
        label="Description"
        htmlFor="p-description"
        hint="A short summary, shown on the publication page."
        error={state.errors?.description}
      >
        <Textarea id="p-description" name="description" rows={4} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Published on"
          htmlFor="p-date"
          error={state.errors?.publishedAt}
        >
          <Input id="p-date" name="publishedAt" type="date" />
        </Field>
        <Field
          label="Page count"
          htmlFor="p-pages"
          hint="Optional."
          error={state.errors?.pageCount}
        >
          <Input id="p-pages" name="pageCount" type="number" min={0} />
        </Field>
      </div>

      <Field
        label="The publication (PDF)"
        htmlFor="p-file"
        hint="Up to 25 MB. Readers can view it in the browser or download it."
        error={state.errors?.file}
      >
        <input
          id="p-file"
          name="file"
          type="file"
          accept="application/pdf"
          className={fileInputClass}
        />
      </Field>

      <Field
        label="Cover image"
        htmlFor="p-cover"
        hint="Optional but recommended — it's what people see first."
        error={state.errors?.cover}
      >
        <input
          id="p-cover"
          name="cover"
          type="file"
          accept="image/*"
          className={fileInputClass}
        />
      </Field>

      <div className="space-y-3 rounded-[var(--radius)] border border-line p-4">
        <Checkbox
          name="isPublic"
          label="Show on the public website"
          defaultChecked
        />
        <Checkbox
          name="featured"
          label="Feature this on the homepage"
          hint="Replaces whatever is currently featured."
        />
      </div>

      <Submit />
    </form>
  );
}
