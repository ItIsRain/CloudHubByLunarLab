import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/config";
import { profileToUser } from "@/lib/supabase/mappers";
import { PROFILE_COLS } from "@/lib/constants";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(PROFILE_COLS)
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user, profile: profileToUser(profile as Record<string, unknown>) });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();

    // Allowlist: only permit fields users should be able to update
    const ALLOWED_FIELDS = [
      "name", "username", "avatar", "bio", "headline",
      "location", "website", "github", "twitter", "linkedin",
      "skills", "interests",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select(PROFILE_COLS)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ profile });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Cancel active Stripe subscription before deleting account
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", user.id)
      .single();

    if (profile?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      } catch (err) {
        // Subscription may already be canceled — continue with deletion
        console.warn("Stripe subscription cancel failed (may be already canceled):", err);
      }
    }

    // Delete profile (cascade will handle related rows)
    await supabase.from("profiles").delete().eq("id", user.id);

    // Delete the Supabase Auth user using service-role admin client
    const supabaseAdmin = getSupabaseAdminClient();
    await supabaseAdmin.auth.admin.deleteUser(user.id);

    // Sign out the current session
    await supabase.auth.signOut();

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
