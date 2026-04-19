import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";

const VALID_CATEGORIES = [
  "acceptance",
  "rejection",
  "waitlist",
  "reminder",
  "announcement",
  "rsvp",
  "custom",
] as const;

type TemplateCategory = (typeof VALID_CATEGORIES)[number];

function isValidCategory(value: unknown): value is TemplateCategory {
  return (
    typeof value === "string" &&
    VALID_CATEGORIES.includes(value as TemplateCategory)
  );
}

/**
 * Authenticate and authorize the request, returning the supabase client
 * if the caller is the hackathon organizer.
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
// GET — Get a single email template by ID
// =====================================================
export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ hackathonId: string; templateId: string }> }
) {
  try {
    const { hackathonId, templateId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid competition ID" },
        { status: 400 }
      );
    }
    if (!UUID_RE.test(templateId)) {
      return NextResponse.json(
        { error: "Invalid template ID" },
        { status: 400 }
      );
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;

    const { supabase } = result;

    const { data: template, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", templateId)
      .eq("hackathon_id", hackathonId)
      .single();

    if (error || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: template });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH — Update a single email template by ID
// =====================================================
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ hackathonId: string; templateId: string }> }
) {
  try {
    const { hackathonId, templateId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid competition ID" },
        { status: 400 }
      );
    }
    if (!UUID_RE.test(templateId)) {
      return NextResponse.json(
        { error: "Invalid template ID" },
        { status: 400 }
      );
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;

    const { supabase } = result;

    const updates = await request.json();

    // Build the update payload with only allowed fields
    const allowedFields = [
      "name",
      "subject",
      "body",
      "category",
      "placeholders",
      "is_default",
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

    if ("subject" in updatePayload) {
      const subject = updatePayload.subject;
      if (
        !subject ||
        typeof subject !== "string" ||
        subject.trim().length === 0
      ) {
        return NextResponse.json(
          { error: "subject cannot be empty" },
          { status: 400 }
        );
      }
      if ((subject as string).length > 500) {
        return NextResponse.json(
          { error: "subject must be at most 500 characters" },
          { status: 400 }
        );
      }
      updatePayload.subject = (subject as string).trim();
    }

    if ("body" in updatePayload) {
      const templateBody = updatePayload.body;
      if (
        !templateBody ||
        typeof templateBody !== "string" ||
        (templateBody as string).trim().length === 0
      ) {
        return NextResponse.json(
          { error: "body cannot be empty" },
          { status: 400 }
        );
      }
      if ((templateBody as string).length > 50000) {
        return NextResponse.json(
          { error: "body must be at most 50000 characters" },
          { status: 400 }
        );
      }
    }

    if ("category" in updatePayload) {
      if (!isValidCategory(updatePayload.category)) {
        return NextResponse.json(
          {
            error: `category must be one of: ${VALID_CATEGORIES.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    if ("placeholders" in updatePayload) {
      const placeholders = updatePayload.placeholders;
      if (placeholders !== null) {
        if (!Array.isArray(placeholders)) {
          return NextResponse.json(
            { error: "placeholders must be an array or null" },
            { status: 400 }
          );
        }
        if (placeholders.length > 50) {
          return NextResponse.json(
            { error: "placeholders must have at most 50 items" },
            { status: 400 }
          );
        }
      }
    }

    if ("is_default" in updatePayload) {
      if (typeof updatePayload.is_default !== "boolean") {
        return NextResponse.json(
          { error: "is_default must be a boolean" },
          { status: 400 }
        );
      }
    }

    const { data: template, error } = await supabase
      .from("email_templates")
      .update(updatePayload)
      .eq("id", templateId)
      .eq("hackathon_id", hackathonId)
      .select("*")
      .single();

    if (error || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: template });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE — Delete a single email template by ID
// =====================================================
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ hackathonId: string; templateId: string }> }
) {
  try {
    const { hackathonId, templateId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid competition ID" },
        { status: 400 }
      );
    }
    if (!UUID_RE.test(templateId)) {
      return NextResponse.json(
        { error: "Invalid template ID" },
        { status: 400 }
      );
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;

    const { supabase } = result;

    const { error, count } = await supabase
      .from("email_templates")
      .delete()
      .eq("id", templateId)
      .eq("hackathon_id", hackathonId);

    if (error) {
      console.error("Failed to delete email template:", error);
      return NextResponse.json(
        { error: "Failed to delete email template" },
        { status: 500 }
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Template deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
