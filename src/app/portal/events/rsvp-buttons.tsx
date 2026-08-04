"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, X, HelpCircle } from "lucide-react";
import type { RsvpStatus } from "@prisma/client";

import { cn } from "@/lib/utils";
import { setRsvp, type RsvpState } from "./actions";

const OPTIONS: {
  value: RsvpStatus;
  label: string;
  Icon: typeof Check;
  activeClass: string;
}[] = [
  {
    value: "ATTENDING",
    label: "Going",
    Icon: Check,
    activeClass: "bg-ok text-white border-transparent",
  },
  {
    value: "MAYBE",
    label: "Maybe",
    Icon: HelpCircle,
    activeClass: "bg-warn text-white border-transparent",
  },
  {
    value: "NOT_ATTENDING",
    label: "Can't make it",
    Icon: X,
    activeClass: "bg-surface-3 text-ink border-line-2",
  },
];

function Option({
  option,
  current,
}: {
  option: (typeof OPTIONS)[number];
  current: RsvpStatus | null;
}) {
  const { pending } = useFormStatus();
  const active = current === option.value;
  const { Icon } = option;

  return (
    <button
      type="submit"
      name="status"
      value={option.value}
      disabled={pending}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius)] border px-3 py-2 text-[13.5px] font-medium transition-colors",
        "disabled:opacity-60",
        active
          ? option.activeClass
          : "border-line-2 bg-surface text-ink-2 hover:border-brand hover:text-brand",
      )}
    >
      <Icon size={15} aria-hidden />
      {option.label}
    </button>
  );
}

export function RsvpButtons({
  eventId,
  current,
}: {
  eventId: string;
  current: RsvpStatus | null;
}) {
  const [state, action] = useActionState<RsvpState, FormData>(setRsvp, {});

  return (
    <form action={action}>
      <input type="hidden" name="eventId" value={eventId} />
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <Option key={o.value} option={o} current={current} />
        ))}
      </div>
      {state.error ? (
        <p className="mt-2 text-[12.5px] text-danger">{state.error}</p>
      ) : null}
    </form>
  );
}
