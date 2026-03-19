import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendVerificationOtpEmail } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(ip, { namespace: "auth-resend", limit: 3, windowMs: 15 * 60 * 1000 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Generate a new OTP via admin.generateLink and send via Resend.
    // Always return success to prevent email enumeration.
    const supabaseAdmin = getSupabaseAdminClient();

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (!linkError && linkData?.properties?.email_otp) {
      try {
        await sendVerificationOtpEmail(email, linkData.properties.email_otp);
      } catch (emailErr) {
        console.error("Failed to send verification email:", emailErr);
      }
    } else if (linkError) {
      // Log but don't expose — could be a non-existent user
      console.error("Failed to generate OTP for resend:", linkError.message);
    }

    return NextResponse.json({
      message: "If an account exists with that email, a verification code has been sent.",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
