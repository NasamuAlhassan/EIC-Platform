"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FolderPlus, ImagePlus } from "lucide-react";

import {
  Alert,
  Button,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { createAlbum, uploadMedia, type MediaState } from "./actions";

const fileInputClass =
  "block w-full text-[13.5px] text-ink-2 file:mr-3 file:rounded-md file:border-0 " +
  "file:bg-surface-2 file:px-3 file:py-2 file:text-[13px] file:font-medium " +
  "file:text-ink hover:file:bg-surface-3";

function Submit({ label, icon }: { label: string; icon: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Working…" : <>{icon}{label}</>}
    </Button>
  );
}

export function AlbumForm() {
  const [state, action] = useActionState<MediaState, FormData>(createAlbum, {});

  return (
    <form action={action} className="space-y-4">
      {state.ok && state.message ? (
        <Alert tone="ok">{state.message}</Alert>
      ) : null}

      <Field label="Album name" required htmlFor="al-title" error={state.errors?.title}>
        <Input
          id="al-title"
          name="title"
          required
          placeholder="e.g. Magazine launch, March 2025"
        />
      </Field>

      <Field label="Description" htmlFor="al-desc" error={state.errors?.description}>
        <Textarea id="al-desc" name="description" rows={2} />
      </Field>

      <Field
        label="Event date"
        htmlFor="al-date"
        hint="Optional. Used to order the gallery."
        error={state.errors?.eventDate}
      >
        <Input id="al-date" name="eventDate" type="date" />
      </Field>

      <Checkbox
        name="isPublic"
        label="Show this album in the public gallery"
        hint="Private albums stay in the members' archive."
      />

      <Submit label="Create album" icon={<FolderPlus size={16} aria-hidden />} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */

export function UploadForm({
  albums,
}: {
  albums: { id: string; title: string; isPublic: boolean }[];
}) {
  const [state, action] = useActionState<MediaState, FormData>(uploadMedia, {});

  return (
    <form action={action} className="space-y-4">
      {state.ok && state.message ? (
        <Alert tone="ok">{state.message}</Alert>
      ) : null}

      {albums.length === 0 ? (
        <Alert tone="warn">Create an album first, then upload photos into it.</Alert>
      ) : (
        <>
          <Field label="Album" required htmlFor="up-album" error={state.errors?.albumId}>
            <Select id="up-album" name="albumId" required defaultValue="">
              <option value="" disabled>
                Choose an album…
              </option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                  {a.isPublic ? " (public)" : " (private)"}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Photos"
            required
            htmlFor="up-photos"
            hint="Up to 20 at a time, 25 MB each."
            error={state.errors?.photos}
          >
            <input
              id="up-photos"
              name="photos"
              type="file"
              accept="image/*"
              multiple
              required
              className={fileInputClass}
            />
          </Field>

          <Field
            label="Caption"
            htmlFor="up-caption"
            hint="Optional. Applied to all photos in this batch."
          >
            <Input id="up-caption" name="caption" />
          </Field>

          <Checkbox
            name="isPublic"
            label="Publish these photos to the public gallery"
            hint="Only takes effect if the album itself is public."
          />

          <Submit label="Upload photos" icon={<ImagePlus size={16} aria-hidden />} />
        </>
      )}
    </form>
  );
}
