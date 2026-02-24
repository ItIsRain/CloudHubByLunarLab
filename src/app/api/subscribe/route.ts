import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { email, source } = await req.json();

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    if (!source || !["newsletter", "api_waitlist"].includes(source)) {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    const { error } = await supabase
      .from("email_subscribers")
      .insert({ email: email.toLowerCase().trim(), source });

    if (error) {
      // Unique constraint violation = already subscribed
      if (error.code === "23505") {
        return NextResponse.json({ message: "Already subscribed" });
      }
      return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
    }

    return NextResponse.json({ message: "Subscribed successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
