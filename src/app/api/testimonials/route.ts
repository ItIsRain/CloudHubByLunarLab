import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToTestimonial } from "@/lib/supabase/mappers";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10") || 10));

    const { data, error } = await supabase
      .from("testimonials")
      .select("*, user:profiles!user_id(*)")
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { data: (data || []).map(dbRowToTestimonial) },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check subscription tier and organizer role
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, roles")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const tier = profile.subscription_tier as string;
    const roles = (profile.roles as string[]) || [];

    if (!["pro", "enterprise"].includes(tier) || !roles.includes("organizer")) {
      return NextResponse.json(
        { error: "Only subscribed organizers can submit testimonials" },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.quote || !body.role) {
      return NextResponse.json(
        { error: "quote and role are required" },
        { status: 400 }
      );
    }

    if (typeof body.quote !== "string" || body.quote.length > 2000) {
      return NextResponse.json(
        { error: "Quote must be under 2,000 characters" },
        { status: 400 }
      );
    }
    if (typeof body.role !== "string" || body.role.length > 100) {
      return NextResponse.json(
        { error: "Role must be under 100 characters" },
        { status: 400 }
      );
    }
    if (body.company && (typeof body.company !== "string" || body.company.length > 100)) {
      return NextResponse.json(
        { error: "Company must be under 100 characters" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("testimonials")
      .insert({
        user_id: user.id,
        quote: body.quote.slice(0, 2000),
        role: body.role.slice(0, 100),
        company: body.company ? String(body.company).slice(0, 100) : null,
        highlight_stat: body.highlightStat || null,
        rating: body.rating || 5,
      })
      .select("*, user:profiles!user_id(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: dbRowToTestimonial(data) }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
