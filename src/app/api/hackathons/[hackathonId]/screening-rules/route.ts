import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import type { ScreeningRule } from "@/lib/types";

export async function GET(
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

    // Verify caller is the hackathon organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id, screening_rules, screening_config, registration_fields")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      data: {
        rules: (hackathon.screening_rules as ScreeningRule[]) || [],
        config: (hackathon.screening_config as Record<string, unknown>) || {},
        fields: (hackathon.registration_fields as Record<string, unknown>[]) || [],
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
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

    // Verify caller is the hackathon organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { rules } = (await request.json()) as { rules: ScreeningRule[] };

    if (!Array.isArray(rules)) {
      return NextResponse.json(
        { error: "rules must be an array of ScreeningRule objects" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("hackathons")
      .update({ screening_rules: rules })
      .eq("id", hackathonId)
      .select("screening_rules")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update screening rules" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: { rules: (data.screening_rules as ScreeningRule[]) || [] },
    });
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

    // Verify caller is the hackathon organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { config } = (await request.json()) as {
      config: {
        quotas?: { campus: string; quota: number }[];
        detectDuplicates?: boolean;
      };
    };

    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { error: "config must be an object" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("hackathons")
      .update({ screening_config: config })
      .eq("id", hackathonId)
      .select("screening_config")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update screening config" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: { config: (data.screening_config as Record<string, unknown>) || {} },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
