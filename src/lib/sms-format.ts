/**
 * Phone-number and SMS-billing maths.
 *
 * Split out of `sms.ts` — which is server-only because it holds provider
 * credentials — so the compose screen can run exactly the same segment and
 * cost calculation live as the user types. An estimate that disagrees with the
 * bill is worse than no estimate.
 */

import { sms as smsConfig } from "./config";

/* -------------------------------------------------------------------------- */
/* Phone numbers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Normalises a number to E.164 (`+233244123456`), which is what every provider
 * wants and what we store on the delivery record.
 *
 * Members type numbers the way they say them — `024 412 3456`, `+233 24 412
 * 3456`, `00233244123456`. All three are the same person. Getting this wrong
 * means a silent non-delivery to someone who needed an urgent message, so the
 * parsing is deliberately forgiving about spacing and strict about the result.
 *
 * Returns null if it can't produce something plausible.
 */
export function normalisePhone(
  raw: string | null | undefined,
  defaultCountryCode: string = smsConfig.defaultCountryCode,
  nationalLength: number = smsConfig.nationalNumberLength,
): string | null {
  if (!raw) return null;

  // Keep digits and a single leading +.
  let s = raw.trim().replace(/[^\d+]/g, "");
  if (!s) return null;

  // 00 is the international prefix in most of the world.
  if (s.startsWith("00")) s = `+${s.slice(2)}`;

  // A + anywhere other than the front is a typo, not a country code.
  if (s.indexOf("+") > 0) s = s.replace(/\+/g, "");

  if (!s.startsWith("+")) {
    const cc = defaultCountryCode.replace(/[^\d]/g, "");
    if (!cc) return null;

    // National format: a single leading 0 is the trunk prefix and is dropped
    // when the country code goes on.
    let national = s.replace(/^0+/, "");

    // A number typed with the country code but no "+" ("233 24 412 3456") is
    // already complete. Prefixing the country code again yields something that
    // still looks like a phone number and still passes the E.164 length check,
    // so nothing complains — the message is simply accepted by the provider,
    // billed, and never arrives.
    //
    // The prefix alone can't decide this: strip the trunk zero from Ghana's
    // 023x range and you also get a number starting "233". Length separates
    // them — an international-form string is countryCode + nationalLength
    // digits, a national one is nationalLength.
    if (national.length === cc.length + nationalLength) {
      if (national.startsWith(cc)) national = national.slice(cc.length);
    }

    // Here we know where the country code ends, so we can check the subscriber
    // part properly. Nowhere issues mobile numbers shorter than six digits, so
    // anything less is a typo — and a typo that reaches the provider costs
    // money and silently fails to reach the person who needed the message.
    if (national.length < 6) return null;

    s = `+${cc}${national}`;
  } else {
    // The same duplication in international form: "+233 0244123456", where the
    // trunk zero was kept when the country code went on. That zero is never
    // part of the dialable number.
    const cc = defaultCountryCode.replace(/[^\d]/g, "");
    const rest = s.slice(1);
    if (
      cc &&
      rest.startsWith(`${cc}0`) &&
      rest.length === cc.length + 1 + nationalLength
    ) {
      s = `+${cc}${rest.slice(cc.length + 1)}`;
    }
  }

  const digits = s.slice(1);

  // E.164: 15 digits maximum. The floor is 8 because that is the shortest a
  // real country-code-plus-subscriber number gets.
  if (digits.length < 8 || digits.length > 15) return null;
  if (!/^\d+$/.test(digits)) return null;

  return `+${digits}`;
}

/** Formats for display without exposing more than needed in a log. */
export function maskPhone(e164: string): string {
  if (e164.length < 6) return e164;
  return `${e164.slice(0, e164.length - 5)}•••${e164.slice(-2)}`;
}

/* -------------------------------------------------------------------------- */
/* Segments and cost                                                           */
/* -------------------------------------------------------------------------- */

// Characters carriers can send in the cheap 7-bit encoding. Anything outside
// this set forces the whole message into 16-bit UCS-2, which cuts the per-
// segment allowance from 160 characters to 70.
const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

// These cost two characters each in GSM-7 (they use an escape sequence).
const GSM7_EXTENDED = "^{}\\[~]|€";

export type SegmentInfo = {
  encoding: "GSM-7" | "UCS-2";
  /** Billable characters — extended GSM characters count double. */
  characters: number;
  segments: number;
  /** How many more characters fit before another segment is billed. */
  remaining: number;
};

export function countSegments(body: string): SegmentInfo {
  const chars = [...body];

  const isGsm7 = chars.every(
    (c) => GSM7.includes(c) || GSM7_EXTENDED.includes(c),
  );

  if (isGsm7) {
    const length = chars.reduce(
      (n, c) => n + (GSM7_EXTENDED.includes(c) ? 2 : 1),
      0,
    );
    // Concatenated messages spend 7 bits per segment on a joining header.
    const perSegment = length <= 160 ? 160 : 153;
    const segments = length === 0 ? 0 : Math.ceil(length / perSegment);
    return {
      encoding: "GSM-7",
      characters: length,
      segments,
      remaining: Math.max(0, segments * perSegment - length),
    };
  }

  // UCS-2 counts UTF-16 code units, so an emoji costs two.
  const length = body.length;
  const perSegment = length <= 70 ? 70 : 67;
  const segments = length === 0 ? 0 : Math.ceil(length / perSegment);

  return {
    encoding: "UCS-2",
    characters: length,
    segments,
    remaining: Math.max(0, segments * perSegment - length),
  };
}

/** Total cost in minor units (pesewas / cents), so no floating-point drift. */
export function estimateCost(segments: number, recipients: number): number {
  return Math.round(segments * recipients * smsConfig.costPerSegmentMinor);
}

export function formatMoney(minorUnits: number): string {
  const major = (minorUnits / 100).toFixed(2);
  return `${smsConfig.currencySymbol}${major}`;
}
