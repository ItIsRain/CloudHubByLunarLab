import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
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

    // Zod schema for profile updates — validates types and constrains sizes
    const profileUpdateSchema = z.object({
      name: z.string().min(2).max(100).optional(),
      username: z.string().min(2).max(50).regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, hyphens, and underscores").optional(),
      avatar: z.string().max(2048).nullable().optional(),
      bio: z.string().max(500).nullable().optional(),
      headline: z.string().max(120).nullable().optional(),
      location: z.string().max(100).nullable().optional(),
      website: z.string().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
      github: z.string().max(100).nullable().optional(),
      twitter: z.string().max(100).nullable().optional(),
      linkedin: z.string().max(200).nullable().optional(),
      skills: z.array(z.string().max(50)).max(50).optional(),
      interests: z.array(z.string().max(50)).max(50).optional(),
    }).strict();

    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid profile data", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updates = parsed.data;

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
      // Unique constraint violation — most likely a duplicate username
      if (error.code === "23505") {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to update profile" }, { status: 400 });
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
