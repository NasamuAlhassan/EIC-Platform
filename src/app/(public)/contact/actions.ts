"use server";

import { z } from "zod";

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { site } from "@/lib/config";

export type SubmissionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
};

const baseSchema = {
  name: z.string().trim().min(2, "Please give your full name.").max(120),
  email: z.string().trim().email("That doesn't look like an email address."),
  message: z
    .string()
    .trim()
    .min(10, "Please write a little more so we can help.")
    .max(4000),
  // Honeypot: real people never fill this in, bots usually do.
  website: z.string().max(0).optional(),
};

const contactSchema = z.object({
  ...baseSchema,
  subject: z.string().trim().max(160).optional(),
});

const joinSchema = z.object({
  ...baseSchema,
  phone: z.string().trim().max(40).optional(),
  classYear: z.string().trim().max(80).optional(),
  interestArea: z.string().trim().max(120).optional(),
});

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

export async function submitContact(
  _prev: SubmissionState,
  formData: FormData,
): Promise<SubmissionState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  // Silently accept honeypot hits — telling a bot it failed just teaches it.
  if (parsed.data.website) return { ok: true, message: "Thanks — message sent." };

  const submission = await db.submission.create({
    data: {
      type: "CONTACT",
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject || null,
      message: parsed.data.message,
    },
  });

  await notifyExecutives(
    `New message: ${parsed.data.subject || "no subject"}`,
    `${parsed.data.name} (${parsed.data.email}) wrote:\n\n${parsed.data.message}`,
    submission.id,
  );

  return {
    ok: true,
    message:
      "Thanks — your message is with us. We usually reply within a few days.",
  };
}

export async function submitJoin(
  _prev: SubmissionState,
  formData: FormData,
): Promise<SubmissionState> {
  const parsed = joinSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    classYear: formData.get("classYear"),
    interestArea: formData.get("interestArea"),
    message: formData.get("message"),
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  if (parsed.data.website) {
    return { ok: true, message: "Thanks — application sent." };
  }

  const submission = await db.submission.create({
    data: {
      type: "JOIN",
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      classYear: parsed.data.classYear || null,
      interestArea: parsed.data.interestArea || null,
      message: parsed.data.message,
    },
  });

  await notifyExecutives(
    `Application to join: ${parsed.data.name}`,
    [
      `${parsed.data.name} (${parsed.data.email}) has applied to join the Board.`,
      parsed.data.classYear ? `Class: ${parsed.data.classYear}` : "",
      parsed.data.interestArea
        ? `Interested in: ${parsed.data.interestArea}`
        : "",
      parsed.data.phone ? `Phone: ${parsed.data.phone}` : "",
      "",
      parsed.data.message,
    ]
      .filter(Boolean)
      .join("\n"),
    submission.id,
  );

  return {
    ok: true,
    message:
      "Application received. An executive will get back to you about the next intake.",
  };
}

/** Email everyone who can act on an inbound message. Never throws. */
async function notifyExecutives(
  subject: string,
  body: string,
  submissionId: string,
) {
  try {
    const recipients = await db.user.findMany({
      where: {
        status: "ACTIVE",
        emailNotifications: true,
        role: { in: ["EXECUTIVE", "ADMIN"] },
      },
      select: { email: true },
    });

    if (recipients.length === 0) return;

    await sendEmail({
      to: recipients.map((r) => r.email),
      subject,
      body,
      action: {
        label: "Open in the portal",
        url: `${site.url}/admin/submissions#${submissionId}`,
      },
    });
  } catch (err) {
    // The submission is already saved; a failed notification must not lose it.
    console.error("[contact] notification failed", err);
  }
}
