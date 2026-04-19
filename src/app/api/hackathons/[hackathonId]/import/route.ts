import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { checkHackathonAccess, canManage } from "@/lib/check-hackathon-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";
import type { FormField } from "@/lib/types";

/**
 * POST /api/hackathons/[hackathonId]/import
 *
 * Bulk-import applicants from a parsed CSV. The client sends:
 *   - newFields: FormField[] — new form fields to add to registrationFields
 *   - rows: { name, email, formData }[] — applicant records
 *
 * For each row the route:
 *   1. Finds or creates a profile for the email
 *   2. Inserts a hackathon_registration with status "pending" and the
 *      form_data keyed by field IDs
 *   3. Skips duplicates (same user + hackathon)
 *
 * Requires owner/admin access on the hackathon.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
    }

    // Auth
    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    // Rate limit: 10 imports per hour
    const rl = checkRateLimit(auth.userId, {
      namespace: "hackathon-csv-import",
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Import rate limit exceeded. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const admin = getSupabaseAdminClient();

    // Verify access
    const access = await checkHackathonAccess(admin, hackathonId, auth.userId);
    if (!access.hasAccess || !canManage(access.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const newFields: FormField[] = Array.isArray(body.newFields) ? body.newFields : [];
    const rows: { name: string; email: string; formData: Record<string, unknown> }[] =
      Array.isArray(body.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows to import" }, { status: 400 });
    }
    if (rows.length > 5000) {
      return NextResponse.json({ error: "Maximum 5000 rows per import" }, { status: 400 });
    }

    // ── Step 1: Merge new fields into hackathon.registration_fields ──

    if (newFields.length > 0) {
      const { data: hackathon } = await admin
        .from("hackathons")
        .select("registration_fields")
        .eq("id", hackathonId)
        .single();

      const existingFields: FormField[] =
        (hackathon?.registration_fields as FormField[]) ?? [];

      // Only add fields whose IDs don't already exist
      const existingIds = new Set(existingFields.map((f) => f.id));
      const fieldsToAdd = newFields
        .filter((f) => !existingIds.has(f.id))
        .map((f, idx) => ({
          ...f,
          order: existingFields.length + idx,
          required: false,
        }));

      if (fieldsToAdd.length > 0) {
        const merged = [...existingFields, ...fieldsToAdd];
        const { error: updateErr } = await admin
          .from("hackathons")
          .update({ registration_fields: merged })
          .eq("id", hackathonId);

        if (updateErr) {
          console.error("[import] Failed to update registration_fields:", updateErr);
          return NextResponse.json(
            { error: "Failed to add new form fields", details: updateErr.message },
            { status: 500 }
          );
        }
      }
    }

    // ── Step 2: Resolve emails → user IDs ───────────────────────────

    const emailToUserId = new Map<string, string>();
    const uniqueEmails = [...new Set(rows.map((r) => r.email.trim().toLowerCase()))];

    // Batch-fetch existing profiles
    // Process in chunks to avoid hitting query-string limits
    const CHUNK = 100;
    for (let i = 0; i < uniqueEmails.length; i += CHUNK) {
      const chunk = uniqueEmails.slice(i, i + CHUNK);
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, email")
        .in("email", chunk);

      if (profiles) {
        for (const p of profiles) {
          emailToUserId.set((p.email as string).toLowerCase(), p.id as string);
        }
      }
    }

    // For emails that have NO existing profile, create auth users + profiles.
    // This uses Supabase Admin Auth API to invite users (sends no email —
    // they'll see the application when they eventually sign up with that
    // email).
    const emailsWithoutProfile = uniqueEmails.filter((e) => !emailToUserId.has(e));

    for (const email of emailsWithoutProfile) {
      try {
        // Find the name from the first matching row
        const row = rows.find((r) => r.email.trim().toLowerCase() === email);
        const name = row?.name ?? email.split("@")[0];

        // Create auth user with a random password (they'll use magic link / OAuth)
        const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: name },
        });

        if (authErr) {
          // User might already exist in auth but not have a profile row
          // Try to find them by email in auth
          const { data: listData } = await admin.auth.admin.listUsers({
            perPage: 1,
            page: 1,
          });
          // Fall back to checking auth users table directly
          const { data: existingAuth } = await admin
            .from("profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();

          if (existingAuth?.id) {
            emailToUserId.set(email, existingAuth.id as string);
          }
          continue;
        }

        if (authUser?.user?.id) {
          emailToUserId.set(email, authUser.user.id);

          // Upsert profile
          await admin.from("profiles").upsert(
            {
              id: authUser.user.id,
              email,
              name: name,
              username: email.split("@")[0].replace(/[^a-z0-9]/gi, "") + Math.random().toString(36).slice(2, 6),
              roles: ["attendee"],
              skills: [],
              interests: [],
              status: "active",
              subscription_tier: "free",
            },
            { onConflict: "id" }
          );
        }
      } catch (err) {
        console.error(`[import] Failed to create user for ${email}:`, err);
      }
    }

    // ── Step 3: Fetch existing registrations to skip duplicates ──────

    const { data: existingRegs } = await admin
      .from("hackathon_registrations")
      .select("user_id")
      .eq("hackathon_id", hackathonId);

    const alreadyRegistered = new Set(
      (existingRegs ?? []).map((r) => r.user_id as string)
    );

    // ── Step 4: Bulk insert registrations ───────────────────────────

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process in batches
    const BATCH = 50;
    const toInsert: {
      hackathon_id: string;
      user_id: string;
      status: string;
      form_data: Record<string, unknown>;
      completeness_score: number;
      is_draft: boolean;
    }[] = [];

    for (const row of rows) {
      const email = row.email.trim().toLowerCase();
      const userId = emailToUserId.get(email);

      if (!userId) {
        errors.push(`No user found for ${email}`);
        skipped++;
        continue;
      }

      if (alreadyRegistered.has(userId)) {
        skipped++;
        continue;
      }

      // Calculate completeness score
      const allFieldIds = [
        ...((newFields ?? []).map((f) => f.id)),
        ...Object.keys(row.formData),
      ];
      const filledCount = Object.entries(row.formData).filter(
        ([, v]) => v !== null && v !== undefined && v !== ""
      ).length;
      const completeness = allFieldIds.length > 0
        ? Math.round((filledCount / allFieldIds.length) * 100)
        : 100;

      toInsert.push({
        hackathon_id: hackathonId,
        user_id: userId,
        status: "pending",
        form_data: row.formData,
        completeness_score: completeness,
        is_draft: false,
      });

      // Mark as registered to avoid dups within the same import
      alreadyRegistered.add(userId);
    }

    // Insert in batches
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      const { error: insertErr, data: inserted } = await admin
        .from("hackathon_registrations")
        .insert(batch)
        .select("id");

      if (insertErr) {
        console.error(`[import] Batch insert error:`, insertErr);
        errors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${insertErr.message}`);
      } else {
        imported += (inserted ?? []).length;
      }
    }

    // ── Step 5: Audit log ───────────────────────────────────────────

    await writeAuditLog(
      {
        actorId: auth.userId,
        action: "import",
        entityType: "hackathon",
        entityId: hackathonId,
        newValues: {
          imported,
          skipped,
          errorCount: errors.length,
          newFieldCount: newFields.length,
          totalRows: rows.length,
        },
      },
      request
    );

    return NextResponse.json({
      imported,
      skipped,
      errors,
      newFieldsAdded: newFields.length,
    });
  } catch (err) {
    console.error("[import] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
