import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    const { slotId } = await params;
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify the slot belongs to the current user
    const { data: slot } = await supabase
      .from("mentor_availability")
      .select("id, mentor_id")
      .eq("id", slotId)
      .single();

    if (!slot) {
      return NextResponse.json(
        { error: "Availability slot not found" },
        { status: 404 }
      );
    }

    if (slot.mentor_id !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own availability slots" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("mentor_availability")
      .delete()
      .eq("id", slotId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete availability slot" },
        { status: 400 }
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
