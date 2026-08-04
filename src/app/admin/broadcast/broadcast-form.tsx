"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Send, AlertTriangle, Users, Coins } from "lucide-react";
import type { Role } from "@prisma/client";

import { ALL_ROLES, ROLE_LABEL } from "@/lib/rbac";
import { countSegments, estimateCost, formatMoney } from "@/lib/sms-format";
import { cn } from "@/lib/utils";
import {
  Alert,
  Button,
  Checkbox,
  Field,
  Textarea,
} from "@/components/ui";
import { sendBroadcast, type BroadcastState } from "./actions";

export type AudienceCounts = Record<Role | "ALL", number>;

function SubmitButton({ recipients }: { recipients: number }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      variant="accent"
      disabled={pending || recipients === 0}
    >
      {pending ? (
        `Sending to ${recipients}…`
      ) : (
        <>
          <Send size={16} aria-hidden />
          Send to {recipients} {recipients === 1 ? "member" : "members"}
        </>
      )}
    </Button>
  );
}

export function BroadcastForm({
  prefix,
  counts,
  providerLabel,
  providerConfigured,
}: {
  prefix: string;
  /** How many people in each role have a usable phone number. */
  counts: AudienceCounts;
  providerLabel: string;
  providerConfigured: boolean;
}) {
  const [state, action] = useActionState<BroadcastState, FormData>(
    sendBroadcast,
    {},
  );

  const [body, setBody] = React.useState("");
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [confirmed, setConfirmed] = React.useState(false);

  // The prefix goes out with every message, so it has to be counted.
  const fullBody = `${prefix}${body}`;
  const info = countSegments(fullBody);

  // No roles ticked means everyone — matching what the server does.
  const recipients =
    roles.length === 0
      ? counts.ALL
      : roles.reduce((n, r) => n + counts[r], 0);

  const cost = estimateCost(info.segments, recipients);

  const toggleRole = (role: Role) =>
    setRoles((current) =>
      current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role],
    );

  return (
    <form action={action} className="space-y-5">
      {state.errors?.form ? (
        <Alert tone="danger" title="Nothing was sent">
          {state.errors.form}
        </Alert>
      ) : null}

      {!providerConfigured ? (
        <Alert tone="warn" title="No SMS provider is connected yet">
          Messages will be written to the server log instead of being delivered,
          so you can rehearse this safely. Add a provider in your environment
          variables to send for real — the README has the steps.
        </Alert>
      ) : null}

      <Field
        label="Message"
        required
        htmlFor="b-body"
        error={state.errors?.body}
        hint="Keep it short and specific. People will read this on a lock screen."
      >
        <Textarea
          id="b-body"
          name="body"
          rows={5}
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="e.g. URGENT: Board meeting moved to TODAY 3:30pm, Library Room 4. Please come."
        />
      </Field>

      {/* Exactly what will land on the phone. */}
      <div className="rounded-[var(--radius)] border border-line bg-surface-2 p-4">
        <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
          What they&apos;ll receive
        </p>
        <p className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-ink">
          {fullBody || (
            <span className="text-ink-3">Your message will appear here.</span>
          )}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2.5 text-[12.5px] text-ink-3">
          <span className="tabular-nums">
            {info.characters} characters
          </span>
          <span
            className={cn(
              "tabular-nums",
              info.segments > 1 ? "font-medium text-warn" : "",
            )}
          >
            {info.segments} message{info.segments === 1 ? "" : "s"} each
          </span>
          <span>{info.encoding}</span>
          {info.remaining > 0 && info.segments > 0 ? (
            <span className="tabular-nums">
              {info.remaining} left before the next one
            </span>
          ) : null}
        </div>

        {info.encoding === "UCS-2" ? (
          <p className="mt-2 flex items-start gap-1.5 text-[12.5px] text-warn">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
            An emoji or accented character has pushed this into the expensive
            encoding — 70 characters per message instead of 160. Removing it
            will cut the cost.
          </p>
        ) : null}
      </div>

      <fieldset className="rounded-[var(--radius)] border border-line p-4">
        <legend className="px-1.5 text-[13px] font-medium">Who gets it</legend>
        <p className="mb-3 text-[12.5px] text-ink-3">
          Tick nothing to send to the whole Board. Counts show how many people
          in each role have a usable phone number.
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {ALL_ROLES.map((r) => (
            <Checkbox
              key={r}
              name="audienceRoles"
              value={r}
              checked={roles.includes(r)}
              onChange={() => toggleRole(r)}
              label={`${ROLE_LABEL[r]} (${counts[r]} reachable)`}
            />
          ))}
        </div>
      </fieldset>

      {/* The number, and the money, immediately above the send button. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface p-4">
          <Users size={18} className="shrink-0 text-brand" aria-hidden />
          <div>
            <p className="font-serif text-[22px] font-semibold tabular-nums">
              {recipients}
            </p>
            <p className="text-[12.5px] text-ink-3">
              {recipients === 1 ? "person will be" : "people will be"} texted
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface p-4">
          <Coins size={18} className="shrink-0 text-accent" aria-hidden />
          <div>
            <p className="font-serif text-[22px] font-semibold tabular-nums">
              {formatMoney(cost)}
            </p>
            <p className="text-[12.5px] text-ink-3">
              estimated · {info.segments} × {recipients} via {providerLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-accent/40 bg-accent-soft p-4">
        <Checkbox
          name="confirm"
          value="SEND"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          label={`Send this to ${recipients} ${recipients === 1 ? "person" : "people"} now`}
          hint="Text messages cannot be recalled once sent. Read it back before you tick this."
        />
        {state.errors?.confirm ? (
          <p className="mt-2 text-[12.5px] text-danger">{state.errors.confirm}</p>
        ) : null}
      </div>

      <SubmitButton recipients={recipients} />

      {recipients === 0 ? (
        <p className="text-[13px] text-ink-3">
          Nobody in that selection has a phone number on file. Add numbers in
          Admin → Members, or ask members to add theirs in their profile.
        </p>
      ) : null}
    </form>
  );
}
