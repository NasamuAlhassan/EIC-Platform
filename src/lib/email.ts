import "server-only";

import { emailFrom, site } from "./config";

/**
 * Email, behind one interface.
 *
 *  - With RESEND_API_KEY set -> sent via Resend.
 *  - Without it              -> printed to the server console.
 *
 * The console fallback is deliberate: the whole app stays usable end to end
 * before anyone has signed up for an email provider, and nothing silently
 * pretends to have delivered mail.
 *
 * Phase 3 (WhatsApp / SMS) plugs in here as additional channels, chosen per
 * user from their notification preferences.
 */

export type EmailMessage = {
  to: string | string[];
  subject: string;
  /** Plain text. Converted to simple HTML for the actual send. */
  body: string;
  /** Optional call-to-action button. */
  action?: { label: string; url: string };
};

export type SendResult = {
  ok: boolean;
  delivered: number;
  error?: string;
  /** True when nothing actually left the building. */
  simulated: boolean;
};

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

function renderHtml(msg: EmailMessage): string {
  const paragraphs = msg.body
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;line-height:1.6;color:#33333a;">${escapeHtml(
          p,
        ).replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");

  const button = msg.action
    ? `<p style="margin:24px 0 0;">
         <a href="${escapeHtml(msg.action.url)}"
            style="display:inline-block;background:#1f3a5f;color:#ffffff;
                   text-decoration:none;padding:11px 20px;border-radius:8px;
                   font-weight:600;font-size:15px;">
           ${escapeHtml(msg.action.label)}
         </a>
       </p>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#ffffff;border-radius:12px;
                    border:1px solid #e5e5ea;overflow:hidden;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="padding:20px 28px;border-bottom:1px solid #eeeef2;">
          <span style="font-weight:700;font-size:15px;color:#1f3a5f;letter-spacing:-0.01em;">
            ${escapeHtml(site.boardName)}
          </span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:19px;line-height:1.35;color:#17171b;">
            ${escapeHtml(msg.subject)}
          </h1>
          ${paragraphs}
          ${button}
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #eeeef2;background:#fafafc;">
          <p style="margin:0;font-size:12px;color:#77777f;line-height:1.5;">
            Sent by ${escapeHtml(site.boardName)}, ${escapeHtml(site.schoolName)}.<br/>
            You can change your notification preferences in the members' portal.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const recipients = (Array.isArray(msg.to) ? msg.to : [msg.to]).filter(Boolean);
  if (recipients.length === 0) {
    return { ok: true, delivered: 0, simulated: true };
  }

  if (!isEmailConfigured()) {
    console.info(
      [
        "",
        "──────────── EMAIL (not sent — RESEND_API_KEY is unset) ────────────",
        `To:      ${recipients.join(", ")}`,
        `Subject: ${msg.subject}`,
        "",
        msg.body,
        msg.action ? `\n[${msg.action.label}] ${msg.action.url}` : "",
        "───────────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { ok: true, delivered: recipients.length, simulated: true };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Resend caps a single call at 50 recipients; chunk to stay under it.
    const chunks: string[][] = [];
    for (let i = 0; i < recipients.length; i += 45) {
      chunks.push(recipients.slice(i, i + 45));
    }

    let delivered = 0;
    for (const chunk of chunks) {
      const { error } = await resend.emails.send({
        from: emailFrom,
        // BCC so members never see each other's addresses.
        to: emailFrom,
        bcc: chunk,
        subject: msg.subject,
        html: renderHtml(msg),
        text: msg.body,
      });
      if (error) {
        return {
          ok: false,
          delivered,
          error: error.message,
          simulated: false,
        };
      }
      delivered += chunk.length;
    }

    return { ok: true, delivered, simulated: false };
  } catch (err) {
    return {
      ok: false,
      delivered: 0,
      error: err instanceof Error ? err.message : "Unknown email error",
      simulated: false,
    };
  }
}
