import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "signup"
    | "recovery"
    | "invite"
    | "magiclink"
    | "email_change"
    | null;

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type === "recovery" ? "recovery" : "email",
  });

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=verification_failed&message=${encodeURIComponent(error.message)}`
    );
  }

  // Redirect based on the email action type with success indicator
  switch (type) {
    case "recovery":
      return NextResponse.redirect(`${origin}/reset-password`);
    case "signup":
      return NextResponse.redirect(`${origin}/dashboard?verified=true`);
    case "invite":
      return NextResponse.redirect(`${origin}/dashboard?verified=true`);
    default:
      return NextResponse.redirect(`${origin}/dashboard?verified=true`);
  }
}
