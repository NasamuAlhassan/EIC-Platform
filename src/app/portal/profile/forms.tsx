"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  Alert,
  Button,
  Checkbox,
  Field,
  Input,
  Textarea,
} from "@/components/ui";
import {
  updateProfile,
  changePassword,
  type ProfileState,
} from "./actions";

function Save({ label = "Save changes" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function ProfileForm({
  user,
}: {
  user: {
    name: string;
    email: string;
    position: string | null;
    classYear: string | null;
    phone: string | null;
    bio: string | null;
    showEmail: boolean;
    showPhone: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
  };
}) {
  const [state, action] = useActionState<ProfileState, FormData>(
    updateProfile,
    {},
  );

  return (
    <form action={action} className="space-y-5">
      {state.ok && state.message ? (
        <Alert tone="ok">{state.message}</Alert>
      ) : null}

      <Field label="Full name" required htmlFor="p-name" error={state.errors?.name}>
        <Input id="p-name" name="name" defaultValue={user.name} required />
      </Field>

      <Field
        label="Email"
        htmlFor="p-email"
        hint="Your sign-in address. Ask an administrator to change it."
      >
        <Input id="p-email" defaultValue={user.email} disabled />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Position on the Board"
          htmlFor="p-position"
          hint="e.g. Layout Editor"
          error={state.errors?.position}
        >
          <Input
            id="p-position"
            name="position"
            defaultValue={user.position ?? ""}
          />
        </Field>
        <Field
          label="Class / year"
          htmlFor="p-class"
          error={state.errors?.classYear}
        >
          <Input
            id="p-class"
            name="classYear"
            defaultValue={user.classYear ?? ""}
          />
        </Field>
      </div>

      <Field
        label="Mobile number"
        htmlFor="p-phone"
        hint="Used only for urgent texts — a meeting moved to today, a deadline brought forward. Local format is fine."
        error={state.errors?.phone}
      >
        <Input
          id="p-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="e.g. 024 412 3456"
          defaultValue={user.phone ?? ""}
        />
      </Field>

      <Field
        label="Short bio"
        htmlFor="p-bio"
        hint="Shown in the directory, and on the public About page if you're an executive."
        error={state.errors?.bio}
      >
        <Textarea id="p-bio" name="bio" rows={3} defaultValue={user.bio ?? ""} />
      </Field>

      <Field
        label="Profile photo"
        htmlFor="p-avatar"
        hint="JPEG, PNG, WebP, or GIF. Replaces your current photo."
        error={state.errors?.avatar}
      >
        <input
          id="p-avatar"
          name="avatar"
          type="file"
          accept="image/*"
          className="block w-full text-[13.5px] text-ink-2
                     file:mr-3 file:rounded-md file:border-0 file:bg-surface-2
                     file:px-3 file:py-2 file:text-[13px] file:font-medium
                     file:text-ink hover:file:bg-surface-3"
        />
      </Field>

      <fieldset className="space-y-3 rounded-[var(--radius)] border border-line p-4">
        <legend className="px-1.5 text-[13px] font-medium">Privacy</legend>
        <Checkbox
          name="showEmail"
          label="Show my email in the member directory"
          hint="Administrators can always see it."
          defaultChecked={user.showEmail}
        />
        <Checkbox
          name="showPhone"
          label="Show my phone number in the member directory"
          defaultChecked={user.showPhone}
        />
        <Checkbox
          name="emailNotifications"
          label="Email me about announcements and reminders"
          defaultChecked={user.emailNotifications}
        />
        <Checkbox
          name="smsNotifications"
          label="Text me when something is urgent"
          hint="Rare, and only for things that can't wait — meetings moved, deadlines changed. Needs a mobile number above."
          defaultChecked={user.smsNotifications}
        />
      </fieldset>

      <Save />
    </form>
  );
}

/* -------------------------------------------------------------------------- */

export function PasswordForm() {
  const [state, action] = useActionState<ProfileState, FormData>(
    changePassword,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      {state.ok && state.message ? (
        <Alert tone="ok">{state.message}</Alert>
      ) : null}

      <Field
        label="Current password"
        required
        htmlFor="pw-current"
        error={state.errors?.current}
      >
        <Input
          id="pw-current"
          name="current"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Field
        label="New password"
        required
        htmlFor="pw-next"
        hint="At least 10 characters."
        error={state.errors?.next}
      >
        <Input
          id="pw-next"
          name="next"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <Field
        label="Confirm new password"
        required
        htmlFor="pw-confirm"
        error={state.errors?.confirm}
      >
        <Input
          id="pw-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <Save label="Change password" />
    </form>
  );
}
