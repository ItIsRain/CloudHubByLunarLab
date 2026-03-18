import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToHackathon } from "@/lib/supabase/mappers";
import { getCurrentPhase, rowToTimeline } from "@/lib/hackathon-phases";
import { hasPrivateEntityAccess } from "@/lib/supabase/auth-helpers";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { writeAuditLog } from "@/lib/audit";
import { checkHackathonAccess, canEdit } from "@/lib/check-hackathon-access";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

function hackathonFilter(id: string) {
  return UUID_RE.test(id) ? `id.eq.${id}` : `slug.eq.${id}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    const hasBearer = request.headers.get("authorization")?.startsWith("Bearer ");
    if (hasBearer && auth.type === "unauthenticated") {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("hackathons")
      .select("*, organizer:profiles!organizer_id(*), teams(count), submissions(count)")
      .or(hackathonFilter(hackathonId))
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Hackathon not found" },
        { status: 404 }
      );
    }

    const row = data as Record<string, unknown>;

    // Private hackathons: only organizer or accepted invitees can view
    if (row.visibility === "private") {
      const userId = auth.type !== "unauthenticated" ? auth.userId : undefined;
      let userEmail: string | undefined;

      if (auth.type === "session") {
        const { data: { user } } = await supabase.auth.getUser();
        userEmail = user?.email ?? undefined;
      } else if (auth.type === "api_key") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", auth.userId)
          .single();
        userEmail = (profile?.email as string) ?? undefined;
      }

      const canAccess = await hasPrivateEntityAccess(supabase, "hackathon", row.id as string, userId, userEmail);
      if (!canAccess) {
        return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
      }
    }

    // Auto-update status based on timeline dates (immutable — create new row object)
    const timeline = rowToTimeline(row);
    const computedPhase = getCurrentPhase(timeline);
    const effectiveRow =
      timeline.status !== "draft" && row.status !== computedPhase
        ? { ...row, status: computedPhase }
        : row;

    if (effectiveRow !== row) {
      // Fire-and-forget DB update
      supabase
        .from("hackathons")
        .update({ status: computedPhase })
        .eq("id", row.id as string)
        .then(({ error: updateErr }) => {
          if (updateErr) console.warn("Failed to auto-update hackathon status:", updateErr);
        });
    }

    const headers: Record<string, string> = row.visibility === "public"
      ? { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }
      : {};

    return NextResponse.json(
      { data: dbRowToHackathon(effectiveRow) },
      { headers }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Verify ownership or collaborator access (owner/admin/editor can edit)
    const { data: existing } = await supabase
      .from("hackathons")
      .select("organizer_id, hacking_start, hacking_end, submission_deadline, registration_start, registration_end, judging_start, judging_end")
      .or(hackathonFilter(hackathonId))
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Hackathon not found" },
        { status: 404 }
      );
    }

    const hackathonUuid = UUID_RE.test(hackathonId) ? hackathonId : (existing as Record<string, unknown>).id as string;
    const access = await checkHackathonAccess(supabase, hackathonUuid, auth.userId);
    if (!access.hasAccess || !canEdit(access.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Allowlist + camelCase-to-snake_case key mapping
    const keyMap: Record<string, string> = {
      name: "name", tagline: "tagline", description: "description",
      cover_image: "cover_image", coverImage: "cover_image",
      logo: "logo", category: "category", tags: "tags", status: "status",
      location: "location",
      registration_start: "registration_start", registrationStart: "registration_start",
      registration_end: "registration_end", registrationEnd: "registration_end",
      hacking_start: "hacking_start", hackingStart: "hacking_start",
      hacking_end: "hacking_end", hackingEnd: "hacking_end",
      submission_deadline: "submission_deadline", submissionDeadline: "submission_deadline",
      judging_start: "judging_start", judgingStart: "judging_start",
      judging_end: "judging_end", judgingEnd: "judging_end",
      winners_announcement: "winners_announcement", winnersAnnouncement: "winners_announcement",
      max_team_size: "max_team_size", maxTeamSize: "max_team_size",
      min_team_size: "min_team_size", minTeamSize: "min_team_size",
      allow_solo: "allow_solo", allowSolo: "allow_solo",
      total_prize_pool: "total_prize_pool", totalPrizePool: "total_prize_pool",
      judging_criteria: "judging_criteria", judgingCriteria: "judging_criteria",
      tracks: "tracks", prizes: "prizes", rules: "rules",
      requirements: "requirements", resources: "resources", sponsors: "sponsors",
      faqs: "faqs", schedule: "schedule", judges: "judges", mentors: "mentors",
      visibility: "visibility", type: "type", eligibility: "eligibility",
      registration_fields: "registration_fields", registrationFields: "registration_fields",
      registration_sections: "registration_sections", registrationSections: "registration_sections",
      screening_rules: "screening_rules", screeningRules: "screening_rules",
      screening_config: "screening_config", screeningConfig: "screening_config",
      rsvp_deadline: "rsvp_deadline", rsvpDeadline: "rsvp_deadline",
      registration_editable_until: "registration_editable_until", registrationEditableUntil: "registration_editable_until",
    };
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (key in keyMap) updates[keyMap[key]] = value;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Validate visibility
    if (updates.visibility) {
      if (!["public", "private", "unlisted"].includes(updates.visibility as string)) {
        return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
      }
    }

    // Validate status against allowed values
    if (updates.status) {
      const allowedStatuses = [
        "draft", "published", "registration-open", "registration-closed",
        "hacking", "submission", "judging",
        "completed", "cancelled", "upcoming",
      ];
      if (!allowedStatuses.includes(updates.status as string)) {
        return NextResponse.json(
          { error: "Invalid hackathon status" },
          { status: 400 }
        );
      }
    }

    // Validate category
    if (updates.category) {
      const { categories: cats } = await import("@/lib/constants");
      if (!cats.map((c) => c.value).includes(updates.category as string)) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
    }

    // Validate type
    if (updates.type) {
      if (!["in-person", "online", "virtual", "hybrid"].includes(updates.type as string)) {
        return NextResponse.json({ error: "Invalid hackathon type" }, { status: 400 });
      }
    }

    // Validate tags
    if (updates.tags && (!Array.isArray(updates.tags) || (updates.tags as string[]).length > 20)) {
      return NextResponse.json({ error: "Tags must be an array of up to 20 items" }, { status: 400 });
    }

    // Validate total_prize_pool
    if (updates.total_prize_pool !== undefined) {
      if (typeof updates.total_prize_pool !== "number" || (updates.total_prize_pool as number) < 0) {
        return NextResponse.json({ error: "total_prize_pool must be a non-negative number" }, { status: 400 });
      }
    }

    // Validate team sizes
    if (updates.min_team_size !== undefined) {
      if (typeof updates.min_team_size !== "number" || !Number.isInteger(updates.min_team_size) || (updates.min_team_size as number) < 1) {
        return NextResponse.json({ error: "min_team_size must be a positive integer" }, { status: 400 });
      }
    }
    if (updates.max_team_size !== undefined) {
      if (typeof updates.max_team_size !== "number" || !Number.isInteger(updates.max_team_size) || (updates.max_team_size as number) < 1) {
        return NextResponse.json({ error: "max_team_size must be a positive integer" }, { status: 400 });
      }
    }

    // Validate date formats for all timeline fields
    const DATE_FIELDS = [
      "registration_start", "registration_end", "hacking_start", "hacking_end",
      "submission_deadline", "judging_start", "judging_end", "winners_announcement",
    ];
    for (const field of DATE_FIELDS) {
      if (updates[field] !== undefined) {
        // Allow empty strings to clear dates, convert to null
        if (updates[field] === "" || updates[field] === null) {
          updates[field] = null;
          continue;
        }
        if (typeof updates[field] !== "string" || !ISO_DATE_RE.test(updates[field] as string) || isNaN(Date.parse(updates[field] as string))) {
          return NextResponse.json({ error: `Invalid ${field} format. Use ISO 8601.` }, { status: 400 });
        }
      }
    }

    // Validate date chronology (merge with existing values)
    const mergedDates: Record<string, Date> = {};
    for (const field of DATE_FIELDS) {
      const value = updates[field] ?? existing[field as keyof typeof existing];
      if (value) mergedDates[field] = new Date(value as string);
    }
    if (mergedDates.registration_start && mergedDates.registration_end && mergedDates.registration_start >= mergedDates.registration_end) {
      return NextResponse.json({ error: "registration_end must be after registration_start" }, { status: 400 });
    }
    if (mergedDates.hacking_start && mergedDates.hacking_end && mergedDates.hacking_start >= mergedDates.hacking_end) {
      return NextResponse.json({ error: "hacking_end must be after hacking_start" }, { status: 400 });
    }
    if (mergedDates.hacking_end && mergedDates.submission_deadline && mergedDates.submission_deadline < mergedDates.hacking_end) {
      return NextResponse.json({ error: "submission_deadline must be on or after hacking_end" }, { status: 400 });
    }
    if (mergedDates.judging_start && mergedDates.judging_end && mergedDates.judging_start >= mergedDates.judging_end) {
      return NextResponse.json({ error: "judging_end must be after judging_start" }, { status: 400 });
    }

    // Validate registration_fields (if provided)
    if (updates.registration_fields !== undefined) {
      if (!Array.isArray(updates.registration_fields)) {
        return NextResponse.json({ error: "registration_fields must be an array" }, { status: 400 });
      }
      if ((updates.registration_fields as unknown[]).length > 200) {
        return NextResponse.json({ error: "Maximum 200 registration fields allowed" }, { status: 400 });
      }
      const validFieldTypes = new Set([
        "text", "textarea", "email", "phone", "url", "number", "date",
        "select", "multi_select", "radio", "checkbox", "file", "heading", "paragraph",
      ]);
      const fieldIds = new Set<string>();
      for (const f of updates.registration_fields as Record<string, unknown>[]) {
        if (!f || typeof f !== "object") {
          return NextResponse.json({ error: "Each registration field must be an object" }, { status: 400 });
        }
        if (!f.id || typeof f.id !== "string") {
          return NextResponse.json({ error: "Each registration field must have a string id" }, { status: 400 });
        }
        if (fieldIds.has(f.id as string)) {
          return NextResponse.json({ error: `Duplicate field id "${f.id}"` }, { status: 400 });
        }
        fieldIds.add(f.id as string);
        if (!f.type || !validFieldTypes.has(f.type as string)) {
          return NextResponse.json({ error: `Invalid field type "${f.type}" for field "${f.id}"` }, { status: 400 });
        }
        if (f.label && typeof f.label === "string" && (f.label as string).length > 500) {
          return NextResponse.json({ error: `Field label too long for "${f.id}" (max 500 chars)` }, { status: 400 });
        }
      }
    }

    // Validate registration_sections (if provided)
    if (updates.registration_sections !== undefined) {
      if (!Array.isArray(updates.registration_sections)) {
        return NextResponse.json({ error: "registration_sections must be an array" }, { status: 400 });
      }
      if ((updates.registration_sections as unknown[]).length > 50) {
        return NextResponse.json({ error: "Maximum 50 registration sections allowed" }, { status: 400 });
      }
    }

    // Prevent publishing without required dates
    const targetStatus = updates.status as string | undefined;
    if (targetStatus && targetStatus !== "draft") {
      const hackStart = updates.hacking_start ?? existing.hacking_start;
      const hackEnd = updates.hacking_end ?? existing.hacking_end;
      const subDeadline = updates.submission_deadline ?? existing.submission_deadline;

      if (!hackStart || !hackEnd || !subDeadline) {
        return NextResponse.json(
          { error: "hacking_start, hacking_end, and submission_deadline are required before publishing" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from("hackathons")
      .update(updates)
      .or(hackathonFilter(hackathonId))
      .select("*, organizer:profiles!organizer_id(*), teams(count), submissions(count)")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update hackathon" }, { status: 400 });
    }

    await writeAuditLog({
      actorId: auth.userId,
      action: "update",
      entityType: "hackathon",
      entityId: hackathonId,
      newValues: updates,
    }, request);

    return NextResponse.json({
      data: dbRowToHackathon(data as Record<string, unknown>),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Verify ownership — only the owner can delete
    const { data: existing } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .or(hackathonFilter(hackathonId))
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Hackathon not found" },
        { status: 404 }
      );
    }

    const delHackathonUuid = UUID_RE.test(hackathonId) ? hackathonId : (existing as Record<string, unknown>).id as string;
    const delAccess = await checkHackathonAccess(supabase, delHackathonUuid, auth.userId);
    if (!delAccess.hasAccess || delAccess.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("hackathons")
      .delete()
      .or(hackathonFilter(hackathonId));

    if (error) {
      return NextResponse.json({ error: "Failed to delete hackathon" }, { status: 400 });
    }

    await writeAuditLog({
      actorId: auth.userId,
      action: "delete",
      entityType: "hackathon",
      entityId: hackathonId,
    }, request);

    return NextResponse.json({ message: "Hackathon deleted successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
