import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { profileToPublicUser } from "@/lib/supabase/mappers";
import { PROFILE_PUBLIC_COLS } from "@/lib/constants";
import { authenticateRequest, assertScope } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    const hasBearer = request.headers.get("authorization")?.startsWith("Bearer ");
    if (hasBearer && auth.type === "unauthenticated") {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/users");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_PUBLIC_COLS)
      .eq("username", username)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch user:", error.message);
      return NextResponse.json({ error: "Failed to fetch user" }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { data: profileToPublicUser(data as Record<string, unknown>) },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
