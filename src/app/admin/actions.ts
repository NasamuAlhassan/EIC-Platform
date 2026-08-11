"use server";

import { requireRole } from "@/lib/portal";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { emailFrom, site } from "@/lib/config";
import { describeDelivery } from "@/lib/accounts";

export type TestEmailState = {
  ok?: boolean;
  sentTo?: string;
  from?: string;
  note?: string;
  error?: string;
};

/**
 * Sends a test email to whoever asked for it.
 *
 * Setting up a sending domain is a loop: change a DNS record, wait, try again.
 * Without this the only way to try again was to create a throwaway member
 * account, which leaves real rows behind and is a poor thing to do repeatedly on
 * a live site.
 *
 * It deliberately goes only to the signed-in administrator's own address. A box
 * that can email anyone is a box worth abusing, and the question being answered
 * here — "does mail from this domain arrive?" — only needs one recipient.
 */
export async function sendTestEmail(
  _prev: TestEmailState,
  _formData: FormData,
): Promise<TestEmailState> {
  const actor = await requireRole("EXECUTIVE");

  if (!isEmailConfigured()) {
    return {
      error:
        "No email provider is configured yet, so there is nothing to test. Set RESEND_API_KEY and redeploy.",
    };
  }

  const result = await sendEmail({
    to: actor.email,
    subject: `Test from ${site.boardName}`,
    body: [
      `Hello ${actor.name},`,
      "If you are reading this, mail from the Board is arriving.",
      `Sent from: ${emailFrom}`,
      "Two things worth checking: that this landed in your inbox rather than your spam folder, and that replying to it reaches the Board.",
    ].join("\n\n"),
    action: { label: "Open the portal", url: `${site.url}/portal` },
  });

  const delivery = describeDelivery(result, actor.email, {
    fallback: "check the sending domain in your email provider",
  });

  if (!result.ok) {
    return { error: delivery.emailNote, from: emailFrom };
  }

  return {
    ok: true,
    sentTo: actor.email,
    from: emailFrom,
    note: delivery.emailNote,
  };
}
