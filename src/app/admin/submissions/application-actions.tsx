"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { UserPlus, Copy, Check, X } from "lucide-react";

import { Alert, Button, Textarea } from "@/components/ui";
import {
  acceptApplication,
  declineApplication,
  type ApplicationState,
} from "./actions";

const initial: ApplicationState = {};

function Submit({
  label,
  variant = "primary",
  icon,
}: {
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  icon?: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size="sm" disabled={pending}>
      {pending ? "Working…" : <>{icon}{label}</>}
    </Button>
  );
}

/** A one-time password, with a copy button. It cannot be retrieved later. */
function TempPassword({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <div className="mt-2 flex items-center gap-2 rounded-md border border-line-2 bg-surface p-2">
      <code className="flex-1 select-all font-mono text-[13px] text-ink">
        {value}
      </code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            // Clipboard permission denied — the code is selectable anyway.
          }
        }}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] text-ink-2 hover:bg-surface-2"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function ApplicationDecision({
  submissionId,
  applicantName,
}: {
  submissionId: string;
  applicantName: string;
}) {
  const [accepted, acceptAction] = useActionState<ApplicationState, FormData>(
    acceptApplication,
    initial,
  );
  const [declined, declineAction] = useActionState<ApplicationState, FormData>(
    declineApplication,
    initial,
  );
  const [showDecline, setShowDecline] = React.useState(false);

  const outcome = accepted.ok ? accepted : declined.ok ? declined : null;

  // Once a decision is made the page revalidates, but show the result inline —
  // the password only exists in this response.
  if (outcome) {
    return (
      <Alert tone={outcome.emailed ? "ok" : "warn"} title={outcome.message}>
        {outcome.tempPassword ? (
          <>
            <p>
              Temporary password — copy it now, it won&apos;t be shown again.
              They&apos;ll be asked to change it on first sign-in.
            </p>
            <TempPassword value={outcome.tempPassword} />
          </>
        ) : null}
        {outcome.emailNote ? (
          <p className="mt-2 text-[12.5px]">{outcome.emailNote}</p>
        ) : null}
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      {accepted.error ? <Alert tone="danger">{accepted.error}</Alert> : null}
      {declined.error ? <Alert tone="danger">{declined.error}</Alert> : null}

      <div className="flex flex-wrap gap-2">
        <form action={acceptAction}>
          <input type="hidden" name="id" value={submissionId} />
          <Submit
            label="Accept onto the Board"
            icon={<UserPlus size={14} aria-hidden />}
          />
        </form>

        {!showDecline ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowDecline(true)}
          >
            <X size={14} aria-hidden />
            Decline
          </Button>
        ) : null}
      </div>

      {showDecline ? (
        <form action={declineAction} className="space-y-2">
          <input type="hidden" name="id" value={submissionId} />
          <Textarea
            name="note"
            rows={2}
            maxLength={500}
            placeholder={`Anything you'd like ${applicantName.split(" ")[0]} to know — optional.`}
            aria-label="Note to the applicant"
            className="min-h-0"
          />
          <p className="text-[12px] text-ink-3">
            They&apos;ll be told they haven&apos;t got a place this intake, and
            that applying again is welcome. Your note is added to that.
          </p>
          <div className="flex gap-2">
            <Submit label="Send decline" variant="secondary" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDecline(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
