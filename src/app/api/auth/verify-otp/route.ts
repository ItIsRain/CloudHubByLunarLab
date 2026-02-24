import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { profileToUser } from "@/lib/supabase/mappers";
import { PROFILE_COLS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: error.message }, { status: 400 });
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
