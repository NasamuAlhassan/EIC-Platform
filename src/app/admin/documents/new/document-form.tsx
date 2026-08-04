"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Upload } from "lucide-react";

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
import { uploadDocument, type DocumentState } from "../actions";

const TYPES = [
  ["MINUTES", "Meeting minutes"],
  ["ATTENDANCE", "Attendance record"],
  ["REPORT", "Report"],
  ["TEMPLATE", "Template"],
  ["GUIDELINE", "Guideline"],
  ["CONSTITUTION", "Constitution"],
  ["FINANCE", "Finance"],
  ["OTHER", "Other"],
] as const;

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? (
        "Uploading…"
      ) : (
        <>
          <Upload size={16} aria-hidden />
          Upload document
        </>
      )}
    </Button>
  );
}

export function DocumentForm({
  folders,
  storageIsLocal,
}: {
  folders: { id: string; name: string }[];
  storageIsLocal: boolean;
}) {
  const [state, action] = useActionState<DocumentState, FormData>(
    uploadDocument,
    {},
  );

  return (
    <form action={action} className="space-y-5">
      {storageIsLocal ? (
        <Alert tone="warn" title="Uploads are being saved to local disk">
          BLOB_READ_WRITE_TOKEN isn&apos;t set. That&apos;s fine while
          developing, but files saved this way disappear on Vercel. Set up a
          Blob store before going live.
        </Alert>
      ) : null}

      <Field
        label="File"
        required
        htmlFor="d-file"
        hint="PDF, Word, Excel, PowerPoint, or an image. Up to 25 MB."
        error={state.errors?.file}
      >
        <input
          id="d-file"
          name="file"
          type="file"
          required
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*"
          className="block w-full text-[13.5px] text-ink-2
                     file:mr-3 file:rounded-md file:border-0 file:bg-surface-2
                     file:px-3 file:py-2 file:text-[13px] file:font-medium
                     file:text-ink hover:file:bg-surface-3"
        />
      </Field>

      <Field label="Title" required htmlFor="d-title" error={state.errors?.title}>
        <Input
          id="d-title"
          name="title"
          required
          placeholder="e.g. Minutes — General Meeting, 12 March"
        />
      </Field>

      <Field
        label="Description"
        htmlFor="d-description"
        hint="Optional. Helps people find it later."
        error={state.errors?.description}
      >
        <Textarea id="d-description" name="description" rows={3} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="d-type">
          <Select id="d-type" name="type" defaultValue="MINUTES">
            {TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Record date"
          htmlFor="d-date"
          hint="The date this document is about, not today."
          error={state.errors?.recordDate}
        >
          <Input id="d-date" name="recordDate" type="date" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Folder" htmlFor="d-folder">
          <Select id="d-folder" name="folderId" defaultValue="">
            <option value="">No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="…or create a new folder"
          htmlFor="d-newfolder"
          hint="Overrides the choice above."
          error={state.errors?.newFolder}
        >
          <Input id="d-newfolder" name="newFolder" placeholder="e.g. 2025/26" />
        </Field>
      </div>

      <Field
        label="Tags"
        htmlFor="d-tags"
        hint="Comma separated, e.g. minutes, term-2, finance"
        error={state.errors?.tags}
      >
        <Input id="d-tags" name="tags" />
      </Field>

      <fieldset className="space-y-3 rounded-[var(--radius)] border border-line p-4">
        <legend className="px-1.5 text-[13px] font-medium">Who can see it</legend>

        <Field label="Minimum role" htmlFor="d-minrole">
          <Select id="d-minrole" name="minRole" defaultValue="MEMBER">
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]} and above
              </option>
            ))}
          </Select>
        </Field>

        <Checkbox
          name="isPublic"
          label="Also make this downloadable from the public website"
          hint="Only tick this for documents that are safe for anyone to read."
        />
      </fieldset>

      <Submit />
    </form>
  );
}
