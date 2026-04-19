import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
    }

    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Verify user is the hackathon organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }
    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Optional filter by registration ID
    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get("registrationId");

    if (registrationId && !UUID_RE.test(registrationId)) {
      return NextResponse.json({ error: "Invalid registration ID format" }, { status: 400 });
    }

    let query = supabase
      .from("screening_overrides")
      .select("*, overrider:profiles!screening_overrides_overridden_by_fkey(full_name, email)")
      .eq("hackathon_id", hackathonId)
      .order("created_at", { ascending: false });

    if (registrationId) {
      query = query.eq("registration_id", registrationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch screening overrides:", error);
      return NextResponse.json({ error: "Failed to fetch overrides" }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
