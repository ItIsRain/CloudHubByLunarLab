import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail, emailWrapper, escapeHtml } from "@/lib/resend";

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(254),
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(5000),
});

// Simple in-memory rate limiter: max 5 requests per IP per 15 minutes
const rateMap = new Map<string, number[]>();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  rateMap.set(ip, recent);
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid form data", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = parsed.data;

    // Send notification email to team
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await sendEmail({
      to: "hello@lnr.ae",
      subject: `[CloudHub Contact] ${escapeHtml(subject)}`,
      html: emailWrapper(`
        <h1 style="margin:0 0 16px;color:#fff;font-size:22px;font-weight:700;">New Contact Form Submission</h1>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:80px;vertical-align:top;">Name</td>
            <td style="padding:8px 0;color:#d4d4d8;font-size:14px;">${escapeHtml(name)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#a1a1aa;font-size:13px;vertical-align:top;">Email</td>
            <td style="padding:8px 0;color:#d4d4d8;font-size:14px;">
              <a href="mailto:${escapeHtml(email)}" style="color:#e8440a;text-decoration:none;">${escapeHtml(email)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#a1a1aa;font-size:13px;vertical-align:top;">Subject</td>
            <td style="padding:8px 0;color:#d4d4d8;font-size:14px;">${escapeHtml(subject)}</td>
          </tr>
        </table>
        <div style="margin:16px 0 0;padding:16px;background:#27272a;border-radius:8px;">
          <p style="margin:0;color:#d4d4d8;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</p>
        </div>
        <p style="margin:24px 0 0;color:#71717a;font-size:12px;">Sent from ${siteUrl}/contact</p>
      `),
    });

    // Send confirmation auto-reply to sender
    await sendEmail({
      to: email,
      subject: "We received your message — CloudHub",
      html: emailWrapper(`
        <h1 style="margin:0 0 16px;color:#fff;font-size:22px;font-weight:700;">Thanks for reaching out, ${escapeHtml(name)}!</h1>
        <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 16px;">
          We received your message and will get back to you within 24 hours.
        </p>
        <p style="color:#d4d4d8;font-size:15px;line-height:1.6;margin:0 0 24px;">
          In the meantime, feel free to explore our platform or check out our documentation.
        </p>
        <a href="${siteUrl}/explore" style="display:inline-block;padding:12px 32px;background:#e8440a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          Explore CloudHub
        </a>
      `),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}
