"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Newspaper } from "lucide-react";

import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { createPost, type PostState } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? (
        "Saving…"
      ) : (
        <>
          <Newspaper size={16} aria-hidden />
          Save post
        </>
      )}
    </Button>
  );
}

export function PostForm() {
  const [state, action] = useActionState<PostState, FormData>(createPost, {});

  return (
    <form action={action} className="space-y-5">
      <Field label="Headline" required htmlFor="n-title" error={state.errors?.title}>
        <Input id="n-title" name="title" required />
      </Field>

      <Field
        label="Standfirst"
        htmlFor="n-excerpt"
        hint="One or two lines shown in listings. Left empty, we'll take the opening of the post."
        error={state.errors?.excerpt}
      >
        <Textarea id="n-excerpt" name="excerpt" rows={2} />
      </Field>

      <Field
        label="The post"
        required
        htmlFor="n-body"
        hint="Plain text. Leave a blank line between paragraphs."
        error={state.errors?.body}
      >
        <Textarea id="n-body" name="body" rows={16} required />
      </Field>

      <Field
        label="Cover image"
        htmlFor="n-cover"
        hint="Optional."
        error={state.errors?.cover}
      >
        <input
          id="n-cover"
          name="cover"
          type="file"
          accept="image/*"
          className="block w-full text-[13.5px] text-ink-2
                     file:mr-3 file:rounded-md file:border-0 file:bg-surface-2
                     file:px-3 file:py-2 file:text-[13px] file:font-medium
                     file:text-ink hover:file:bg-surface-3"
        />
      </Field>

      <Field label="Status" htmlFor="n-status">
        <Select id="n-status" name="status" defaultValue="DRAFT">
          <option value="DRAFT">Draft — only visible in here</option>
          <option value="PUBLISHED">Published — live on the website</option>
        </Select>
      </Field>

      <Submit />
    </form>
  );
}
