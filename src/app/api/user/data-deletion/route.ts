import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/user/data-deletion
 *
 * GDPR/UAE Data Compliance: allows authenticated users to request deletion
 * of all their personal data. This does NOT delete data immediately — it
 * marks the profile with a `deletion_requested_at` timestamp. A backend
 * process should handle the actual deletion within 30 days (GDPR requirement).
 *
 * The user receives a reference ID they can use to follow up on the request.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);

    if (auth.type === "unauthenticated") {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const userId = auth.userId;
    const admin = getSupabaseAdminClient();

    // Check if a deletion request already exists
    const { data: profile } = await admin
      .from("profiles")
      .select("id, deletion_requested_at")
      .eq("id", userId)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    if (profile.deletion_requested_at) {
      return NextResponse.json(
        {
          error: "A data deletion request is already pending.",
          referenceId: `DEL-${userId.slice(0, 8).toUpperCase()}`,
          requestedAt: profile.deletion_requested_at,
        },
        { status: 409 }
      );
    }

    // Mark profile with deletion request timestamp
    const now = new Date().toISOString();
    const { error: updateError } = await admin
      .from("profiles")
      .update({ deletion_requested_at: now })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to mark deletion request:", updateError);
      return NextResponse.json(
        { error: "Failed to process deletion request. Please try again or contact support at hello@lnr.ae." },
        { status: 500 }
      );
    }

    // Generate a human-readable reference ID from the user ID
    const referenceId = `DEL-${userId.slice(0, 8).toUpperCase()}`;

    return NextResponse.json({
      message: "Your data deletion request has been received. Your data will be deleted within 30 days in accordance with our privacy policy. You will receive a confirmation email once the deletion is complete.",
      referenceId,
      requestedAt: now,
      contact: "hello@lnr.ae",
    });
  } catch (err) {
    console.error("Data deletion request error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
