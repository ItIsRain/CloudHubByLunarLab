import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Verify the current user is authenticated and has the `admin` role.
 *
 * **Why the admin client for the role check?**
 * If the Supabase RLS UPDATE policy on `profiles` doesn't explicitly
 * exclude the `roles` column, a user could set their own roles via the
 * PostgREST anon/session client. Reading through the admin client (which
 * bypasses RLS) guarantees we see the canonical role set, not a
 * user-modified one.
 *
 * Returns `{ userId }` on success or `{ error: NextResponse }` on failure.
 */
export async function verifyAdmin(): Promise<
  { userId: string; error?: undefined } | { error: NextResponse; userId?: undefined }
> {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      ),
    };
  }

  // Read roles via admin client to prevent privilege escalation through
  // self-modification of the profiles.roles column.
  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("roles")
    .eq("id", user.id)
    .single();

  const roles = (profile?.roles as string[]) || [];
  if (!roles.includes("admin")) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { userId: user.id };
}
