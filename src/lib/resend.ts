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

// ── Design System ────────────────────────────────────────
// Brand-aligned email components for consistent, premium look

const COLORS = {
  bg: "#09090b",
  card: "#131316",
  cardBorder: "#1e1e24",
  surface: "#1a1a20",
  surfaceBorder: "#27272a",
  text: "#e4e4e7",
  textMuted: "#a1a1aa",
  textDim: "#71717a",
  white: "#ffffff",
  coral: "#e8440a",
  coralLight: "#ff5722",
  magenta: "#d12fa0",
  green: "#22c55e",
  greenBg: "rgba(34,197,94,0.12)",
  blue: "#3b82f6",
  blueBg: "rgba(59,130,246,0.12)",
  amber: "#f59e0b",
  amberBg: "rgba(245,158,11,0.12)",
  red: "#ef4444",
  redBg: "rgba(239,68,68,0.08)",
  purple: "#a855f7",
  purpleBg: "rgba(168,85,247,0.12)",
};

function emailWrapper(content: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>CloudHub</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:520px;margin:0 auto;padding:40px 16px;">

    <!-- Header / Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <img src="https://res.cloudinary.com/dhfysudgu/image/upload/v1773875035/CloudHubLight_1_x1hhk2.png" alt="CloudHub" width="180" style="display:block;max-width:180px;height:auto;margin:0 auto;border:0;" />
    </div>

    <!-- Card -->
    <div style="background:${COLORS.card};border-radius:16px;overflow:hidden;border:1px solid ${COLORS.cardBorder};">
      ${content}
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:32px 0 0;">
      <p style="margin:0 0 8px;color:${COLORS.textDim};font-size:12px;line-height:1.5;">
        &copy; ${new Date().getFullYear()} CloudHub by Lunar Limited. All rights reserved.
      </p>
      <p style="margin:0;color:${COLORS.textDim};font-size:11px;line-height:1.5;">
        You're receiving this because you have an account on CloudHub.<br/>
        <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/dashboard/settings" style="color:${COLORS.textMuted};text-decoration:underline;">Manage notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function statusBanner(color: string, bgColor: string, icon: string, label: string) {
  return `
    <div style="padding:24px 32px;background:${bgColor};border-bottom:1px solid ${COLORS.cardBorder};text-align:center;">
      <div style="display:inline-block;width:52px;height:52px;border-radius:50%;background:${color}18;border:2px solid ${color}30;line-height:52px;font-size:24px;margin-bottom:10px;">${icon}</div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${color};">${label}</div>
    </div>`;
}

function ctaButton(url: string, text: string, style: "primary" | "secondary" = "primary") {
  if (style === "primary") {
    return `
    <div style="text-align:center;padding:8px 0;">
      <a href="${url}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,${COLORS.coral},${COLORS.coralLight});color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;letter-spacing:0.2px;">
        ${text}
      </a>
    </div>`;
  }
  return `
  <div style="text-align:center;padding:8px 0;">
    <a href="${url}" style="display:inline-block;padding:14px 36px;background:transparent;color:${COLORS.textMuted};text-decoration:none;border-radius:10px;font-weight:500;font-size:14px;border:1px solid ${COLORS.surfaceBorder};">
      ${text}
    </a>
  </div>`;
}

function bodySection(content: string) {
  return `<div style="padding:28px 32px;">${content}</div>`;
}

function greeting(name: string) {
  return `<p style="color:${COLORS.text};font-size:15px;line-height:1.7;margin:0 0 16px;">Hi <strong style="color:${COLORS.white};">${escapeHtml(name)}</strong>,</p>`;
}

function paragraph(text: string) {
  return `<p style="color:${COLORS.text};font-size:15px;line-height:1.7;margin:0 0 16px;">${text}</p>`;
}

function eventName(name: string) {
  return `<strong style="color:${COLORS.white};">${escapeHtml(name)}</strong>`;
}

function divider() {
  return `<div style="height:1px;background:${COLORS.cardBorder};margin:4px 0 20px;"></div>`;
}

function infoBox(text: string) {
  return `
    <div style="padding:14px 18px;background:${COLORS.surface};border-radius:10px;border:1px solid ${COLORS.surfaceBorder};margin:0 0 20px;">
      <p style="margin:0;color:${COLORS.textMuted};font-size:13px;line-height:1.6;">${text}</p>
    </div>`;
}

// ── Email Sender ─────────────────────────────────────────

