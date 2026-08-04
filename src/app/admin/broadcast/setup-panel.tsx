"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  PlugZap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Loader2,
} from "lucide-react";

import { Alert, Button, Card, CardHeader } from "@/components/ui";
import {
  testConnection,
  sendTestMessage,
  type TestSendState,
} from "./actions";
import type { TwilioAccountInfo } from "@/lib/twilio";

function TestSendButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="sm" disabled={pending}>
      {pending ? (
        <>
          <Loader2 size={14} className="animate-spin" aria-hidden />
          Sending…
        </>
      ) : (
        <>
          <Send size={14} aria-hidden />
          Text myself a test
        </>
      )}
    </Button>
  );
}

/**
 * Setup verification, kept next to the compose box.
 *
 * Both checks are things you want to have done *before* an emergency, not
 * during one.
 */
export function SetupPanel({ isTwilio }: { isTwilio: boolean }) {
  const [account, setAccount] = React.useState<TwilioAccountInfo | null>(null);
  const [checking, setChecking] = React.useState(false);

  const [testState, testAction] = useActionState<TestSendState, FormData>(
    sendTestMessage,
    {},
  );

  const runCheck = async () => {
    setChecking(true);
    try {
      setAccount(await testConnection());
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Check the setup"
        description="Do this once, now — not when something is actually urgent."
      />

      <div className="space-y-4 p-4">
        {isTwilio ? (
          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={runCheck}
              disabled={checking}
            >
              {checking ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                  Checking…
                </>
              ) : (
                <>
                  <PlugZap size={14} aria-hidden />
                  Test the Twilio connection
                </>
              )}
            </Button>

            {account ? (
              account.ok ? (
                <div className="mt-3 space-y-2">
                  <p className="flex items-start gap-2 text-[13px] text-ok">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden />
                    <span>
                      Connected to <strong>{account.friendlyName}</strong> —
                      sending from{" "}
                      <code className="font-mono text-[12.5px]">
                        {account.from}
                      </code>
                      {account.usingMessagingService
                        ? " (Messaging Service)"
                        : ""}
                      .
                    </span>
                  </p>

                  {account.type === "Trial" ? (
                    <Alert tone="warn" title="This is a Twilio trial account">
                      A trial account can only text numbers you have verified in
                      the Twilio console. A broadcast to the whole Board would
                      be rejected for everyone else — and it would look like it
                      sent. Upgrade the account before relying on this.
                    </Alert>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 flex items-start gap-2 text-[13px] text-danger">
                  <XCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
                  {account.error}
                </p>
              )
            ) : null}
          </div>
        ) : (
          <p className="flex items-start gap-2 text-[13px] text-ink-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warn" aria-hidden />
            Twilio isn&apos;t the configured provider, so the connection check is
            unavailable. You can still send yourself a test below.
          </p>
        )}

        <div className="border-t border-line pt-4">
          <form action={testAction}>
            <TestSendButton />
          </form>

          <p className="mt-2 text-[12.5px] text-ink-3">
            Sends one message to your own number and nobody else&apos;s. Costs
            one message.
          </p>

          {testState.ok && testState.message ? (
            <p className="mt-2 flex items-start gap-2 text-[13px] text-ok">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden />
              {testState.message}
            </p>
          ) : null}

          {testState.error ? (
            <p className="mt-2 flex items-start gap-2 text-[13px] text-danger">
              <XCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
              {testState.error}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
