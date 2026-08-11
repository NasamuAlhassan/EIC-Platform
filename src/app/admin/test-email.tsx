"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { MailCheck } from "lucide-react";

import { Alert, Button } from "@/components/ui";
import { sendTestEmail, type TestEmailState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="sm" disabled={pending}>
      {pending ? (
        "Sending…"
      ) : (
        <>
          <MailCheck size={14} aria-hidden />
          Send me a test email
        </>
      )}
    </Button>
  );
}

export function TestEmail() {
  const [state, action] = useActionState<TestEmailState, FormData>(
    sendTestEmail,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      {state.ok ? (
        <Alert tone="ok" title={`Sent to ${state.sentTo}`}>
          <p>
            From <code className="font-mono text-[12.5px]">{state.from}</code>.
          </p>
          {/*
            The provider accepting a message is not the same as a person
            receiving it. Free and newly-registered domains are routinely
            filtered, so the only answer that counts is which folder it landed
            in — and the screen should say so rather than claim success.
          */}
          <p className="mt-2">
            Check your <strong>inbox and your spam folder</strong>. Landing in
            spam means the provider accepted it and the recipient still
            won&apos;t see it, which is the failure worth catching now rather
            than after twenty members are waiting on passwords.
          </p>
        </Alert>
      ) : null}

      <Submit />
    </form>
  );
}
