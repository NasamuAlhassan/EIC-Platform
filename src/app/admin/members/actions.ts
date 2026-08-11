"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { recordAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { site } from "@/lib/config";
import { ROLE_LABEL } from "@/lib/rbac";
import { generateTempPassword, describeDelivery } from "@/lib/accounts";

export type MemberState = {
  ok?: boolean;
  message?: string;
  /** Shown once, so an admin can pass it on. Never stored in plain text. */
  tempPassword?: string;
  /**
   * Whether the password actually reached them.
   *
   * Reported rather than assumed: a provider will refuse to send from an
   * unverified domain, and an administrator who believes the email went out
   * leaves a new member with no way in and no idea why.
   */
  emailed?: boolean;
  emailNote?: string;
  errors?: Record<string, string>;
};


const ROLES = ["MEMBER", "EDITOR", "EXECUTIVE", "ADMIN"] as const;

const createSchema = z.object({
  name: z.string().trim().min(2, "Please give a full name.").max(120),
  email: z.string().trim().toLowerCase().email("That isn't a valid email."),
  role: z.enum(ROLES),
  position: z.string().trim().max(120).optional(),
  classYear: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(40).optional(),
  isExecutive: z.boolean(),
});


function toErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) errors[String(issue.path[0])] ??= issue.message;
  return errors;
}

export async function createMember(
  _prev: MemberState,
  formData: FormData,
): Promise<MemberState> {
  const admin = await requireRole("ADMIN");

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    position: formData.get("position"),
    classYear: formData.get("classYear"),
    phone: formData.get("phone"),
    isExecutive: formData.get("isExecutive") === "on",
  });

  if (!parsed.success) return { errors: toErrors(parsed.error) };

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existing) {
    return { errors: { email: "Someone already has an account with that email." } };
  }

  const tempPassword = generateTempPassword();

  const created = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      position: parsed.data.position || null,
      classYear: parsed.data.classYear || null,
      phone: parsed.data.phone || null,
      isExecutive: parsed.data.isExecutive,
      passwordHash: await bcrypt.hash(tempPassword, 12),
      // They must replace the admin-chosen password on first sign-in.
      mustChangePassword: true,
      status: "INVITED",
    },
  });

  await recordAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "user.create",
    entityType: "User",
    entityId: created.id,
    summary: `Created ${created.name} (${created.email}) as ${ROLE_LABEL[created.role]}`,
  });

  const delivery = describeDelivery(
    await sendEmail({
      to: created.email,
    subject: `Your ${site.boardName} account`,
    body: [
      `Hello ${created.name},`,
      `An account has been created for you on the ${site.boardName} members' portal.`,
      `Email: ${created.email}\nTemporary password: ${tempPassword}`,
      "You'll be asked to choose your own password after signing in for the first time.",
    ].join("\n\n"),
      action: { label: "Sign in", url: `${site.url}/login` },
    }),
    created.email,
  );

  revalidatePath("/admin/members");
  revalidatePath("/portal/directory");
  revalidatePath("/about");

  return {
    ok: true,
    message: `${created.name} has been added.`,
    tempPassword,
    ...delivery,
  };
}

/* -------------------------------------------------------------------------- */

const updateSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(ROLES),
  status: z.enum(["INVITED", "ACTIVE", "ARCHIVED"]),
  position: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  isExecutive: z.boolean(),
  execOrder: z.coerce.number().int().min(0).max(999),
});

export async function updateMember(formData: FormData) {
  const admin = await requireRole("ADMIN");

  const parsed = updateSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
    status: formData.get("status"),
    position: formData.get("position"),
    phone: formData.get("phone"),
    isExecutive: formData.get("isExecutive") === "on",
    execOrder: formData.get("execOrder") ?? 0,
  });
  if (!parsed.success) return;

  const before = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, name: true, role: true, status: true },
  });
  if (!before) return;

  // Never let the last administrator demote or archive themselves out of the
  // system — that would lock everyone out of member management for good.
  const losingAdmin =
    before.role === "ADMIN" &&
    (parsed.data.role !== "ADMIN" || parsed.data.status === "ARCHIVED");

  if (losingAdmin) {
    const otherAdmins = await db.user.count({
      where: {
        role: "ADMIN",
        status: { not: "ARCHIVED" },
        id: { not: before.id },
      },
    });
    if (otherAdmins === 0) return;
  }

  await db.user.update({
    where: { id: before.id },
    data: {
      role: parsed.data.role,
      status: parsed.data.status,
      position: parsed.data.position || null,
      phone: parsed.data.phone || null,
      isExecutive: parsed.data.isExecutive,
      execOrder: parsed.data.execOrder,
    },
  });

  if (before.role !== parsed.data.role || before.status !== parsed.data.status) {
    await recordAudit({
      actorId: admin.id,
      actorName: admin.name,
      action: "user.update",
      entityType: "User",
      entityId: before.id,
      summary:
        `${before.name}: ` +
        [
          before.role !== parsed.data.role
            ? `role ${ROLE_LABEL[before.role]} → ${ROLE_LABEL[parsed.data.role]}`
            : null,
          before.status !== parsed.data.status
            ? `status ${before.status} → ${parsed.data.status}`
            : null,
        ]
          .filter(Boolean)
          .join(", "),
    });
  }

  revalidatePath("/admin/members");
  revalidatePath("/portal/directory");
  revalidatePath("/about");
}

/* -------------------------------------------------------------------------- */

export async function resetMemberPassword(
  _prev: MemberState,
  formData: FormData,
): Promise<MemberState> {
  const admin = await requireRole("ADMIN");
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { errors: { form: "No member selected." } };

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!target) return { errors: { form: "That member no longer exists." } };

  const tempPassword = generateTempPassword();

  await db.user.update({
    where: { id: target.id },
    data: {
      passwordHash: await bcrypt.hash(tempPassword, 12),
      mustChangePassword: true,
    },
  });

  await recordAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "user.password_reset",
    entityType: "User",
    entityId: target.id,
    summary: `Reset the password for ${target.name}`,
  });

  const resetDelivery = describeDelivery(
    await sendEmail({
      to: target.email,
    subject: `Your ${site.boardName} password was reset`,
    body: [
      `Hello ${target.name},`,
      "An administrator has reset your portal password.",
      `Temporary password: ${tempPassword}`,
      "Please sign in and choose a new one.",
    ].join("\n\n"),
      action: { label: "Sign in", url: `${site.url}/login` },
    }),
    target.email,
  );

  revalidatePath("/admin/members");

  return {
    ok: true,
    message: `A new password has been set for ${target.name}.`,
    tempPassword,
    ...resetDelivery,
  };
}
