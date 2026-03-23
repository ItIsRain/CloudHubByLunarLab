import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendVerificationOtpEmail } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(ip, { namespace: "auth-register", limit: 5, windowMs: 15 * 60 * 1000 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const { email, password, name, roles } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // Create the user via admin API. This bypasses Supabase's built-in
    // confirmation email (which has strict rate limits of ~3-4/hr).
    // We send our own verification OTP via Resend instead.
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { name },
    });

    if (error) {
      // If user already exists, check if they're unverified and resend OTP
      if (error.message?.includes("already been registered")) {
        // Find the user by email in the profiles table, then fetch auth user by ID.
        // This avoids scanning all users (listUsers has pagination limits).
        const { data: profileRow } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", email.toLowerCase())
          .maybeSingle();

        let existingUser: Awaited<ReturnType<typeof supabaseAdmin.auth.admin.getUserById>>["data"]["user"] | null = null;
        if (profileRow) {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profileRow.id);
          existingUser = authUser?.user ?? null;
        }

        if (existingUser && !existingUser.email_confirmed_at) {
          // User exists but unverified — update password and resend OTP
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password,
            user_metadata: { name },
          });

          const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
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

          return NextResponse.json({
            user: { id: existingUser.id, email: existingUser.email },
            message: "A verification code has been sent to your email.",
          });
        }

        if (existingUser) {
          // User exists and is already verified — tell them to sign in
          return NextResponse.json(
            { error: "An account with this email already exists. Please sign in instead." },
            { status: 409 }
          );
        }

        // User NOT found in auth.users by primary email — check if this email
        // is linked as an OAuth identity on a different account (e.g. GitHub
        // email differs from the account's primary email).
        const { data: identityRows } = await supabaseAdmin.rpc(
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
                error: `This email is already linked to an account via ${providerLabel}. Please sign in with ${providerLabel} instead.`,
                oauthProvider: providers[0],
              },
              { status: 409 }
            );
          }
          // Email provider identity exists but user not found — stale state
          return NextResponse.json(
            { error: "An account with this email already exists. Please sign in instead." },
            { status: 409 }
          );
        }

        // Truly orphaned state — email blocked but no identity found either
        return NextResponse.json(
          { error: "An account with this email already exists. Please try signing in with GitHub or contact support." },
          { status: 409 }
        );
      }

      console.error("Registration error:", error.message);
      return NextResponse.json(
        { error: "Registration failed. Please try again." },
        { status: 400 }
      );
    }

    // Update roles on the profile using the admin client.
    if (data.user && Array.isArray(roles) && roles.length > 0) {
      const SELF_ASSIGNABLE_ROLES = ["attendee", "organizer"];
      const safeRoles = roles
        .filter((r): r is string => typeof r === "string")
        .filter((r) => SELF_ASSIGNABLE_ROLES.includes(r));
      if (safeRoles.length > 0) {
        await supabaseAdmin
          .from("profiles")
          .update({ roles: safeRoles })
          .eq("id", data.user.id);
      }
    }

    // Generate a verification OTP via Supabase's admin.generateLink.
    // This gives us the raw OTP that we send ourselves through Resend.
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError || !linkData?.properties?.email_otp) {
      console.error("Failed to generate verification OTP:", linkError?.message);
      // User was created but OTP generation failed — they can use "Resend code"
    } else {
      try {
        await sendVerificationOtpEmail(email, linkData.properties.email_otp);
      } catch (emailErr) {
        console.error("Failed to send verification email:", emailErr);
      }
    }

    return NextResponse.json({
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      message: "Account created successfully. Check your email for a verification code.",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
