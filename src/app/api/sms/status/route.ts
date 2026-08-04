import { NextResponse } from "next/server";
import type { DeliveryStatus } from "@prisma/client";

import { db } from "@/lib/db";
import {
  explainTwilioError,
  twilioCredentials,
  verifyTwilioSignature,
} from "@/lib/twilio";

/**
 * Twilio delivery receipts.
 *
 * Twilio POSTs here each time a message changes state. Without this, a message
 * is only ever recorded as "handed to the provider", which is not the same as
 * the person having received it — and after an urgent notice, that difference
 * is the whole point of keeping a log.
 *
 * Every request is signature-checked. An unauthenticated endpoint that writes
 * to the delivery log would let anyone mark an undelivered message as
 * delivered, which is worse than having no receipts at all.
 */

// Twilio's own vocabulary, mapped onto ours.
const STATUS_MAP: Record<string, DeliveryStatus> = {
  queued: "QUEUED",
  accepted: "QUEUED",
  scheduled: "QUEUED",
  sending: "SENT",
  sent: "SENT",
  delivered: "DELIVERED",
  undelivered: "UNDELIVERED",
  failed: "FAILED",
};

/** Never move a row backwards — callbacks can arrive out of order. */
const RANK: Record<DeliveryStatus, number> = {
  QUEUED: 0,
  SENT: 1,
  DELIVERED: 2,
  UNDELIVERED: 2,
  FAILED: 2,
  SKIPPED: 3,
};

/**
 * Twilio treats any 2xx as "received, stop retrying".
 *
 * Note this must not be a 204 with a body — the Response constructor rejects
 * that outright, which would turn every acknowledgement into a 500 and make
 * Twilio retry each callback until it gave up.
 */
function ack() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  const creds = twilioCredentials();
  if (!creds) {
    // Nothing is configured, so nothing legitimate can be arriving here.
    return new NextResponse("Not configured", { status: 404 });
  }

  const raw = await request.text();
  const params: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(raw)) params[key] = value;

  // Twilio signs the exact URL it was given, so reconstruct it rather than
  // trusting the proxied host header.
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const url = configured
    ? `${configured}/api/sms/status`
    : new URL(request.url).toString();

  const valid = verifyTwilioSignature(
    url,
    params,
    request.headers.get("x-twilio-signature"),
    creds.authToken,
  );

  if (!valid) {
    console.warn("[sms] rejected a status callback with a bad signature");
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const sid = params.MessageSid ?? params.SmsSid;
  const rawStatus = (params.MessageStatus ?? params.SmsStatus ?? "").toLowerCase();
  const next = STATUS_MAP[rawStatus];

  if (!sid || !next) {
    // Acknowledged so Twilio stops retrying something we can't use.
    return ack();
  }

  const recipient = await db.broadcastRecipient.findFirst({
    where: { providerMessageId: sid },
    select: { id: true, status: true, broadcastId: true },
  });

  if (!recipient) return ack();

  // Out-of-order callback for a state we've already moved past.
  if (RANK[next] < RANK[recipient.status]) {
    return ack();
  }

  const errorCode = params.ErrorCode ? Number(params.ErrorCode) : null;
  const failed = next === "FAILED" || next === "UNDELIVERED";

  await db.broadcastRecipient.update({
    where: { id: recipient.id },
    data: {
      status: next,
      deliveredAt: next === "DELIVERED" ? new Date() : null,
      error: failed
        ? explainTwilioError(
            errorCode,
            next === "UNDELIVERED"
              ? "The carrier couldn't deliver this."
              : undefined,
          )
        : null,
    },
  });

  await refreshBroadcastCounts(recipient.broadcastId);

  return ack();
}

/**
 * Recomputes the broadcast's totals from its rows.
 *
 * Recounting is cheaper to reason about than incrementing: callbacks retry, and
 * a retried increment would quietly inflate the numbers an executive relies on.
 */
async function refreshBroadcastCounts(broadcastId: string) {
  const grouped = await db.broadcastRecipient.groupBy({
    by: ["status"],
    where: { broadcastId },
    _count: true,
  });

  const count = (s: DeliveryStatus) =>
    grouped.find((g) => g.status === s)?._count ?? 0;

  const delivered = count("DELIVERED");
  const sent = delivered + count("SENT") + count("QUEUED");
  const failed = count("FAILED") + count("UNDELIVERED");

  await db.broadcast.update({
    where: { id: broadcastId },
    data: {
      deliveredCount: delivered,
      sentCount: sent,
      failedCount: failed,
      status: failed === 0 ? "SENT" : sent === 0 ? "FAILED" : "PARTIAL",
    },
  });
}
