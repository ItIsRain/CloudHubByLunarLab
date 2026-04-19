import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";

const VALID_TRACK_TYPES = ["sector", "innovation", "special", "custom"] as const;

type TrackType = (typeof VALID_TRACK_TYPES)[number];

function isValidTrackType(value: unknown): value is TrackType {
  return (
    typeof value === "string" &&
    VALID_TRACK_TYPES.includes(value as TrackType)
  );
}

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

  const { data: hackathon } = await supabase
    .from("hackathons")
    .select("organizer_id")
    .eq("id", hackathonId)
    .single();

  if (!hackathon) {
    return {
      error: NextResponse.json(
        { error: "Competition not found" },
        { status: 404 }
      ),
    };
  }

  if (hackathon.organizer_id !== auth.userId) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, userId: auth.userId };
}

// =====================================================
// GET — List all award tracks for this hackathon
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

    const { data: tracks, error } = await supabase
      .from("award_tracks")
      .select("*")
      .eq("hackathon_id", hackathonId)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Failed to fetch award tracks:", error);
      return NextResponse.json(
        { error: "Failed to fetch award tracks" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: tracks ?? [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// POST — Create a new award track
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

    const { supabase } = result;

    const body = await request.json();

    // Support batch creation (array of tracks)
    const items: unknown[] = Array.isArray(body) ? body : [body];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "At least one track is required" },
        { status: 400 }
      );
    }

    if (items.length > 50) {
      return NextResponse.json(
        { error: "Cannot create more than 50 tracks at once" },
        { status: 400 }
      );
    }

    const insertPayloads = [];

    for (const item of items) {
      const track = item as Record<string, unknown>;

      // Validate name
      if (!track.name || typeof track.name !== "string" || (track.name as string).trim().length === 0) {
        return NextResponse.json(
          { error: "name is required for each track" },
          { status: 400 }
        );
      }
      if ((track.name as string).length > 200) {
        return NextResponse.json(
          { error: "name must be at most 200 characters" },
          { status: 400 }
        );
      }

      // Validate track_type
      if (!isValidTrackType(track.track_type)) {
        return NextResponse.json(
          { error: `track_type must be one of: ${VALID_TRACK_TYPES.join(", ")}` },
          { status: 400 }
        );
      }

      // Validate description
      if (track.description !== undefined && track.description !== null) {
        if (typeof track.description !== "string") {
          return NextResponse.json(
            { error: "description must be a string" },
            { status: 400 }
          );
        }
        if ((track.description as string).length > 5000) {
          return NextResponse.json(
            { error: "description must be at most 5000 characters" },
            { status: 400 }
          );
        }
      }

      // Validate scoring_criteria
      if (track.scoring_criteria !== undefined && track.scoring_criteria !== null) {
        if (!Array.isArray(track.scoring_criteria)) {
          return NextResponse.json(
            { error: "scoring_criteria must be an array" },
            { status: 400 }
          );
        }
        if ((track.scoring_criteria as unknown[]).length > 50) {
          return NextResponse.json(
            { error: "scoring_criteria must have at most 50 items" },
            { status: 400 }
          );
        }
      }

      // Validate scoring_scale_max
      if (track.scoring_scale_max !== undefined) {
        if (typeof track.scoring_scale_max !== "number" || track.scoring_scale_max < 1 || track.scoring_scale_max > 100) {
          return NextResponse.json(
            { error: "scoring_scale_max must be between 1 and 100" },
            { status: 400 }
          );
        }
      }

      // Validate phase_id
      if (track.phase_id !== undefined && track.phase_id !== null) {
        if (typeof track.phase_id !== "string" || !UUID_RE.test(track.phase_id as string)) {
          return NextResponse.json(
            { error: "phase_id must be a valid UUID" },
            { status: 400 }
          );
        }
      }

      // Validate display_order
      if (track.display_order !== undefined) {
        if (typeof track.display_order !== "number" || track.display_order < 0) {
          return NextResponse.json(
            { error: "display_order must be a non-negative number" },
            { status: 400 }
          );
        }
      }

      insertPayloads.push({
        hackathon_id: hackathonId,
        name: (track.name as string).trim(),
        description: track.description ?? null,
        track_type: track.track_type as string,
        scoring_criteria: track.scoring_criteria ?? [],
        is_weighted: typeof track.is_weighted === "boolean" ? track.is_weighted : false,
        scoring_scale_max: typeof track.scoring_scale_max === "number" ? track.scoring_scale_max : 10,
        phase_id: track.phase_id ?? null,
        display_order: typeof track.display_order === "number" ? track.display_order : 0,
      });
    }

    const { data: tracks, error } = await supabase
      .from("award_tracks")
      .insert(insertPayloads)
      .select("*");

    if (error) {
      console.error("Failed to create award track:", error);
      return NextResponse.json(
        { error: "Failed to create award track" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: tracks }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH — Update an award track
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

    const { supabase } = result;

    const body = await request.json();
    const { trackId, ...updates } = body;

    if (!trackId || typeof trackId !== "string") {
      return NextResponse.json(
        { error: "trackId is required" },
        { status: 400 }
      );
    }
    if (!UUID_RE.test(trackId)) {
      return NextResponse.json(
        { error: "Invalid track ID" },
        { status: 400 }
      );
    }

    // Build the update payload with only allowed fields
    const allowedFields = [
      "name",
      "description",
      "track_type",
      "scoring_criteria",
      "is_weighted",
      "scoring_scale_max",
      "phase_id",
      "display_order",
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

    // Validate individual fields if present
    if ("name" in updatePayload) {
      const name = updatePayload.name;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "name cannot be empty" },
          { status: 400 }
        );
      }
      if ((name as string).length > 200) {
        return NextResponse.json(
          { error: "name must be at most 200 characters" },
          { status: 400 }
        );
      }
      updatePayload.name = (name as string).trim();
    }

    if ("track_type" in updatePayload) {
      if (!isValidTrackType(updatePayload.track_type)) {
        return NextResponse.json(
          { error: `track_type must be one of: ${VALID_TRACK_TYPES.join(", ")}` },
          { status: 400 }
        );
      }
    }

    if ("description" in updatePayload) {
      const desc = updatePayload.description;
      if (desc !== null && typeof desc !== "string") {
        return NextResponse.json(
          { error: "description must be a string or null" },
          { status: 400 }
        );
      }
      if (typeof desc === "string" && desc.length > 5000) {
        return NextResponse.json(
          { error: "description must be at most 5000 characters" },
          { status: 400 }
        );
      }
    }

    if ("scoring_criteria" in updatePayload) {
      const criteria = updatePayload.scoring_criteria;
      if (criteria !== null && !Array.isArray(criteria)) {
        return NextResponse.json(
          { error: "scoring_criteria must be an array or null" },
          { status: 400 }
        );
      }
    }

    if ("scoring_scale_max" in updatePayload) {
      const scale = updatePayload.scoring_scale_max;
      if (typeof scale !== "number" || scale < 1 || scale > 100) {
        return NextResponse.json(
          { error: "scoring_scale_max must be between 1 and 100" },
          { status: 400 }
        );
      }
    }

    const { data: track, error } = await supabase
      .from("award_tracks")
      .update(updatePayload)
      .eq("id", trackId)
      .eq("hackathon_id", hackathonId)
      .select("*")
      .single();

    if (error) {
      console.error("Failed to update award track:", error);
      return NextResponse.json(
        { error: "Failed to update award track" },
        { status: 500 }
      );
    }

    if (!track) {
      return NextResponse.json(
        { error: "Track not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: track });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE — Delete an award track
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

    const { supabase } = result;

    const body = await request.json();
    const { trackId } = body;

    if (!trackId || typeof trackId !== "string") {
      return NextResponse.json(
        { error: "trackId is required" },
        { status: 400 }
      );
    }
    if (!UUID_RE.test(trackId)) {
      return NextResponse.json(
        { error: "Invalid track ID" },
        { status: 400 }
      );
    }

    const { error, count } = await supabase
      .from("award_tracks")
      .delete()
      .eq("id", trackId)
      .eq("hackathon_id", hackathonId);

    if (error) {
      console.error("Failed to delete award track:", error);
      return NextResponse.json(
        { error: "Failed to delete award track" },
        { status: 500 }
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { error: "Track not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Award track deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
