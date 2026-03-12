import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// =====================================================
// DELETE /api/keys/[keyId] — Revoke an API key
// Session auth only (no API key auth for key management)
// =====================================================

const UUID_RE =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const { keyId } = await params;

    if (!UUID_RE.test(keyId)) {
      return NextResponse.json({ error: "Invalid key ID" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Revoke the key (set status + revoked_at). RLS ensures user_id match.
    const { data, error } = await supabase
      .from("api_keys")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", keyId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "API key not found or already revoked" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
