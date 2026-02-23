import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
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

    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      // Return generic message for all errors to prevent email enumeration
      return NextResponse.json(
        { error: "Registration failed. If you already have an account, try signing in or check your inbox for a verification link." },
        { status: 400 }
      );
    }

    // Update roles on the profile using the admin client.
    // The cookie-based client can't do this because the user's session
    // isn't valid until email verification is complete, so RLS blocks it.
    if (data.user && Array.isArray(roles) && roles.length > 0) {
      const SELF_ASSIGNABLE_ROLES = ["attendee", "organizer"];
      const safeRoles = roles
        .filter((r): r is string => typeof r === "string")
        .filter((r) => SELF_ASSIGNABLE_ROLES.includes(r));
      if (safeRoles.length > 0) {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        await supabaseAdmin
          .from("profiles")
          .update({ roles: safeRoles })
          .eq("id", data.user.id);
      }
    }

    return NextResponse.json({
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      message: "Account created successfully",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
