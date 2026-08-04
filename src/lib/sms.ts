import "server-only";

import { countSegments } from "./sms-format";
import {
  basicAuth,
  explainTwilioError,
  isMessagingService,
  twilioCredentials,
} from "./twilio";
import { site } from "./config";

// Re-exported so callers have one import for everything SMS.
export {
  countSegments,
  estimateCost,
  formatMoney,
  maskPhone,
  normalisePhone,
  type SegmentInfo,
} from "./sms-format";

/**
 * SMS, behind one interface.
 *
 * Providers, in the order they're checked:
 *
 *  1. `SMS_PROVIDER=twilio`  — Twilio. Works everywhere; the safe default.
 *  2. `SMS_PROVIDER=http`    — a generic JSON POST, for a local aggregator
 *                              (Africa's Talking, Hubtel, Arkesel, Termii,
 *                              MSG91 …). Local aggregators are usually far
 *                              cheaper and deliver better than Twilio inside
 *                              their own country.
 *  3. nothing configured     — printed to the server console.
 *
 * The console fallback exists so the whole broadcast flow — audience, cost
 * preview, delivery log — is testable before anyone signs up for a provider,
 * and so nothing ever silently pretends to have sent a message.
 *
 * Two things about SMS that shape everything below:
 *
 *  - It costs money per message, per segment. A 200-character message is two
 *    messages. One accented character can flip the whole thing to a 70-char
 *    encoding and triple the bill. So segment counting is exact, not a guess.
 *  - It cannot be recalled. Everything is recorded before and after sending.
 */

export type SmsMessage = { to: string; body: string };

export type SmsResult = {
  to: string;
  ok: boolean;
  providerMessageId?: string;
  error?: string;
};

/* -------------------------------------------------------------------------- */
/* Provider detection                                                          */
/* -------------------------------------------------------------------------- */

export type SmsProvider = "twilio" | "http" | "none";

export function smsProvider(): SmsProvider {
  const explicit = process.env.SMS_PROVIDER?.toLowerCase();

  if (explicit === "twilio" || (!explicit && process.env.TWILIO_ACCOUNT_SID)) {
    return process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM
      ? "twilio"
      : "none";
  }

  if (explicit === "http" || (!explicit && process.env.SMS_HTTP_URL)) {
    return process.env.SMS_HTTP_URL ? "http" : "none";
  }

  return "none";
}

export function isSmsConfigured() {
  return smsProvider() !== "none";
}

/** Human-readable provider name for the admin UI. */
export function smsProviderLabel(): string {
  switch (smsProvider()) {
    case "twilio":
      return "Twilio";
    case "http":
      return process.env.SMS_HTTP_LABEL ?? "Custom SMS gateway";
    default:
      return "Not configured";
  }
}

/* -------------------------------------------------------------------------- */
/* Sending                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Sends one message per recipient, a few at a time.
 *
 * Deliberately not fire-and-forget: the caller needs a per-recipient outcome to
 * write into the delivery log, so an executive can tell who actually got it and
 * chase the ones who didn't.
 */
export async function sendSms(messages: SmsMessage[]): Promise<SmsResult[]> {
  if (messages.length === 0) return [];

  const provider = smsProvider();

  if (provider === "none") {
    console.info(
      [
        "",
        "──────────── SMS (not sent — no provider configured) ────────────",
        `Recipients: ${messages.length}`,
        `Segments:   ${countSegments(messages[0]?.body ?? "").segments} each`,
        "",
        messages[0]?.body ?? "",
        "",
        `To: ${messages.map((m) => m.to).join(", ")}`,
        "─────────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return messages.map((m) => ({
      to: m.to,
      ok: true,
      providerMessageId: "simulated",
    }));
  }

  const send = provider === "twilio" ? sendViaTwilio : sendViaHttp;

  // Providers rate-limit; a whole Board at once would trip it. Small batches,
  // sequential between batches.
  const CONCURRENCY = 5;
  const results: SmsResult[] = [];

  for (let i = 0; i < messages.length; i += CONCURRENCY) {
    const batch = messages.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(
      batch.map(async (m) => {
        try {
          return await send(m);
        } catch (err) {
          return {
            to: m.to,
            ok: false,
            error: err instanceof Error ? err.message : "Unknown send error",
          };
        }
      }),
    );
    results.push(...settled);
  }

  return results;
}

