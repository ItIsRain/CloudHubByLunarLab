import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // Fire-and-forget: always return success to prevent email enumeration
    await supabase.auth.resend({
      type: "signup",
      email,
    });

    return NextResponse.json({
      message: "If an account exists with that email, a verification code has been sent",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
