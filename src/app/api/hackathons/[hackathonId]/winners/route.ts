import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { checkHackathonAccess, canManage, type HackathonRole } from "@/lib/check-hackathon-access";

/**
 * Authenticate and authorize the request, returning the supabase client
 * and hackathon data if the caller is the hackathon organizer.
 */
async function authenticateAndAuthorize(
  request: NextRequest,
  hackathonId: string
) {
  const auth = await authenticateRequest(request);

  if (auth.type === "unauthenticated") {
    return {
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  if (auth.type === "api_key") {
    const scopeError = assertScope(auth, "/api/hackathons");
    if (scopeError) {
      return {
        error: NextResponse.json({ error: scopeError }, { status: 403 }),
      };
    }
  }

  const supabase =
    auth.type === "api_key"
      ? getSupabaseAdminClient()
      : await getSupabaseServerClient();

  // Check access via RBAC (all collaborator roles can view winners)
  const access = await checkHackathonAccess(supabase, hackathonId, auth.userId);
  if (!access.hasAccess) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, userId: auth.userId, role: access.role as HackathonRole };
}

// =====================================================
// GET — List all winners for this hackathon
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid competition ID" },
        { status: 400 }
      );
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;

    const { supabase } = result;

    const { data: winners, error } = await supabase
      .from("competition_winners")
      .select(
        "*, registration:hackathon_registrations!competition_winners_registration_id_fkey(id, user_id, status, form_data, user:profiles!hackathon_registrations_user_id_fkey(id, name, username, email, avatar)), track:award_tracks!competition_winners_award_track_id_fkey(id, name, track_type)"
      )
      .eq("hackathon_id", hackathonId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch winners:", error);
      return NextResponse.json(
        { error: "Failed to fetch winners" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: winners ?? [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// POST — Add winner(s) — accepts single or array
// =====================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid competition ID" },
        { status: 400 }
      );
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;

    const { supabase, role } = result;

    // POST requires owner/admin
    if (!canManage(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const items: unknown[] = Array.isArray(body) ? body : [body];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "At least one winner entry is required" },
        { status: 400 }
      );
    }

    if (items.length > 100) {
      return NextResponse.json(
        { error: "Cannot add more than 100 winners at once" },
        { status: 400 }
      );
    }

    const insertPayloads = [];

    for (const item of items) {
      const w = item as Record<string, unknown>;

      // Validate registration_id
      if (!w.registration_id || typeof w.registration_id !== "string" || !UUID_RE.test(w.registration_id as string)) {
        return NextResponse.json(
          { error: "registration_id is required and must be a valid UUID" },
          { status: 400 }
        );
      }

      // Validate award_label
      if (!w.award_label || typeof w.award_label !== "string" || (w.award_label as string).trim().length === 0) {
        return NextResponse.json(
          { error: "award_label is required" },
          { status: 400 }
        );
      }
      if ((w.award_label as string).length > 500) {
        return NextResponse.json(
          { error: "award_label must be at most 500 characters" },
          { status: 400 }
        );
      }

      // Validate optional award_track_id
      if (w.award_track_id !== undefined && w.award_track_id !== null) {
        if (typeof w.award_track_id !== "string" || !UUID_RE.test(w.award_track_id as string)) {
          return NextResponse.json(
            { error: "award_track_id must be a valid UUID" },
            { status: 400 }
          );
        }
      }

      // Validate optional phase_id
      if (w.phase_id !== undefined && w.phase_id !== null) {
        if (typeof w.phase_id !== "string" || !UUID_RE.test(w.phase_id as string)) {
          return NextResponse.json(
            { error: "phase_id must be a valid UUID" },
            { status: 400 }
          );
        }
      }

      // Validate optional rank
      if (w.rank !== undefined && w.rank !== null) {
        if (typeof w.rank !== "number" || w.rank < 1 || w.rank > 1000) {
          return NextResponse.json(
            { error: "rank must be a positive number (max 1000)" },
            { status: 400 }
          );
        }
      }

      // Validate optional final_score
      if (w.final_score !== undefined && w.final_score !== null) {
        if (typeof w.final_score !== "number") {
          return NextResponse.json(
            { error: "final_score must be a number" },
            { status: 400 }
          );
        }
      }

      // Validate optional notes
      if (w.notes !== undefined && w.notes !== null) {
        if (typeof w.notes !== "string" || (w.notes as string).length > 5000) {
          return NextResponse.json(
            { error: "notes must be a string (max 5000 chars)" },
            { status: 400 }
          );
        }
      }

      insertPayloads.push({
        hackathon_id: hackathonId,
        registration_id: w.registration_id as string,
        award_label: (w.award_label as string).trim(),
        award_track_id: w.award_track_id ?? null,
        phase_id: w.phase_id ?? null,
        rank: w.rank ?? null,
        final_score: w.final_score ?? null,
        notes: w.notes ?? null,
        confirmed: false,
        locked: false,
      });
    }

    const { data: winners, error } = await supabase
      .from("competition_winners")
      .insert(insertPayloads)
      .select(
        "*, registration:hackathon_registrations!competition_winners_registration_id_fkey(id, user_id, status, form_data, user:profiles!hackathon_registrations_user_id_fkey(id, name, username, email, avatar)), track:award_tracks!competition_winners_award_track_id_fkey(id, name, track_type)"
      );

    if (error) {
      console.error("Failed to add winner:", error);
      // Check for unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This participant is already a winner for this track" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to add winner" },
        { status: 500 }
      );
    }

    // Notify each winner
    const { data: hackInfo } = await supabase
      .from("hackathons")
      .select("name")
      .eq("id", hackathonId)
      .single();
    const hackName = (hackInfo?.name as string) || "Hackathon";

    for (const w of winners || []) {
      const reg = Array.isArray(w.registration) ? w.registration[0] : w.registration;
      const userId = (reg as Record<string, unknown>)?.user_id as string | undefined;
      if (!userId) continue;
      const awardLabel = (w.award_label as string) || "Winner";

      supabase.from("notifications").insert({
        user_id: userId,
        type: "winner-announcement",
        title: `You won "${awardLabel}" at ${hackName}!`,
        message: `Congratulations! You've been named a winner at ${hackName} for "${awardLabel}". Check the competition page for details.`,
        link: `/hackathons/${hackathonId}`,
      }).then(() => {}, () => {});
    }

    return NextResponse.json({ data: winners }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH — Update a winner (confirm, lock, change rank/notes)
// =====================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid competition ID" },
        { status: 400 }
      );
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;

    const { supabase, userId, role: patchRole } = result;

    // PATCH requires owner/admin
    if (!canManage(patchRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { winnerId, ...updates } = body;

    if (!winnerId || typeof winnerId !== "string") {
      return NextResponse.json(
        { error: "winnerId is required" },
        { status: 400 }
      );
    }
    if (!UUID_RE.test(winnerId)) {
      return NextResponse.json(
        { error: "Invalid winner ID" },
        { status: 400 }
      );
    }

    // First check if the winner is locked
    const { data: existingWinner } = await supabase
      .from("competition_winners")
      .select("locked")
      .eq("id", winnerId)
      .eq("hackathon_id", hackathonId)
      .single();

    if (!existingWinner) {
      return NextResponse.json(
        { error: "Winner not found" },
        { status: 404 }
      );
    }

    // If winner is locked, only allow unlocking (locked=false)
    if (existingWinner.locked && updates.locked !== false) {
      return NextResponse.json(
        { error: "Winner is locked and cannot be modified. Unlock first." },
        { status: 403 }
      );
    }

    // Build the update payload with only allowed fields
    const allowedFields = [
      "award_label",
      "award_track_id",
      "phase_id",
      "rank",
      "final_score",
      "confirmed",
      "locked",
      "notes",
    ] as const;
    const updatePayload: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in updates) {
        updatePayload[field] = updates[field];
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // If confirming, set confirmed_by and confirmed_at
    if (updatePayload.confirmed === true) {
      updatePayload.confirmed_by = userId;
      updatePayload.confirmed_at = new Date().toISOString();
    }

    // If locking, set locked_at
    if (updatePayload.locked === true) {
      updatePayload.locked_at = new Date().toISOString();
    }

    // If unlocking, clear locked_at
    if (updatePayload.locked === false) {
      updatePayload.locked_at = null;
    }

    // Validate award_label if present
    if ("award_label" in updatePayload) {
      const label = updatePayload.award_label;
      if (!label || typeof label !== "string" || (label as string).trim().length === 0) {
        return NextResponse.json(
          { error: "award_label cannot be empty" },
          { status: 400 }
        );
      }
      if ((label as string).length > 500) {
        return NextResponse.json(
          { error: "award_label must be at most 500 characters" },
          { status: 400 }
        );
      }
      updatePayload.award_label = (label as string).trim();
    }

    // Validate rank if present
    if ("rank" in updatePayload && updatePayload.rank !== null) {
      if (typeof updatePayload.rank !== "number" || updatePayload.rank < 1) {
        return NextResponse.json(
          { error: "rank must be a positive number" },
          { status: 400 }
        );
      }
    }

    const { data: winner, error } = await supabase
      .from("competition_winners")
      .update(updatePayload)
      .eq("id", winnerId)
      .eq("hackathon_id", hackathonId)
      .select(
        "*, registration:hackathon_registrations!competition_winners_registration_id_fkey(id, user_id, status, form_data, user:profiles!hackathon_registrations_user_id_fkey(id, name, username, email, avatar)), track:award_tracks!competition_winners_award_track_id_fkey(id, name, track_type)"
      )
      .single();

    if (error) {
      console.error("Failed to update winner:", error);
      return NextResponse.json(
        { error: "Failed to update winner" },
        { status: 500 }
      );
    }

    if (!winner) {
      return NextResponse.json(
        { error: "Winner not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: winner });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE — Remove a winner
// =====================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid competition ID" },
        { status: 400 }
      );
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;

    const { supabase, role: delRole } = result;

    // DELETE requires owner/admin
    if (!canManage(delRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { winnerId } = body;

    if (!winnerId || typeof winnerId !== "string") {
      return NextResponse.json(
        { error: "winnerId is required" },
        { status: 400 }
      );
    }
    if (!UUID_RE.test(winnerId)) {
      return NextResponse.json(
        { error: "Invalid winner ID" },
        { status: 400 }
      );
    }

    // Check if locked before deleting
    const { data: existingWinner } = await supabase
      .from("competition_winners")
      .select("locked")
      .eq("id", winnerId)
      .eq("hackathon_id", hackathonId)
      .single();

    if (!existingWinner) {
      return NextResponse.json(
        { error: "Winner not found" },
        { status: 404 }
      );
    }

    if (existingWinner.locked) {
      return NextResponse.json(
        { error: "Cannot delete a locked winner. Unlock first." },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("competition_winners")
      .delete()
      .eq("id", winnerId)
      .eq("hackathon_id", hackathonId);

    if (error) {
      console.error("Failed to delete winner:", error);
      return NextResponse.json(
        { error: "Failed to delete winner" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Winner removed" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
