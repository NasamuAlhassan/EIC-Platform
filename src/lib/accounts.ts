import "server-only";

import crypto from "node:crypto";

import type { SendResult } from "./email";

/**
 * The bits of account creation that more than one screen needs.
 *
 * Both Admin → Members and the join-application inbox create accounts, hand out
 * a one-time password, and have to say whether it actually reached the person.
 * That was written once and then wanted twice, so it lives here rather than
 * being copied — a second copy of the delivery wording would drift from the
 * first, and the whole point of it is that it tells the truth.
 */

/**
 * Readable enough to pass on out loud once, random enough not to guess.
 *
 * base64url keeps it to characters that survive being read over a phone or
 * copied out of a chat, and the hyphens make it legible in chunks.
 */
export function generateTempPassword(): string {
  return `EIC-${crypto.randomBytes(9).toString("base64url").replace(/[-_]/g, "")}`;
}

export type Delivery = {
  /** True only when a provider accepted it for a real address. */
  emailed: boolean;
  /** Something an administrator can act on. */
  emailNote: string;
};

/**
 * Turns a send result into a sentence.
 *
 * Reported rather than assumed: a provider refuses to send from an unverified
 * domain, and whoever believes the email went out is the one person who could
 * have passed the password on by hand.
 */
export function describeDelivery(
  result: Pick<SendResult, "ok" | "simulated" | "error">,
  address: string,
  options?: {
    /**
     * What to do instead, when nothing was sent.
     *
     * Needed because not every email carries a password. Telling someone to
     * "pass the password on" after declining an application is nonsense, and
     * the wording is the whole value of this function.
     */
    fallback?: string;
  },
): Delivery {
  const fallback = options?.fallback ?? "pass the password on yourself";

  if (result.simulated) {
    return {
      emailed: false,
      emailNote: `Email isn't set up yet, so nothing was sent — ${fallback}.`,
    };
  }
  if (!result.ok) {
    return {
      emailed: false,
      emailNote: `The email couldn't be sent (${result.error ?? "unknown error"}) — ${fallback}.`,
    };
  }
  return { emailed: true, emailNote: `Sent to ${address}.` };
}
