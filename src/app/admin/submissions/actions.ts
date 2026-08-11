"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { recordAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { site } from "@/lib/config";
import { generateTempPassword, describeDelivery } from "@/lib/accounts";

export async function setSubmissionStatus(formData: FormData) {
  await requireRole("EXECUTIVE");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !["NEW", "READ", "ARCHIVED"].includes(status)) return;

  await db.submission.update({
    where: { id },
    data: { status: status as "NEW" | "READ" | "ARCHIVED" },
  });

  revalidatePath("/admin/submissions");
  revalidatePath("/admin", "layout");
}

/* -------------------------------------------------------------------------- */

export type ApplicationState = {
  ok?: boolean;
  message?: string;
  /** Shown once so it can be passed on. Never stored in plain text. */
  tempPassword?: string;
  emailed?: boolean;
  emailNote?: string;
  error?: string;
};

/**
 * Turns a join application into a member account in one step.
 *
 * Before this, accepting somebody meant reading their application in the inbox
 * and then retyping their name and email into Admin → Members. Every detail was
 * already sitting in the application, so the retyping only created a chance to
 * get the email wrong — and an account with a mistyped address cannot sign in
 * and cannot be told why.
 *
 * Executives can do this, deliberately, because they are the ones who read the
 * inbox and intake should not queue behind one administrator. The account is
 * always created as MEMBER: promoting anyone beyond that stays with
 * administrators, so this widens who can let people *in* without widening who
 * can hand out privileges.
 */
export async function acceptApplication(
  _prev: ApplicationState,
  formData: FormData,
): Promise<ApplicationState> {
  const actor = await requireRole("EXECUTIVE");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "No application selected." };

  const application = await db.submission.findUnique({ where: { id } });

  if (!application) return { error: "That application no longer exists." };
  if (application.type !== "JOIN") {
    return { error: "That message isn't an application to join." };
  }
  if (application.status === "ACCEPTED") {
    return { error: "This application has already been accepted." };
  }

  const email = application.email.trim().toLowerCase();

  const existing = await db.user.findUnique({
    where: { email },
    select: { name: true },
  });
  if (existing) {
    return {
      error: `${email} already has an account (${existing.name}). Mark this application as read instead.`,
    };
  }

  const tempPassword = generateTempPassword();

  const member = await db.user.create({
    data: {
      email,
      name: application.name,
      // Always a member. Roles above this are an administrator's decision.
      role: "MEMBER",
      status: "INVITED",
      passwordHash: await bcrypt.hash(tempPassword, 12),
      mustChangePassword: true,
      // Carried straight across, because they already told us.
      classYear: application.classYear,
      phone: application.phone,
    },
  });

  const delivery = describeDelivery(
    await sendEmail({
      to: member.email,
      subject: `Welcome to ${site.boardName}`,
      body: [
        `Hello ${member.name},`,
        `You've been accepted onto the ${site.boardName} at ${site.schoolName}. Welcome.`,
        `Email: ${member.email}\nTemporary password: ${tempPassword}`,
        "You'll be asked to choose your own password the first time you sign in.",
        application.interestArea
          ? `You told us you'd like to work on ${application.interestArea.toLowerCase()} — mention that at your first meeting and an editor will find you something.`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      action: { label: "Sign in", url: `${site.url}/login` },
    }),
    member.email,
  );

  await db.submission.update({
    where: { id },
    data: {
      status: "ACCEPTED",
      decidedAt: new Date(),
      decidedByName: actor.name,
    },
  });

  await recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    action: "application.accept",
    entityType: "User",
    entityId: member.id,
    summary:
      `Accepted ${member.name} (${member.email}) onto the Board as Member` +
      (application.interestArea ? `, interested in ${application.interestArea}` : ""),
  });

  revalidatePath("/admin/submissions");
  revalidatePath("/admin/members");
  revalidatePath("/admin", "layout");
  revalidatePath("/portal/directory");

  return {
    ok: true,
    message: `${member.name} is now a member.`,
    tempPassword,
    ...delivery,
  };
}

/* -------------------------------------------------------------------------- */

const declineSchema = z.object({
  id: z.string().min(1),
  note: z.string().trim().max(500).optional(),
});

/**
 * Turns an application down, and tells the applicant.
 *
 * Archiving used to be silent, which meant a student who applied simply never
 * heard anything. That is the sort of thing people remember about a Board, and
 * it costs one email to avoid.
 */
export async function declineApplication(
  _prev: ApplicationState,
  formData: FormData,
): Promise<ApplicationState> {
  const actor = await requireRole("EXECUTIVE");

  const parsed = declineSchema.safeParse({
    id: formData.get("id"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return { error: "That didn't go through — try again." };

  const application = await db.submission.findUnique({
    where: { id: parsed.data.id },
  });

  if (!application) return { error: "That application no longer exists." };
  if (application.type !== "JOIN") {
    return { error: "That message isn't an application to join." };
  }
  if (application.status === "ACCEPTED") {
    return {
      error: "This application was already accepted — it can't be declined now.",
    };
  }

  const delivery = describeDelivery(
    await sendEmail({
      to: application.email,
      subject: `Your application to ${site.boardName}`,
      body: [
        `Hello ${application.name},`,
        `Thank you for applying to the ${site.boardName}. We're not able to offer you a place this intake.`,
        parsed.data.note || "",
        "We take on new members every term, and applying again is genuinely welcome — a good number of our members joined on a second attempt.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    }),
    application.email,
    { fallback: "they have not been told, so you may want to tell them yourself" },
  );

  await db.submission.update({
    where: { id: application.id },
    data: {
      status: "DECLINED",
      decidedAt: new Date(),
      decidedByName: actor.name,
    },
  });

  await recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    action: "application.decline",
    entityType: "Submission",
    entityId: application.id,
    summary: `Declined the application from ${application.name} (${application.email})`,
  });

  revalidatePath("/admin/submissions");
  revalidatePath("/admin", "layout");

  return {
    ok: true,
    message: `${application.name}'s application was declined.`,
    ...delivery,
  };
}
