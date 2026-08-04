"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Send, CheckCircle2 } from "lucide-react";

import { interestAreas } from "@/lib/config";
import {
  Alert,
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import {
  submitContact,
  submitJoin,
  type SubmissionState,
} from "./actions";

const initial: SubmissionState = { ok: false };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? (
        "Sending…"
      ) : (
        <>
          <Send size={16} aria-hidden />
          {label}
        </>
      )}
    </Button>
  );
}

/** Invisible to people, tempting to bots. */
function Honeypot() {
  return (
    <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
      <label>
        Leave this field empty
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

function Success({ message }: { message: string }) {
  return (
    <Alert tone="ok">
      <p className="flex items-start gap-2">
        <CheckCircle2 size={17} className="mt-0.5 shrink-0" aria-hidden />
        <span>{message}</span>
      </p>
    </Alert>
  );
}

/* -------------------------------------------------------------------------- */

export function ContactForm() {
  const [state, action] = useActionState(submitContact, initial);

  if (state.ok && state.message) return <Success message={state.message} />;

  return (
    <form action={action} className="relative space-y-4">
      <Honeypot />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required htmlFor="c-name" error={state.errors?.name}>
          <Input id="c-name" name="name" autoComplete="name" required />
        </Field>
        <Field label="Email" required htmlFor="c-email" error={state.errors?.email}>
          <Input
            id="c-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
      </div>

      <Field label="Subject" htmlFor="c-subject" error={state.errors?.subject}>
        <Input id="c-subject" name="subject" placeholder="What's this about?" />
      </Field>

      <Field label="Message" required htmlFor="c-message" error={state.errors?.message}>
        <Textarea id="c-message" name="message" rows={6} required />
      </Field>

      <SubmitButton label="Send message" />
    </form>
  );
}

/* -------------------------------------------------------------------------- */

export function JoinForm() {
  const [state, action] = useActionState(submitJoin, initial);

  if (state.ok && state.message) return <Success message={state.message} />;

  return (
    <form action={action} className="relative space-y-4">
      <Honeypot />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required htmlFor="j-name" error={state.errors?.name}>
          <Input id="j-name" name="name" autoComplete="name" required />
        </Field>
        <Field label="Email" required htmlFor="j-email" error={state.errors?.email}>
          <Input
            id="j-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Class / year"
          htmlFor="j-class"
          hint="So we know which intake you're in."
          error={state.errors?.classYear}
        >
          <Input id="j-class" name="classYear" placeholder="e.g. Form 4" />
        </Field>
        <Field
          label="Phone"
          htmlFor="j-phone"
          hint="Optional."
          error={state.errors?.phone}
        >
          <Input id="j-phone" name="phone" type="tel" autoComplete="tel" />
        </Field>
      </div>

      <Field
        label="What would you like to work on?"
        htmlFor="j-interest"
        error={state.errors?.interestArea}
      >
        <Select id="j-interest" name="interestArea" defaultValue="">
          <option value="">No preference / not sure yet</option>
          {interestAreas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Tell us a bit about yourself"
        required
        htmlFor="j-message"
        hint="Why you'd like to join, and anything you've written or made before."
        error={state.errors?.message}
      >
        <Textarea id="j-message" name="message" rows={6} required />
      </Field>

      <SubmitButton label="Send application" />
    </form>
  );
}
