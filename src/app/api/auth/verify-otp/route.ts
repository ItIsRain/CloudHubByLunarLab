import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { profileToUser } from "@/lib/supabase/mappers";
import { PROFILE_COLS } from "@/lib/constants";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(ip, {
      namespace: "auth-verify-otp",
      limit: 5,
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

    const { email, token, type = "email" } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and verification code are required" },
        { status: 400 }
      );
    }

    const VALID_OTP_TYPES = ["email", "recovery"];
    if (!VALID_OTP_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Invalid verification type" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: type as "email" | "recovery",
    });

    if (error) {
      console.error("Verification failed:", error.message);
      return NextResponse.json(
        { error: "Verification failed. Please request a new code." },
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
