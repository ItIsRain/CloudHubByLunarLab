import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";

  // Prevent open redirect: only allow relative paths starting with /
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      const baseUrl = isLocalEnv
        ? origin
        : forwardedHost
        ? `https://${forwardedHost}`
        : origin;

      // Check if this is a new OAuth user who needs onboarding
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, roles")
          .eq("id", user.id)
          .single();

        // If no profile exists, create one from OAuth metadata
        if (!profile) {
          const meta = user.user_metadata || {};
          await supabase.from("profiles").insert({
            id: user.id,
            email: user.email || meta.email || "",
            name: meta.full_name || meta.name || meta.user_name || "",
            username: meta.user_name || meta.preferred_username || user.id.slice(0, 8),
            avatar: meta.avatar_url || null,
          });
          // New user — redirect to onboarding
          return NextResponse.redirect(`${baseUrl}/onboarding`);
        }

        // If profile exists but name or roles are missing, redirect to onboarding
        const hasName = profile.name && profile.name.trim().length > 0;
        const hasRoles =
          Array.isArray(profile.roles) && profile.roles.length > 0 && profile.roles[0] !== "attendee";

        if (!hasName) {
          return NextResponse.redirect(`${baseUrl}/onboarding`);
        }
      }

      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  // Auth code exchange failed — redirect to error page or login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
