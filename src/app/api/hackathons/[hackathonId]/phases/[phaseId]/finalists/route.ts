import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";

type RouteParams = { params: Promise<{ hackathonId: string; phaseId: string }> };

// ── Shared organizer auth ───────────────────────────────

async function authenticateOrganizer(
  request: NextRequest,
  hackathonId: string
) {
  const auth = await authenticateRequest(request);

  if (auth.type === "unauthenticated") {
    return {
      auth: null,
      supabase: null,
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    } as const;
  }

  if (auth.type === "api_key") {
    const scopeError = assertScope(auth, "/api/hackathons");
    if (scopeError) {
      return {
        auth: null,
        supabase: null,
        error: NextResponse.json({ error: scopeError }, { status: 403 }),
      } as const;
    }
  }

  const supabase = getSupabaseAdminClient();

  const { data: hackathon } = await supabase
    .from("hackathons")
    .select("organizer_id")
    .eq("id", hackathonId)
    .single();

  if (!hackathon) {
    return {
      auth: null,
      supabase: null,
      error: NextResponse.json({ error: "Hackathon not found" }, { status: 404 }),
    } as const;
  }

  if (hackathon.organizer_id !== auth.userId) {
    return {
      auth: null,
      supabase: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }

  return { auth, supabase, error: null } as const;
}

// ── GET — List finalists for a phase ────────────────────

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;

    if (!UUID_RE.test(hackathonId) || !UUID_RE.test(phaseId)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const { supabase, error } = await authenticateOrganizer(request, hackathonId);
    if (error) return error;

    // Verify phase belongs to hackathon
    const { data: phase } = await supabase
      .from("competition_phases")
      .select("id")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (!phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    const { data: finalists, error: fetchError } = await supabase
      .from("phase_finalists")
      .select(`
        id,
        phase_id,
        registration_id,
        source_phase_id,
        source_score,
        rank,
        award_category_id,
        award_label,
        selected_at,
        selected_by,
        registration:hackathon_registrations!phase_finalists_registration_id_fkey(
          id,
          user_id,
          form_data,
          applicant:profiles!hackathon_registrations_user_id_fkey(id, name, email)
        ),
        source_phase:competition_phases!phase_finalists_source_phase_id_fkey(id, name, campus_filter)
      `)
      .eq("phase_id", phaseId)
      .order("rank", { ascending: true, nullsFirst: false });

    if (fetchError) {
      console.error("Failed to fetch finalists:", fetchError);
      return NextResponse.json({ error: "Failed to fetch finalists" }, { status: 500 });
    }

    // Look up competition_winners for these registrations to merge award labels
    const finalistRegIds = (finalists || []).map((f) => f.registration_id as string);
    let winnerAwardMap: Record<string, { awardLabel: string; trackName: string | null }> = {};
    if (finalistRegIds.length > 0) {
      const { data: winners } = await supabase
        .from("competition_winners")
        .select("registration_id, award_label, track:award_tracks(name)")
        .eq("hackathon_id", hackathonId)
        .in("registration_id", finalistRegIds);

      for (const w of winners || []) {
        const row = w as Record<string, unknown>;
        const regId = row.registration_id as string;
        const track = Array.isArray(row.track) ? row.track[0] : row.track;
        winnerAwardMap[regId] = {
          awardLabel: row.award_label as string,
          trackName: (track as Record<string, unknown> | null)?.name as string | null,
        };
      }
    }

    const data = (finalists || []).map((f) => {
      const reg = f.registration as unknown as Record<string, unknown> | null;
      const applicant = reg?.applicant as unknown as Record<string, unknown> | null;
      const srcPhase = f.source_phase as unknown as Record<string, unknown> | null;
      // Merge: prefer finalist's own award_label, fallback to winner's award
      const winnerAward = winnerAwardMap[f.registration_id as string];
      const resolvedAwardLabel = (f.award_label as string | null)
        || winnerAward?.awardLabel
        || null;
      return {
        id: f.id,
        phaseId: f.phase_id,
        registrationId: f.registration_id,
        sourcePhaseId: f.source_phase_id,
        sourceScore: f.source_score,
        rank: f.rank,
        awardCategoryId: f.award_category_id,
        awardLabel: resolvedAwardLabel,
        selectedAt: f.selected_at,
        selectedBy: f.selected_by,
        applicantName: applicant?.name || "Unknown",
        applicantEmail: applicant?.email || "",
        sourcePhaseName: srcPhase?.name || null,
        sourceCampus: srcPhase?.campus_filter || null,
      };
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST — Select finalists from source phases ──────────
// Accepts either manual selection or auto-select from top scores.

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;

    if (!UUID_RE.test(hackathonId) || !UUID_RE.test(phaseId)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const { auth, supabase, error } = await authenticateOrganizer(request, hackathonId);
    if (error) return error;

    // Rate limit: 10 finalist selection ops per organizer per minute
    const rl = checkRateLimit(auth!.userId, { namespace: "finalists-select", limit: 10, windowMs: 60_000 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    // Verify phase exists and belongs to hackathon
    const { data: phase } = await supabase
      .from("competition_phases")
      .select("id, source_phase_ids, award_categories")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (!phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const mode = body.mode as string; // "auto" or "manual"

    if (mode === "auto") {
      return handleAutoSelect(supabase, phase, phaseId, hackathonId, auth!.userId, body);
    } else if (mode === "manual") {
      return handleManualSelect(supabase, phaseId, auth!.userId, body);
    } else {
      return NextResponse.json(
        { error: "mode must be 'auto' or 'manual'" },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Auto-select: Pull top N from source phases by average score ──

async function handleAutoSelect(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  phase: Record<string, unknown>,
  phaseId: string,
  hackathonId: string,
  userId: string,
  body: Record<string, unknown>
) {
  const topN = body.topN as number;
  if (!topN || typeof topN !== "number" || topN < 1 || topN > 500) {
    return NextResponse.json(
      { error: "topN must be a positive integer (1-500)" },
      { status: 400 }
    );
  }

  const sourcePhaseIds = phase.source_phase_ids as string[] | null;
  if (!sourcePhaseIds || sourcePhaseIds.length === 0) {
    return NextResponse.json(
      { error: "Phase has no source phases configured. Set sourcePhaseIds first." },
      { status: 400 }
    );
  }

  // Verify all source phases belong to this hackathon
  const { data: sourcePhases, error: spError } = await supabase
    .from("competition_phases")
    .select("id")
    .in("id", sourcePhaseIds)
    .eq("hackathon_id", hackathonId);

  if (spError || !sourcePhases || sourcePhases.length !== sourcePhaseIds.length) {
    return NextResponse.json(
      { error: "One or more source phases are invalid or do not belong to this hackathon" },
      { status: 400 }
    );
  }

  // Aggregate scores across all source phases
  // Get all phase_scores for these source phases, compute per-registration averages
  const { data: scores, error: scoresError } = await supabase
    .from("phase_scores")
    .select("registration_id, phase_id, total_score")
    .in("phase_id", sourcePhaseIds);

  if (scoresError) {
    return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
  }

  // Group scores by registration_id, track best source phase
  const regScores: Record<
    string,
    { totalScore: number; count: number; bestPhaseId: string; bestScore: number }
  > = {};

  for (const s of scores || []) {
    const row = s as Record<string, unknown>;
    const regId = row.registration_id as string;
    const score = Number(row.total_score) || 0;
    const srcPhaseId = row.phase_id as string;

    if (!regScores[regId]) {
      regScores[regId] = { totalScore: 0, count: 0, bestPhaseId: srcPhaseId, bestScore: score };
    }
    regScores[regId].totalScore += score;
    regScores[regId].count += 1;
    if (score > regScores[regId].bestScore) {
      regScores[regId].bestScore = score;
      regScores[regId].bestPhaseId = srcPhaseId;
    }
  }

  // Sort by average score descending
  const allRanked = Object.entries(regScores)
    .map(([regId, data]) => ({
      registrationId: regId,
      avgScore: data.count > 0 ? data.totalScore / data.count : 0,
      bestPhaseId: data.bestPhaseId,
      bestScore: data.bestScore,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  if (allRanked.length === 0) {
    return NextResponse.json(
      { error: "No scored registrations found in source phases" },
      { status: 404 }
    );
  }

  // Campus quota enforcement (optional)
  // campusQuotas: { field: "campus_field_id", quotas: { "Abu Dhabi": 5, "Al Ain": 5, "Al Dhafra": 5 } }
  const campusQuotas = body.campusQuotas as {
    field: string;
    quotas: Record<string, number>;
  } | undefined;

  let ranked: typeof allRanked;

  if (campusQuotas && campusQuotas.field && campusQuotas.quotas) {
    // Fetch form_data for all ranked registrations to determine campus
    const regIds = allRanked.map((r) => r.registrationId);
    const { data: regs } = await supabase
      .from("hackathon_registrations")
      .select("id, form_data")
      .in("id", regIds);

    const formDataMap: Record<string, Record<string, unknown>> = {};
    for (const reg of regs || []) {
      formDataMap[reg.id as string] = (reg.form_data as Record<string, unknown>) || {};
    }

    // Group by campus
    const campusGroups: Record<string, typeof allRanked> = {};
    const noCampus: typeof allRanked = [];

    for (const r of allRanked) {
      const fd = formDataMap[r.registrationId];
      const campusValue = fd ? String(fd[campusQuotas.field] || "") : "";
      if (campusValue && campusQuotas.quotas[campusValue] !== undefined) {
        if (!campusGroups[campusValue]) campusGroups[campusValue] = [];
        campusGroups[campusValue].push(r);
      } else {
        noCampus.push(r);
      }
    }

    // Pick top N from each campus group
    ranked = [];
    for (const [campus, group] of Object.entries(campusGroups)) {
      const quota = campusQuotas.quotas[campus] || 0;
      ranked.push(...group.slice(0, quota));
    }
    // Fill remaining slots from noCampus if total < topN
    const remaining = topN - ranked.length;
    if (remaining > 0) {
      ranked.push(...noCampus.slice(0, remaining));
    }
    // Re-sort by score
    ranked.sort((a, b) => b.avgScore - a.avgScore);
  } else {
    ranked = allRanked.slice(0, topN);
  }

  // Clear existing finalists for this phase (replace mode)
  await supabase.from("phase_finalists").delete().eq("phase_id", phaseId);

  // Insert new finalists
  const inserts = ranked.map((r, idx) => ({
    phase_id: phaseId,
    registration_id: r.registrationId,
    source_phase_id: r.bestPhaseId,
    source_score: Math.round(r.avgScore * 100) / 100,
    rank: idx + 1,
    selected_by: userId,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("phase_finalists")
    .insert(inserts)
    .select("*");

  if (insertError) {
    console.error("Failed to insert finalists:", insertError);
    return NextResponse.json({ error: "Failed to select finalists" }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      selected: inserted?.length || 0,
      topN,
      sourcePhases: sourcePhaseIds.length,
    },
  }, { status: 201 });
}

// ── Manual select: Add specific registrations as finalists ──

async function handleManualSelect(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  phaseId: string,
  userId: string,
  body: Record<string, unknown>
) {
  const selections = body.selections as Array<{
    registrationId: string;
    sourcePhaseId?: string;
    sourceScore?: number;
    rank?: number;
    awardCategoryId?: string;
    awardLabel?: string;
  }>;

  if (!Array.isArray(selections) || selections.length === 0) {
    return NextResponse.json(
      { error: "selections must be a non-empty array" },
      { status: 400 }
    );
  }

  if (selections.length > 500) {
    return NextResponse.json(
      { error: "Cannot select more than 500 finalists at once" },
      { status: 400 }
    );
  }

  // Validate each selection
  for (const sel of selections) {
    if (!sel.registrationId || !UUID_RE.test(sel.registrationId)) {
      return NextResponse.json(
        { error: "Each selection must have a valid registrationId" },
        { status: 400 }
      );
    }
    if (sel.sourcePhaseId !== undefined && !UUID_RE.test(sel.sourcePhaseId)) {
      return NextResponse.json(
        { error: "sourcePhaseId must be a valid UUID" },
        { status: 400 }
      );
    }
    if (sel.rank !== undefined && (typeof sel.rank !== "number" || sel.rank < 1)) {
      return NextResponse.json(
        { error: "rank must be a positive integer" },
        { status: 400 }
      );
    }
    if (sel.awardLabel !== undefined && typeof sel.awardLabel === "string" && sel.awardLabel.length > 300) {
      return NextResponse.json(
        { error: "awardLabel must be under 300 characters" },
        { status: 400 }
      );
    }
  }

  const inserts = selections.map((sel) => ({
    phase_id: phaseId,
    registration_id: sel.registrationId,
    source_phase_id: sel.sourcePhaseId || null,
    source_score: sel.sourceScore != null ? Math.round(sel.sourceScore * 100) / 100 : null,
    rank: sel.rank || null,
    award_category_id: sel.awardCategoryId || null,
    award_label: sel.awardLabel || null,
    selected_by: userId,
  }));

  // Use upsert to handle re-selections (unique constraint on phase_id + registration_id)
  const { data: upserted, error: upsertError } = await supabase
    .from("phase_finalists")
    .upsert(inserts, { onConflict: "phase_id,registration_id" })
    .select("*");

  if (upsertError) {
    console.error("Failed to upsert finalists:", upsertError);
    return NextResponse.json({ error: "Failed to save finalists" }, { status: 500 });
  }

  return NextResponse.json({
    data: { saved: upserted?.length || 0 },
  }, { status: 201 });
}

// ── DELETE — Remove a finalist from a phase ─────────────

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;

    if (!UUID_RE.test(hackathonId) || !UUID_RE.test(phaseId)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const { supabase, error } = await authenticateOrganizer(request, hackathonId);
    if (error) return error;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const finalistId = body.finalistId as string;
    if (!finalistId || !UUID_RE.test(finalistId)) {
      return NextResponse.json(
        { error: "finalistId is required and must be a valid UUID" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("phase_finalists")
      .delete()
      .eq("id", finalistId)
      .eq("phase_id", phaseId);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to remove finalist" }, { status: 500 });
    }

    return NextResponse.json({ data: { deleted: true, finalistId } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