async function sendViaTwilio(message: SmsMessage): Promise<SmsResult> {
  const creds = twilioCredentials();
  if (!creds) {
    return { to: message.to, ok: false, error: "Twilio isn't configured." };
  }

  const body = new URLSearchParams({
    To: message.to,
    Body: message.body,
    ...(isMessagingService(creds.from)
      ? { MessagingServiceSid: creds.from }
      : { From: creds.from }),
  });

  // Ask Twilio to call us back as the message moves towards the handset, so the
  // delivery log can show what actually arrived rather than what was accepted.
  // Skipped for local URLs, which Twilio cannot reach — it would just log
  // callback failures against every message.
  const callback = statusCallbackUrl();
  if (callback) body.set("StatusCallback", callback);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: basicAuth(creds),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(20_000),
    },
  );

  const json = (await res.json().catch(() => ({}))) as {
    sid?: string;
    message?: string;
    code?: number;
  };

  if (!res.ok) {
    return {
      to: message.to,
      ok: false,
      error: explainTwilioError(json.code, json.message),
    };
  }

  return { to: message.to, ok: true, providerMessageId: json.sid };
}

/**
 * Where Twilio should post delivery updates.
 *
 * Returns null for localhost and other unreachable hosts — a callback Twilio
 * can't reach is worse than none, because it fills their error log and tells us
 * nothing.
 */
export function statusCallbackUrl(): string | null {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? site.url).replace(/\/$/, "");

  if (
    !base.startsWith("https://") ||
    /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(base)
  ) {
    return null;
  }

  return `${base}/api/sms/status`;
}

/**
 * Generic JSON POST, for a local aggregator.
 *
 * Sends `{"to": "+233…", "message": "…"}` and treats any 2xx as success. Field
 * names are configurable because every aggregator picks different ones.
 */
async function sendViaHttp(message: SmsMessage): Promise<SmsResult> {
  const url = process.env.SMS_HTTP_URL!;
  const toField = process.env.SMS_HTTP_TO_FIELD ?? "to";
  const bodyField = process.env.SMS_HTTP_MESSAGE_FIELD ?? "message";

  const payload: Record<string, unknown> = {
    [toField]: message.to,
    [bodyField]: message.body,
  };

  // Anything else the gateway needs — sender id, api key in the body, etc.
  if (process.env.SMS_HTTP_EXTRA_JSON) {
    try {
      Object.assign(payload, JSON.parse(process.env.SMS_HTTP_EXTRA_JSON));
    } catch {
      return {
        to: message.to,
        ok: false,
        error: "SMS_HTTP_EXTRA_JSON is not valid JSON — fix it in the environment.",
      };
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (process.env.SMS_HTTP_AUTH_HEADER) {
    headers.Authorization = process.env.SMS_HTTP_AUTH_HEADER;
  }
  if (process.env.SMS_HTTP_API_KEY_HEADER && process.env.SMS_HTTP_API_KEY) {
    headers[process.env.SMS_HTTP_API_KEY_HEADER] = process.env.SMS_HTTP_API_KEY;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    return {
      to: message.to,
      ok: false,
      error: `Gateway returned ${res.status}${text ? `: ${text.slice(0, 160)}` : ""}`,
    };
  }

  let providerMessageId: string | undefined;
  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    const idField = process.env.SMS_HTTP_ID_FIELD ?? "messageId";
    const value = json[idField];
    if (typeof value === "string" || typeof value === "number") {
      providerMessageId = String(value);
    }
  } catch {
    // Plenty of gateways reply with plain text. Not an error.
  }

  return { to: message.to, ok: true, providerMessageId };
}
