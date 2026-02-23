import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "noreply@1i1.ae";
const FROM_NAME = "CloudHub by Lunar Labs";

/** Escape user-supplied text before embedding in HTML emails */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailWrapper(content: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#09090b;font-family:'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#18181b;border-radius:16px;overflow:hidden;border:1px solid #27272a;">
    <div style="padding:32px 32px 0;text-align:center;">
      <h2 style="margin:0 0 4px;color:#fff;font-size:20px;font-weight:700;">CloudHub</h2>
      <p style="margin:0;color:#a1a1aa;font-size:13px;">by Lunar Labs</p>
    </div>
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="padding:24px 32px;border-top:1px solid #27272a;text-align:center;">
      <p style="margin:0;color:#71717a;font-size:12px;">&copy; ${new Date().getFullYear()} CloudHub by Lunar Labs. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * General-purpose transactional email sender.
 * Auth emails (verification, password reset) are handled by the Supabase
 * Edge Function `send-email` via the Send Email Hook — not this utility.
 * Use this for non-auth emails (welcome, notifications, receipts, etc.).
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  return resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
}

export async function sendWelcomeEmail(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: "Welcome to CloudHub!",
    html: emailWrapper(`
      <h1 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700;">Welcome, ${escapeHtml(name)}!</h1>
      <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Your account is all set up. Start exploring events and hackathons, or create your own.
      </p>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/explore" style="display:inline-block;padding:12px 32px;background:#e8440a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
        Explore Events
      </a>
    `),
  });
}

export { emailWrapper };
