import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";

type RouteParams = {
  params: Promise<{ hackathonId: string; phaseId: string }>;
};

// ── Helpers ──────────────────────────────────────────────

async function resolveAuth(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.type === "unauthenticated") {
    return { auth: null, error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  if (auth.type === "api_key") {
    const scopeError = assertScope(auth, "/api/hackathons");
    if (scopeError) {
      return { auth: null, error: NextResponse.json({ error: scopeError }, { status: 403 }) };
    }
  }
  return { auth, error: null };
}

async function verifyOrganizerOwnership(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  hackathonId: string,
  phaseId: string,
  userId: string
) {
  const { data: hackathon } = await supabase
    .from("hackathons")
    .select("organizer_id")
    .eq("id", hackathonId)
    .single();

  if (!hackathon) return { ok: false as const, res: NextResponse.json({ error: "Competition not found" }, { status: 404 }) };

  if (hackathon.organizer_id !== userId) {
    return { ok: false as const, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const { data: phase } = await supabase
    .from("competition_phases")
    .select("id")
    .eq("id", phaseId)
    .eq("hackathon_id", hackathonId)
    .maybeSingle();

  if (!phase) return { ok: false as const, res: NextResponse.json({ error: "Phase not found in this competition" }, { status: 404 }) };

  return { ok: true as const };
}

function validateIds(hackathonId: string, phaseId: string) {
  if (!UUID_RE.test(hackathonId)) return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
  if (!UUID_RE.test(phaseId)) return NextResponse.json({ error: "Invalid phase ID" }, { status: 400 });
  return null;
}

// ── GET — List all rooms for a phase with judges + slots ─

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;
    const idError = validateIds(hackathonId, phaseId);
    if (idError) return idError;

    const { auth, error: authError } = await resolveAuth(request);
    if (!auth) return authError;

    const supabase =
      getSupabaseAdminClient();

    // Verify hackathon + phase exist
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) return NextResponse.json({ error: "Competition not found" }, { status: 404 });

    const { data: phase } = await supabase
      .from("competition_phases")
      .select("id")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (!phase) return NextResponse.json({ error: "Phase not found in this competition" }, { status: 404 });

    // Fetch rooms ordered by sort_order
    const { data: rooms, error: roomsErr } = await supabase
      .from("pitch_rooms")
      .select("*")
      .eq("phase_id", phaseId)
      .eq("hackathon_id", hackathonId)
      .order("sort_order", { ascending: true });

    if (roomsErr) return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 400 });

    if (!rooms || rooms.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const roomIds = rooms.map((r: { id: string }) => r.id);

    // Fetch judges with profile info
    const { data: judges } = await supabase
      .from("pitch_room_judges")
      .select("id, room_id, reviewer_id, assigned_at, reviewer:profiles!pitch_room_judges_reviewer_id_fkey(id, name, email, avatar)")
      .in("room_id", roomIds);

    // Fetch slots with registration + applicant info
    const { data: slots } = await supabase
      .from("pitch_room_slots")
      .select("id, room_id, registration_id, slot_order, scheduled_time, duration_minutes, status, created_at, registration:hackathon_registrations!pitch_room_slots_registration_id_fkey(id, user_id, applicant:profiles!hackathon_registrations_user_id_fkey(id, name, email, avatar))")
      .in("room_id", roomIds)
      .order("slot_order", { ascending: true });

    // Assemble rooms with their judges and slots
    const judgesByRoom = new Map<string, typeof judges>();
    for (const j of judges ?? []) {
      const list = judgesByRoom.get(j.room_id) ?? [];
      list.push(j);
      judgesByRoom.set(j.room_id, list);
    }

    const slotsByRoom = new Map<string, typeof slots>();
    for (const s of slots ?? []) {
      const list = slotsByRoom.get(s.room_id) ?? [];
      list.push(s);
      slotsByRoom.set(s.room_id, list);
    }

    const data = rooms.map((room: Record<string, unknown>) => ({
      ...room,
      judges: judgesByRoom.get(room.id as string) ?? [],
      slots: slotsByRoom.get(room.id as string) ?? [],
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST — Create a new room ────────────────────────────

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;
    const idError = validateIds(hackathonId, phaseId);
    if (idError) return idError;

    const { auth, error: authError } = await resolveAuth(request);
    if (!auth) return authError;

    const supabase =
      getSupabaseAdminClient();

    const ownership = await verifyOrganizerOwnership(supabase, hackathonId, phaseId, auth.userId);
    if (!ownership.ok) return ownership.res;

    const body = await request.json();
    const { name, description, sortOrder } = body as {
      name?: string;
      description?: string;
      sortOrder?: number;
    };

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (name.trim().length > 200) {
      return NextResponse.json({ error: "name must be under 200 characters" }, { status: 400 });
    }

    // Determine sort order if not provided
    let finalSortOrder = sortOrder ?? 0;
    if (sortOrder === undefined) {
      const { data: existing } = await supabase
        .from("pitch_rooms")
        .select("sort_order")
        .eq("phase_id", phaseId)
        .order("sort_order", { ascending: false })
        .limit(1);
      finalSortOrder = (existing?.[0]?.sort_order ?? -1) + 1;
    }

    const { data: room, error } = await supabase
      .from("pitch_rooms")
      .insert({
        phase_id: phaseId,
        hackathon_id: hackathonId,
        name: name.trim(),
        description: description?.trim() || null,
        sort_order: finalSortOrder,
        status: "pending",
      })
      .select("*")
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Failed to create room" }, { status: 400 });
    }

    return NextResponse.json({ data: { ...room, judges: [], slots: [] } }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── PATCH — Multi-action updates ─────────────────────────

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;
    const idError = validateIds(hackathonId, phaseId);
    if (idError) return idError;

    const { auth, error: authError } = await resolveAuth(request);
    if (!auth) return authError;

    const supabase =
      getSupabaseAdminClient();

    const ownership = await verifyOrganizerOwnership(supabase, hackathonId, phaseId, auth.userId);
    if (!ownership.ok) return ownership.res;

    const body = await request.json();
    const { action } = body as { action: string };

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    switch (action) {
      case "update_room":
        return await handleUpdateRoom(supabase, body);
      case "assign_judges":
        return await handleAssignJudges(supabase, body);
      case "remove_judge":
        return await handleRemoveJudge(supabase, body);
      case "assign_slots":
        return await handleAssignSlots(supabase, body);
      case "remove_slot":
        return await handleRemoveSlot(supabase, body);
      case "update_slot_status":
        return await handleUpdateSlotStatus(supabase, body);
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleUpdateRoom(supabase: any, body: any) {
  const { roomId, name, description, status, sortOrder } = body;
  if (!roomId || !UUID_RE.test(roomId)) {
    return NextResponse.json({ error: "Valid roomId is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (description !== undefined) updates.description = description ? String(description).trim() : null;
  if (status !== undefined) {
    const validStatuses = ["pending", "in_progress", "completed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }
    updates.status = status;
  }
  if (sortOrder !== undefined) updates.sort_order = Number(sortOrder);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("pitch_rooms")
    .update(updates)
    .eq("id", roomId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update room" }, { status: 400 });
  return NextResponse.json({ data });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleAssignJudges(supabase: any, body: any) {
  const { roomId, reviewerIds } = body;
  if (!roomId || !UUID_RE.test(roomId)) {
    return NextResponse.json({ error: "Valid roomId is required" }, { status: 400 });
  }
  if (!Array.isArray(reviewerIds) || reviewerIds.length === 0) {
    return NextResponse.json({ error: "reviewerIds must be a non-empty array" }, { status: 400 });
  }
  for (const id of reviewerIds) {
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: `Invalid reviewer ID: ${id}` }, { status: 400 });
    }
  }

  const rows = reviewerIds.map((reviewerId: string) => ({
    room_id: roomId,
    reviewer_id: reviewerId,
  }));

  const { data, error } = await supabase
    .from("pitch_room_judges")
    .upsert(rows, { onConflict: "room_id,reviewer_id" })
    .select("id, room_id, reviewer_id, assigned_at, reviewer:profiles!pitch_room_judges_reviewer_id_fkey(id, name, email, avatar)");

  if (error) return NextResponse.json({ error: "Failed to assign judges" }, { status: 400 });
  return NextResponse.json({ data });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleRemoveJudge(supabase: any, body: any) {
  const { roomId, reviewerId } = body;
  if (!roomId || !UUID_RE.test(roomId)) {
    return NextResponse.json({ error: "Valid roomId is required" }, { status: 400 });
  }
  if (!reviewerId || !UUID_RE.test(reviewerId)) {
    return NextResponse.json({ error: "Valid reviewerId is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("pitch_room_judges")
    .delete()
    .eq("room_id", roomId)
    .eq("reviewer_id", reviewerId);

  if (error) return NextResponse.json({ error: "Failed to remove judge" }, { status: 400 });
  return NextResponse.json({ data: { removed: true } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleAssignSlots(supabase: any, body: any) {
  const { roomId, slots } = body;
  if (!roomId || !UUID_RE.test(roomId)) {
    return NextResponse.json({ error: "Valid roomId is required" }, { status: 400 });
  }
  if (!Array.isArray(slots) || slots.length === 0) {
    return NextResponse.json({ error: "slots must be a non-empty array" }, { status: 400 });
  }

  for (const slot of slots) {
    if (!slot.registrationId || !UUID_RE.test(slot.registrationId)) {
      return NextResponse.json({ error: "Each slot must have a valid registrationId" }, { status: 400 });
    }
  }

  const rows = slots.map((s: { registrationId: string; slotOrder?: number; scheduledTime?: string; durationMinutes?: number }, idx: number) => ({
    room_id: roomId,
    registration_id: s.registrationId,
    slot_order: s.slotOrder ?? idx,
    scheduled_time: s.scheduledTime ?? null,
    duration_minutes: s.durationMinutes ?? 10,
    status: "pending",
  }));

  const { data, error } = await supabase
    .from("pitch_room_slots")
    .upsert(rows, { onConflict: "room_id,registration_id" })
    .select("id, room_id, registration_id, slot_order, scheduled_time, duration_minutes, status, created_at, registration:hackathon_registrations!pitch_room_slots_registration_id_fkey(id, user_id, applicant:profiles!hackathon_registrations_user_id_fkey(id, name, email, avatar))");

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to assign slots" }, { status: 400 });
  }
  return NextResponse.json({ data });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleRemoveSlot(supabase: any, body: any) {
  const { roomId, registrationId } = body;
  if (!roomId || !UUID_RE.test(roomId)) {
    return NextResponse.json({ error: "Valid roomId is required" }, { status: 400 });
  }
  if (!registrationId || !UUID_RE.test(registrationId)) {
    return NextResponse.json({ error: "Valid registrationId is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("pitch_room_slots")
    .delete()
    .eq("room_id", roomId)
    .eq("registration_id", registrationId);

  if (error) return NextResponse.json({ error: "Failed to remove slot" }, { status: 400 });
  return NextResponse.json({ data: { removed: true } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleUpdateSlotStatus(supabase: any, body: any) {
  const { roomId, registrationId, status } = body;
  if (!roomId || !UUID_RE.test(roomId)) {
    return NextResponse.json({ error: "Valid roomId is required" }, { status: 400 });
  }
  if (!registrationId || !UUID_RE.test(registrationId)) {
    return NextResponse.json({ error: "Valid registrationId is required" }, { status: 400 });
  }
  const validStatuses = ["pending", "in_progress", "completed", "skipped"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("pitch_room_slots")
    .update({ status })
    .eq("room_id", roomId)
    .eq("registration_id", registrationId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update slot status" }, { status: 400 });
  return NextResponse.json({ data });
}

// ── DELETE — Delete a room ───────────────────────────────

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;
    const idError = validateIds(hackathonId, phaseId);
    if (idError) return idError;

    const { auth, error: authError } = await resolveAuth(request);
    if (!auth) return authError;

    const supabase =
      getSupabaseAdminClient();

    const ownership = await verifyOrganizerOwnership(supabase, hackathonId, phaseId, auth.userId);
    if (!ownership.ok) return ownership.res;

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (!roomId || !UUID_RE.test(roomId)) {
      return NextResponse.json({ error: "Valid roomId query param is required" }, { status: 400 });
    }

    // Delete cascades will handle judges and slots if FK ON DELETE CASCADE is set,
    // otherwise delete children first
    await supabase.from("pitch_room_slots").delete().eq("room_id", roomId);
    await supabase.from("pitch_room_judges").delete().eq("room_id", roomId);

    const { error } = await supabase
      .from("pitch_rooms")
      .delete()
      .eq("id", roomId)
      .eq("phase_id", phaseId);

    if (error) return NextResponse.json({ error: "Failed to delete room" }, { status: 400 });
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
