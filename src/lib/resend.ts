import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "noreply@1i1.ae";
const FROM_NAME = "CloudHub by Lunar Limited";

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
      <p style="margin:0;color:#a1a1aa;font-size:13px;">by Lunar Limited</p>
    </div>
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="padding:24px 32px;border-top:1px solid #27272a;text-align:center;">
      <p style="margin:0;color:#71717a;font-size:12px;">&copy; ${new Date().getFullYear()} CloudHub by Lunar Limited (formerly CloudLynq). All rights reserved.</p>
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
  // Strip newlines to prevent email header injection
  const safeSubject = subject.replace(/[\r\n]/g, " ").trim();

  return resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to,
    subject: safeSubject,
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

// ── Application Status Email Templates ──────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

interface ApplicationEmailParams {
  to: string;
  applicantName: string;
  hackathonName: string;
  hackathonId: string;
}

export async function sendApplicationAcceptedEmail({ to, applicantName, hackathonName, hackathonId }: ApplicationEmailParams) {
  return sendEmail({
    to,
    subject: `Congratulations! You've been accepted to ${hackathonName}`,
    html: emailWrapper(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:#16a34a22;line-height:64px;font-size:32px;">&#10003;</div>
      </div>
      <h1 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700;text-align:center;">You're In, ${escapeHtml(applicantName)}!</h1>
      <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 8px;">
        Great news! Your application for <strong style="color:#fff;">${escapeHtml(hackathonName)}</strong> has been <strong style="color:#22c55e;">accepted</strong>.
      </p>
      <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 24px;">
        You're officially registered as a participant. Check the hackathon page for next steps, team formation, and important dates.
      </p>
      <div style="text-align:center;">
        <a href="${SITE_URL}/hackathons/${escapeHtml(hackathonId)}" style="display:inline-block;padding:12px 32px;background:#e8440a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          View Hackathon
        </a>
      </div>
    `),
  });
}

export async function sendApplicationRejectedEmail({ to, applicantName, hackathonName, hackathonId }: ApplicationEmailParams) {
  return sendEmail({
    to,
    subject: `Update on your application for ${hackathonName}`,
    html: emailWrapper(`
      <h1 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700;">Application Update</h1>
      <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 8px;">
        Hi ${escapeHtml(applicantName)},
      </p>
      <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 8px;">
        Thank you for your interest in <strong style="color:#fff;">${escapeHtml(hackathonName)}</strong>. After careful review, we were unable to accept your application at this time.
      </p>
      <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 24px;">
        We encourage you to keep an eye out for future events and opportunities on CloudHub.
      </p>
      <div style="text-align:center;">
        <a href="${SITE_URL}/explore" style="display:inline-block;padding:12px 32px;background:#e8440a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          Explore More Events
        </a>
      </div>
    `),
  });
}

export async function sendApplicationUnderReviewEmail({ to, applicantName, hackathonName, hackathonId }: ApplicationEmailParams) {
  return sendEmail({
    to,
    subject: `Your application for ${hackathonName} is under review`,
    html: emailWrapper(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:#f59e0b22;line-height:64px;font-size:32px;">&#128269;</div>
      </div>
      <h1 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700;text-align:center;">Application Under Review</h1>
      <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 8px;">
        Hi ${escapeHtml(applicantName)},
      </p>
      <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 8px;">
        Your application for <strong style="color:#fff;">${escapeHtml(hackathonName)}</strong> has been flagged for additional review by our team.
      </p>
      <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 24px;">
        This is not a rejection — we just need to verify some details. You'll receive another email once a final decision has been made.
      </p>
      <div style="text-align:center;">
        <a href="${SITE_URL}/hackathons/${escapeHtml(hackathonId)}" style="display:inline-block;padding:12px 32px;background:#e8440a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          View Hackathon
        </a>
      </div>
    `),
  });
}

export async function sendApplicationWaitlistedEmail({ to, applicantName, hackathonName, hackathonId }: ApplicationEmailParams) {
  return sendEmail({
    to,
    subject: `You've been waitlisted for ${hackathonName}`,
    html: emailWrapper(`
      <h1 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700;">You're on the Waitlist</h1>
      <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 8px;">
        Hi ${escapeHtml(applicantName)},
      </p>
      <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 8px;">
        Your application for <strong style="color:#fff;">${escapeHtml(hackathonName)}</strong> has been placed on the waitlist.
      </p>
      <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 24px;">
        We'll notify you immediately if a spot opens up. Please keep your schedule open!
      </p>
      <div style="text-align:center;">
        <a href="${SITE_URL}/hackathons/${escapeHtml(hackathonId)}" style="display:inline-block;padding:12px 32px;background:#e8440a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          View Hackathon
        </a>
      </div>
    `),
  });
}

export async function sendApplicationEligibleEmail({ to, applicantName, hackathonName, hackathonId }: ApplicationEmailParams) {
  return sendEmail({
    to,
    subject: `Your application for ${hackathonName} passed screening`,
    html: emailWrapper(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:#3b82f622;line-height:64px;font-size:32px;">&#10003;</div>
      </div>
      <h1 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700;text-align:center;">Application Eligible</h1>
      <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 8px;">
        Hi ${escapeHtml(applicantName)},
      </p>
      <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Your application for <strong style="color:#fff;">${escapeHtml(hackathonName)}</strong> has passed the screening process and is eligible for selection. You'll hear from us soon with the final decision.
      </p>
      <div style="text-align:center;">
        <a href="${SITE_URL}/hackathons/${escapeHtml(hackathonId)}" style="display:inline-block;padding:12px 32px;background:#e8440a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          View Hackathon
        </a>
      </div>
    `),
  });
}

export async function sendApplicationIneligibleEmail({ to, applicantName, hackathonName, hackathonId }: ApplicationEmailParams) {
  return sendEmail({
    to,
    subject: `Update on your application for ${hackathonName}`,
    html: emailWrapper(`
      <h1 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700;">Application Update</h1>
      <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 8px;">
        Hi ${escapeHtml(applicantName)},
      </p>
      <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 8px;">
        After reviewing your application for <strong style="color:#fff;">${escapeHtml(hackathonName)}</strong>, it did not meet the eligibility criteria set by the organizers.
      </p>
      <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 24px;">
        We encourage you to explore other events and hackathons on CloudHub.
      </p>
      <div style="text-align:center;">
        <a href="${SITE_URL}/explore" style="display:inline-block;padding:12px 32px;background:#e8440a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          Explore More Events
        </a>
      </div>
    `),
  });
}

export { emailWrapper };
