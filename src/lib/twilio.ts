import "server-only";

import crypto from "node:crypto";

/**
 * Twilio-specific pieces: credentials, request signing, and turning their
 * numeric error codes into something an executive can act on.
 *
 * Kept apart from `sms.ts` so the generic adapter stays provider-agnostic.
 */

export type TwilioCredentials = {
  accountSid: string;
  authToken: string;
  from: string;
};

export function twilioCredentials(): TwilioCredentials | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;

  if (!accountSid || !authToken || !from) return null;
  return { accountSid, authToken, from };
}

/** A Messaging Service SID goes in a different field from a phone number. */
export function isMessagingService(from: string) {
  return from.startsWith("MG");
}

/* -------------------------------------------------------------------------- */
/* Account check                                                               */
/* -------------------------------------------------------------------------- */

export type TwilioAccountInfo =
  | {
      ok: true;
      friendlyName: string;
      /** "trial" accounts can only text numbers verified in the console. */
      type: "Trial" | "Full";
      status: string;
      from: string;
      usingMessagingService: boolean;
    }
  | { ok: false; error: string };

/**
 * Read-only call that proves the credentials work before anyone relies on them.
 *
 * The account *type* matters more than it looks: a Twilio trial account
 * silently refuses every number that hasn't been verified in their console, so
 * a Board that hasn't upgraded would send an urgent broadcast and reach nobody.
 */
export async function checkTwilioAccount(): Promise<TwilioAccountInfo> {
  const creds = twilioCredentials();
  if (!creds) {
    return {
      ok: false,
      error:
        "Twilio isn't configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM.",
    };
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}.json`,
      {
        headers: { Authorization: basicAuth(creds) },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      },
    );

    if (res.status === 401) {
      return {
        ok: false,
        error:
          "Twilio rejected those credentials. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN — the token is the one on the console dashboard, not an API key secret.",
      };
    }

    if (!res.ok) {
      return { ok: false, error: `Twilio returned ${res.status}.` };
    }

    const json = (await res.json()) as {
      friendly_name?: string;
      type?: string;
      status?: string;
    };

    return {
      ok: true,
      friendlyName: json.friendly_name ?? creds.accountSid,
      type: json.type === "Trial" ? "Trial" : "Full",
      status: json.status ?? "unknown",
      from: creds.from,
      usingMessagingService: isMessagingService(creds.from),
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Couldn't reach Twilio: ${err.message}`
          : "Couldn't reach Twilio.",
    };
  }
}

export function basicAuth(creds: TwilioCredentials) {
  return `Basic ${Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString("base64")}`;
}

/* -------------------------------------------------------------------------- */
/* Webhook signature                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Verifies that a status callback genuinely came from Twilio.
 *
 * Without this the webhook is an open endpoint that lets anyone rewrite the
 * delivery log — marking a message that never arrived as delivered, which is
 * exactly the record you'd rely on after an urgent notice went out.
 *
 * Twilio's scheme: take the full URL, append every POST parameter sorted by
 * key as `keyvalue`, HMAC-SHA1 it with the auth token, base64 the result.
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null,
  authToken: string,
): boolean {
  if (!signature) return false;

  const payload =
    url +
    Object.keys(params)
      .sort()
      .map((key) => `${key}${params[key]}`)
      .join("");

  const expected = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(payload, "utf8"))
    .digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);

  // Length check first: timingSafeEqual throws on a mismatch.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/* -------------------------------------------------------------------------- */
/* Error codes                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The failures a school Board will actually hit, in words that say what to do.
 *
 * Twilio's own messages are written for developers ("The 'To' number is not a
 * valid phone number") and their codes mean nothing to an executive looking at
 * a failed broadcast at 8am.
 */
const TWILIO_ERRORS: Record<number, string> = {
  20003:
    "Twilio refused the credentials. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.",
  20404:
    "Twilio couldn't find that account or sending number. Check TWILIO_FROM.",
  21211: "That isn't a valid phone number. Check it in Admin → Members.",
  21212:
    "The sending number in TWILIO_FROM isn't valid. Copy it from the Twilio console including the + and country code.",
  21214: "That phone number can't receive text messages.",
  21606:
    "The number in TWILIO_FROM isn't SMS-capable, or isn't owned by this account.",
  21608:
    "This is a Twilio trial account, which can only text numbers verified in the Twilio console. Upgrade the account to reach the whole Board.",
  21610:
    "This person replied STOP to a previous message, so Twilio is blocking further texts to them. They have to text START to opt back in.",
  21612:
    "Twilio can't route to that number from your sending number — usually a country that needs a local sender.",
  21614: "That number isn't a mobile, so it can't receive SMS.",
  30003: "The handset is unreachable — switched off or out of coverage.",
  30004: "The number has blocked messages from this sender.",
  30005: "That number is unknown or no longer in service.",
  30006: "That's a landline, or a network that can't take SMS.",
  30007:
    "The carrier filtered this message as spam. Shorter, plainer wording usually gets through.",
  30008: "The carrier gave no reason for the failure. Worth retrying once.",
  63038: "This Twilio account has hit its daily message limit.",
};

/** Human-readable explanation for a Twilio failure, with the code kept. */
export function explainTwilioError(
  code: number | undefined | null,
  fallback?: string,
): string {
  if (code && TWILIO_ERRORS[code]) return TWILIO_ERRORS[code];
  if (fallback) return code ? `${fallback} (Twilio code ${code})` : fallback;
  return code ? `Twilio error ${code}.` : "Twilio didn't say why this failed.";
}
