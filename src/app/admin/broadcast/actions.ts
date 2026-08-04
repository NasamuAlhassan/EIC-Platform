"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Role } from "@prisma/client";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { recordAudit } from "@/lib/audit";
import { sms as smsConfig } from "@/lib/config";
import {
  countSegments,
  estimateCost,
  normalisePhone,
  sendSms,
  smsProvider,
  smsProviderLabel,
} from "@/lib/sms";
import { checkTwilioAccount, type TwilioAccountInfo } from "@/lib/twilio";

export type BroadcastState = {
  errors?: Record<string, string>;
};

const ROLES = ["MEMBER", "EDITOR", "EXECUTIVE", "ADMIN"] as const;

/** 1,000 characters is ~7 segments — well past what an urgent notice needs. */
const schema = z.object({
  body: z
    .string()
    .trim()
    .min(5, "Write the message.")
    .max(1000, "That's too long for an SMS. Keep it under 1,000 characters."),
  audienceRoles: z.array(z.enum(ROLES)),
  confirm: z.literal("SEND", {
    errorMap: () => ({ message: "Tick the box to confirm before sending." }),
  }),
});

/**
 * Works out exactly who would receive a broadcast.
 *
 * Shared by the preview and the send so the number an executive approves is
 * the number that actually gets messaged.
 */
export async function resolveAudience(audienceRoles: Role[]) {
  const people = await db.user.findMany({
    where: {
      status: { not: "ARCHIVED" },
      ...(audienceRoles.length > 0 && audienceRoles.length < ROLES.length
        ? { role: { in: audienceRoles } }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      smsNotifications: true,
    },
  });

  const reachable: { id: string; name: string; phone: string }[] = [];
  const skipped: { id: string; name: string; reason: string }[] = [];

  for (const p of people) {
    if (!p.smsNotifications) {
      skipped.push({ id: p.id, name: p.name, reason: "Has turned SMS off" });
      continue;
    }
    const phone = normalisePhone(p.phone);
    if (!phone) {
      skipped.push({
        id: p.id,
        name: p.name,
        reason: p.phone ? "Phone number isn't usable" : "No phone number on file",
      });
      continue;
    }
    reachable.push({ id: p.id, name: p.name, phone });
  }

  return { reachable, skipped, total: people.length };
}

export async function sendBroadcast(
  _prev: BroadcastState,
  formData: FormData,
): Promise<BroadcastState> {
  const user = await requireRole("EXECUTIVE");

  const parsed = schema.safeParse({
    body: formData.get("body"),
    audienceRoles: formData.getAll("audienceRoles").map(String),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }

  const audienceRoles =
    parsed.data.audienceRoles.length === ROLES.length
      ? []
      : (parsed.data.audienceRoles as Role[]);

  const { reachable, skipped } = await resolveAudience(audienceRoles);

  if (reachable.length === 0) {
    return {
      errors: {
        form:
          "Nobody in that audience has a usable phone number, so there is no one to send to. " +
          "Add phone numbers in Admin → Members, or ask members to add theirs in their profile.",
      },
    };
  }

  const fullBody = `${smsConfig.prefix}${parsed.data.body}`;
  const { segments } = countSegments(fullBody);

  // Written before a single message goes out. If the process dies mid-send the
  // record still shows what was attempted and to whom.
  const broadcast = await db.broadcast.create({
    data: {
      channel: "SMS",
      status: "SENDING",
      body: fullBody,
      audienceRoles,
      segments,
      recipientCount: reachable.length,
      skippedCount: skipped.length,
      estimatedCost: estimateCost(segments, reachable.length),
      currency: smsConfig.currency,
      senderId: user.id,
      senderName: user.name,
      recipients: {
        create: [
          ...reachable.map((r) => ({
            userId: r.id,
            name: r.name,
            phone: r.phone,
            status: "QUEUED" as const,
          })),
          ...skipped.map((s) => ({
            userId: s.id,
            name: s.name,
            phone: "—",
            status: "SKIPPED" as const,
            error: s.reason,
          })),
        ],
      },
    },
    include: { recipients: true },
  });

  const results = await sendSms(
    reachable.map((r) => ({ to: r.phone, body: fullBody })),
  );

  const byPhone = new Map(results.map((r) => [r.to, r]));
  const now = new Date();
  let sentCount = 0;
  let failedCount = 0;

  await Promise.all(
    broadcast.recipients
      .filter((r) => r.status === "QUEUED")
      .map((row) => {
        const result = byPhone.get(row.phone);
        const ok = result?.ok ?? false;
        if (ok) sentCount += 1;
        else failedCount += 1;

        return db.broadcastRecipient.update({
          where: { id: row.id },
          data: {
            status: ok ? "SENT" : "FAILED",
            providerMessageId: result?.providerMessageId ?? null,
            error: ok ? null : (result?.error ?? "No response from provider"),
            sentAt: ok ? now : null,
          },
        });
      }),
  );

  await db.broadcast.update({
    where: { id: broadcast.id },
    data: {
      status:
        failedCount === 0 ? "SENT" : sentCount === 0 ? "FAILED" : "PARTIAL",
      sentCount,
      failedCount,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "broadcast.send",
    entityType: "Broadcast",
    entityId: broadcast.id,
    summary:
      `Sent an SMS broadcast to ${sentCount} of ${reachable.length} members ` +
      `via ${smsProviderLabel()} (${segments} segment${segments === 1 ? "" : "s"} each)` +
      (failedCount > 0 ? `, ${failedCount} failed` : ""),
  });

  revalidatePath("/admin/broadcast");
  revalidatePath("/admin");

  redirect(`/admin/broadcast/${broadcast.id}`);
}

/* -------------------------------------------------------------------------- */
/* Setup checks                                                                */
/* -------------------------------------------------------------------------- */

/** Proves the credentials work, without sending anything. */
export async function testConnection(): Promise<TwilioAccountInfo> {
  await requireRole("EXECUTIVE");

  if (smsProvider() !== "twilio") {
    return {
      ok: false,
      error:
        "The connection check is Twilio-specific, and Twilio isn't the configured provider.",
    };
  }

  return checkTwilioAccount();
}

export type TestSendState = {
  ok?: boolean;
  message?: string;
  error?: string;
};

/**
 * Sends one message, to the signed-in person's own number and nowhere else.
 *
 * Setting up an SMS provider has several ways to look fine and still not
 * deliver — an unverified trial number, a sender ID the country rejects, a
 * number typed in the wrong format. Discovering that during a real emergency is
 * the worst possible time, so this exists to find out beforehand at the cost of
 * one message.
 */
export async function sendTestMessage(
  _prev: TestSendState,
  _formData: FormData,
): Promise<TestSendState> {
  const user = await requireRole("EXECUTIVE");

  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { phone: true, name: true },
  });

  const phone = normalisePhone(row?.phone);
  if (!phone) {
    return {
      error:
        "Add your own mobile number in Portal → My profile first — the test only ever goes to you.",
    };
  }

  const body = `${smsConfig.prefix}Test message. If you can read this, urgent SMS is working.`;

  const [result] = await sendSms([{ to: phone, body }]);

  if (!result?.ok) {
    return {
      error: result?.error ?? "The provider didn't accept the message.",
    };
  }

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "broadcast.test",
    entityType: "Broadcast",
    summary: `Sent an SMS test message to their own number via ${smsProviderLabel()}`,
  });

  return {
    ok: true,
    message:
      smsProvider() === "none"
        ? "No provider is connected, so the message was written to the server log instead of being sent."
        : `Sent to your number. If it doesn't arrive within a minute or two, the delivery failed silently — check the Twilio console.`,
  };
}