/**
 * General-purpose transactional email sender.
 * Used for all transactional emails including auth verification (via custom
 * OTP flow) and application status notifications.
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

// ── Welcome ──────────────────────────────────────────────

export async function sendWelcomeEmail(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: "Welcome to CloudHub!",
    html: emailWrapper(`
      ${statusBanner(COLORS.coral, `${COLORS.coral}08`, "&#127881;", "Welcome aboard")}
      ${bodySection(`
        ${greeting(name)}
        ${paragraph(`Your CloudHub account is ready. Discover hackathons, compete in challenges, form teams, and build something amazing.`)}
        ${paragraph(`Here's what you can do next:`)}
        ${infoBox(`
          <strong style="color:${COLORS.white};">Browse events</strong> &mdash; find hackathons and competitions near you<br/>
          <strong style="color:${COLORS.white};">Complete your profile</strong> &mdash; showcase your skills to potential teammates<br/>
          <strong style="color:${COLORS.white};">Join a team</strong> &mdash; collaborate with talented builders
        `)}
        ${ctaButton(`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/explore`, "Explore Events")}
      `)}
    `),
  });
}

// ── Email Verification OTP ───────────────────────────────

export async function sendVerificationOtpEmail(email: string, otp: string, expiryMinutes: number = 10) {
  // Build the OTP display with individual digit boxes
  const boxSize = otp.length > 6 ? "width:36px;height:44px;line-height:44px;font-size:20px;" : "width:44px;height:52px;line-height:52px;font-size:24px;";
  const otpDigits = otp.split("").map((d) =>
    `<td style="padding:0 3px;">
      <div style="${boxSize}text-align:center;font-weight:700;font-family:'JetBrains Mono',monospace;color:${COLORS.white};background:${COLORS.surface};border:1px solid ${COLORS.surfaceBorder};border-radius:10px;">${escapeHtml(d)}</div>
    </td>`
  ).join("");

  return sendEmail({
    to: email,
    subject: `${otp} is your CloudHub verification code`,
    html: emailWrapper(`
      ${statusBanner(COLORS.coral, `${COLORS.coral}08`, "&#128274;", "Verify Your Email")}
      ${bodySection(`
        ${paragraph(`Enter this code on the verification page to confirm your email address:`)}
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px auto;"><tr>${otpDigits}</tr></table>
        ${infoBox(`This code expires in <strong style="color:${COLORS.white};">${expiryMinutes} minutes</strong>. If you didn't create a CloudHub account, you can safely ignore this email.`)}
        ${paragraph(`<span style="color:${COLORS.textDim};font-size:13px;">If you're having trouble, copy and paste this code: <strong style="color:${COLORS.white};">${otp}</strong></span>`)}
      `)}
    `),
  });
}

// ── Application Status Email Templates ───────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

interface ApplicationEmailParams {
  to: string;
  applicantName: string;
  hackathonName: string;
  hackathonId: string;
  /** Override the default /hackathons/{hackathonId} link in email CTAs */
  linkUrl?: string;
}

// ── Accepted ─────────────────────────────────────────────

export async function sendApplicationAcceptedEmail({ to, applicantName, hackathonName, hackathonId, linkUrl }: ApplicationEmailParams) {
  const ctaUrl = linkUrl ?? `${SITE_URL}/hackathons/${escapeHtml(hackathonId)}`;
  return sendEmail({
    to,
    subject: `You're in! Welcome to ${hackathonName}`,
    html: emailWrapper(`
      ${statusBanner(COLORS.green, COLORS.greenBg, "&#127881;", "Accepted")}
      ${bodySection(`
        ${greeting(applicantName)}
        ${paragraph(`Great news! Your application for ${eventName(hackathonName)} has been <strong style="color:${COLORS.green};">accepted</strong>.`)}
        ${paragraph(`You're officially in. Check the event page for next steps, important dates, and team formation details.`)}
        ${infoBox(`<strong style="color:${COLORS.green};">What's next?</strong> Visit the event page to confirm your participation, join a team, and review the schedule.`)}
        ${ctaButton(ctaUrl, "View Event Details")}
      `)}
    `),
  });
}

// ── Rejected ─────────────────────────────────────────────

export async function sendApplicationRejectedEmail({ to, applicantName, hackathonName, hackathonId }: ApplicationEmailParams) {
  return sendEmail({
    to,
    subject: `Update on your ${hackathonName} application`,
    html: emailWrapper(`
      ${statusBanner(COLORS.textDim, COLORS.redBg, "&#128172;", "Application Update")}
      ${bodySection(`
        ${greeting(applicantName)}
        ${paragraph(`Thank you for your interest in ${eventName(hackathonName)}. After careful review, we weren't able to offer you a spot this time.`)}
        ${paragraph(`Don't let this stop you — there are plenty of exciting events and hackathons on CloudHub waiting for builders like you.`)}
        ${divider()}
        ${ctaButton(`${SITE_URL}/explore`, "Explore Other Events")}
      `)}
    `),
  });
}

// ── Under Review ─────────────────────────────────────────

export async function sendApplicationUnderReviewEmail({ to, applicantName, hackathonName, hackathonId, linkUrl }: ApplicationEmailParams) {
  const ctaUrl = linkUrl ?? `${SITE_URL}/hackathons/${escapeHtml(hackathonId)}`;
  return sendEmail({
    to,
    subject: `Your ${hackathonName} application is being reviewed`,
    html: emailWrapper(`
      ${statusBanner(COLORS.amber, COLORS.amberBg, "&#128270;", "Under Review")}
      ${bodySection(`
        ${greeting(applicantName)}
        ${paragraph(`Your application for ${eventName(hackathonName)} is currently being reviewed by the organizing team.`)}
        ${infoBox(`<strong style="color:${COLORS.amber};">This is not a rejection.</strong> We just need to verify a few details. You'll receive another email once a final decision has been made.`)}
        ${paragraph(`Sit tight — we'll get back to you soon.`)}
        ${ctaButton(ctaUrl, "View Application Status")}
      `)}
    `),
  });
}

