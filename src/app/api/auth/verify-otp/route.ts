import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { profileToUser } from "@/lib/supabase/mappers";
import { PROFILE_COLS } from "@/lib/constants";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendWelcomeEmail } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(ip, {
      namespace: "auth-verify-otp",
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
        }
      );
    }

    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and verification code are required" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // Verify the OTP. The OTP was generated via admin.generateLink({ type: "magiclink" }),
    // so we verify with type "magiclink". This both confirms the user's email and
    // establishes a session (sets cookies via the server client).
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "magiclink",
    });

    if (error) {
      console.error("Verification failed:", error.message);
      return NextResponse.json(
        { error: "Invalid or expired verification code. Please request a new one." },
        { status: 400 }
      );
    }

    // Fetch profile after successful verification
    let profile = null;
    if (data.user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select(PROFILE_COLS)
        .eq("id", data.user.id)
        .single();
      profile = profileData;

      // Send welcome email (non-blocking)
      const userName = data.user.user_metadata?.name || email.split("@")[0];
      sendWelcomeEmail(email, userName).catch((err: unknown) =>
        console.error("Failed to send welcome email:", err)
      );
    }

    return NextResponse.json({
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      profile: profile ? profileToUser(profile as Record<string, unknown>) : null,
      message: "Email verified successfully",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
