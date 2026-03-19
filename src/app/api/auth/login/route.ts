import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { profileToPublicUser } from "@/lib/supabase/mappers";
import { PROFILE_PUBLIC_COLS } from "@/lib/constants";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendVerificationOtpEmail } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(ip, { namespace: "auth-login", limit: 10, windowMs: 15 * 60 * 1000 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // When login fails, check if this user exists but is unverified.
      // Supabase returns generic "Invalid login credentials" for both
      // wrong passwords AND unconfirmed emails, so we check explicitly.
      const admin = getSupabaseAdminClient();

      // Look up user by email in profiles table, then check auth status
      const { data: profile } = await admin
        .from("profiles")
        .select("id, email")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      let isUnverified = false;
      if (profile) {
        const { data: authUser } = await admin.auth.admin.getUserById(profile.id as string);
        isUnverified = !!authUser?.user && !authUser.user.email_confirmed_at;
      }

      if (isUnverified) {
        // User exists but email not verified — send a fresh OTP and redirect
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
        });

        if (linkData?.properties?.email_otp) {
          try {
            await sendVerificationOtpEmail(email, linkData.properties.email_otp);
          } catch (emailErr) {
            console.error("Failed to send verification email:", emailErr);
          }
        }

        return NextResponse.json(
          {
            error: "Your email is not verified. We've sent a new verification code to your inbox.",
            needsVerification: true,
            email,
          },
          { status: 403 }
        );
      }

      // Before returning generic error, check if this email is linked
      // as an OAuth identity on a different account (e.g. user signed up
      // with GitHub but is trying to log in with email/password).
      const { data: identityRows } = await admin.rpc(
        "check_email_identity_provider",
        { lookup_email: email.toLowerCase() }
      );

      if (identityRows && identityRows.length > 0) {
        const providers = (identityRows as { provider: string }[])
          .map((r) => r.provider)
          .filter((p) => p !== "email");
        if (providers.length > 0) {
          const providerLabel = providers.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" or ");
          return NextResponse.json(
            {
              error: `This email is linked to a ${providerLabel} account. Please sign in with ${providerLabel} instead.`,
              oauthProvider: providers[0],
            },
            { status: 401 }
          );
        }
      }

      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Fetch the profile
    const { data: profile } = await supabase
      .from("profiles")
      .select(PROFILE_PUBLIC_COLS)
      .eq("id", data.user.id)
      .single();

    return NextResponse.json({
      user: { id: data.user.id, email: data.user.email },
      profile: profile ? profileToPublicUser(profile as Record<string, unknown>) : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