// ── Waitlisted ───────────────────────────────────────────

export async function sendApplicationWaitlistedEmail({ to, applicantName, hackathonName, hackathonId, linkUrl }: ApplicationEmailParams) {
  const ctaUrl = linkUrl ?? `${SITE_URL}/hackathons/${escapeHtml(hackathonId)}`;
  return sendEmail({
    to,
    subject: `You're on the waitlist for ${hackathonName}`,
    html: emailWrapper(`
      ${statusBanner(COLORS.purple, COLORS.purpleBg, "&#9203;", "Waitlisted")}
      ${bodySection(`
        ${greeting(applicantName)}
        ${paragraph(`Your application for ${eventName(hackathonName)} has been placed on the <strong style="color:${COLORS.purple};">waitlist</strong>.`)}
        ${paragraph(`If a spot opens up, you'll be the first to know. We'll send you an email and notification immediately.`)}
        ${infoBox(`<strong style="color:${COLORS.white};">Keep your schedule open.</strong> Waitlist promotions often happen close to the event date as participants adjust their plans.`)}
        ${ctaButton(ctaUrl, "Check Waitlist Status")}
      `)}
    `),
  });
}

// ── Eligible ─────────────────────────────────────────────

export async function sendApplicationEligibleEmail({ to, applicantName, hackathonName, hackathonId, linkUrl }: ApplicationEmailParams) {
  const ctaUrl = linkUrl ?? `${SITE_URL}/hackathons/${escapeHtml(hackathonId)}`;
  return sendEmail({
    to,
    subject: `Your ${hackathonName} application passed screening`,
    html: emailWrapper(`
      ${statusBanner(COLORS.blue, COLORS.blueBg, "&#10003;", "Screening Passed")}
      ${bodySection(`
        ${greeting(applicantName)}
        ${paragraph(`Your application for ${eventName(hackathonName)} has <strong style="color:${COLORS.blue};">passed screening</strong> and is eligible for selection.`)}
        ${paragraph(`The organizers will review all eligible applications and make final decisions soon. You'll hear from us with the outcome.`)}
        ${ctaButton(ctaUrl, "View Application")}
      `)}
    `),
  });
}

// ── Ineligible ───────────────────────────────────────────

export async function sendApplicationIneligibleEmail({ to, applicantName, hackathonName, hackathonId }: ApplicationEmailParams) {
  return sendEmail({
    to,
    subject: `Update on your ${hackathonName} application`,
    html: emailWrapper(`
      ${statusBanner(COLORS.textDim, COLORS.redBg, "&#128203;", "Screening Update")}
      ${bodySection(`
        ${greeting(applicantName)}
        ${paragraph(`After reviewing your application for ${eventName(hackathonName)}, it did not meet the eligibility criteria set by the organizers.`)}
        ${paragraph(`We know this isn't the news you were hoping for. There are always new opportunities on CloudHub — keep building and applying.`)}
        ${divider()}
        ${ctaButton(`${SITE_URL}/explore`, "Explore Other Events")}
      `)}
    `),
  });
}

// ── Cancelled ────────────────────────────────────────────

export async function sendApplicationCancelledEmail({ to, applicantName, hackathonName }: ApplicationEmailParams) {
  return sendEmail({
    to,
    subject: `Your ${hackathonName} registration has been cancelled`,
    html: emailWrapper(`
      ${statusBanner(COLORS.red, COLORS.redBg, "&#10005;", "Registration Cancelled")}
      ${bodySection(`
        ${greeting(applicantName)}
        ${paragraph(`Your registration for ${eventName(hackathonName)} has been cancelled by the organizer.`)}
        ${paragraph(`If you believe this was a mistake, please reach out to the event organizer directly.`)}
        ${divider()}
        ${ctaButton(`${SITE_URL}/explore`, "Browse Other Events", "secondary")}
      `)}
    `),
  });
}

// ── Declined ─────────────────────────────────────────────

export async function sendApplicationDeclinedEmail({ to, applicantName, hackathonName }: ApplicationEmailParams) {
  return sendEmail({
    to,
    subject: `Confirmed: You've declined your spot in ${hackathonName}`,
    html: emailWrapper(`
      ${statusBanner(COLORS.textDim, `${COLORS.textDim}10`, "&#128075;", "Spot Declined")}
      ${bodySection(`
        ${greeting(applicantName)}
        ${paragraph(`This confirms that you've declined your spot in ${eventName(hackathonName)}. Your place may be offered to someone on the waitlist.`)}
        ${paragraph(`We're sorry to see you go. Whenever you're ready, there are always new hackathons and competitions to join.`)}
        ${divider()}
        ${ctaButton(`${SITE_URL}/explore`, "Explore Events", "secondary")}
      `)}
    `),
  });
}

export { emailWrapper, statusBanner, bodySection, greeting, paragraph, ctaButton, eventName, divider, infoBox, COLORS };
