// Import the Khalifa Fund Final Cohort (name-only, no email column) into the
// hackathon: builds a 4-page application form with proper field types, then
// creates one placeholder profile + an "accepted" registration per applicant.
//
// Run:  node --env-file=.env.local scripts/import-khalifa-cohort.mjs
// Force re-import even if registrations already exist:  FORCE=1 node --env-file=.env.local scripts/import-khalifa-cohort.mjs
import fs from "fs";
import crypto from "crypto";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";

const HACKATHON_ID = "10dcf686-84e0-4dba-9ab1-77b67c517399";
const CSV_PATH = "./Final_Cohort_Applications (1).csv";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const opt = (v) => ({ label: v, value: v }); // option label == value for clean matching

// ── Form sections (pages) ────────────────────────────────────────────
const sections = [
  { id: "sec_overview", title: "Startup Overview", description: "Who you are and where you're based.", order: 0 },
  { id: "sec_problem",  title: "Problem & Solution", description: "The problem you solve and how.", order: 1 },
  { id: "sec_business", title: "Business & Market", description: "Your model and who you serve.", order: 2 },
  { id: "sec_links",    title: "Links & Pitch", description: "Online presence and pitch deck.", order: 3 },
];

// ── Form fields (typed, assigned to pages) ───────────────────────────
const fields = [
  { id: "startup_name", type: "text", label: "Startup Name", required: true, sectionId: "sec_overview", order: 0 },
  { id: "city", type: "select", label: "City", required: true, sectionId: "sec_overview", order: 1,
    options: ["Abu Dhabi City", "Al Ain", "Al Dhafra"].map(opt) },
  { id: "sector", type: "select", label: "Sector", required: true, sectionId: "sec_overview", order: 2,
    options: ["Tourism", "Agriculture", "Energy", "Fintech", "Social & Health"].map(opt) },
  { id: "innovation_focus", type: "select", label: "Innovation Focus", required: false, sectionId: "sec_overview", order: 3,
    options: ["AI", "Robotics", "Sustainability"].map(opt) },
  { id: "one_line_description", type: "textarea", label: "One-Line Description", required: true, sectionId: "sec_overview", order: 4 },

  { id: "problem", type: "textarea", label: "Problem", required: true, sectionId: "sec_problem", order: 5 },
  { id: "proposed_solution", type: "textarea", label: "Proposed Solution", required: true, sectionId: "sec_problem", order: 6 },

  { id: "business_model", type: "textarea", label: "Business Model", required: true, sectionId: "sec_business", order: 7 },
  { id: "target_customer", type: "textarea", label: "Target Customer", required: false, sectionId: "sec_business", order: 8 },

  { id: "website", type: "url", label: "Website", required: false, sectionId: "sec_links", order: 9 },
  { id: "instagram", type: "text", label: "Instagram", required: false, sectionId: "sec_links", order: 10 },
  { id: "pitch_link", type: "url", label: "Pitch Link (Pitch Deck)", required: false, sectionId: "sec_links", order: 11 },
];

// CSV header -> field id
const COLMAP = {
  "Startup Name": "startup_name",
  "City": "city",
  "Sector": "sector",
  "Innovation Focus": "innovation_focus",
  "One-Line Description": "one_line_description",
  "Problem": "problem",
  "Proposed Solution": "proposed_solution",
  "Business Model": "business_model",
  "Target Customer": "target_customer",
  "Website": "website",
  "Instagram": "instagram",
  "Pitch Link": "pitch_link",
};
const valueFieldIds = Object.values(COLMAP); // for completeness scoring

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) || "user";

async function main() {
  // Guard against accidental double-import.
  const { count: existing } = await sb
    .from("hackathon_registrations")
    .select("id", { count: "exact", head: true })
    .eq("hackathon_id", HACKATHON_ID);
  if (existing && existing > 0 && !process.env.FORCE) {
    console.error(`Aborting: hackathon already has ${existing} registrations. Set FORCE=1 to import anyway.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, "utf8").replace(/^﻿/, "");
  const { data: rows, errors } = Papa.parse(raw, { header: true, skipEmptyLines: true });
  if (errors.length) { console.error("CSV parse errors:", errors.slice(0, 3)); process.exit(1); }
  console.log(`Parsed ${rows.length} applicants.`);

  // ── 1. Update the hackathon form (fields + pages + quota field) ─────
  const { data: hk } = await sb
    .from("hackathons")
    .select("screening_config")
    .eq("id", HACKATHON_ID)
    .single();
  const screening_config = { ...(hk?.screening_config || {}), quotaFieldId: "city" };

  const { error: hkErr } = await sb
    .from("hackathons")
    .update({
      registration_fields: fields,
      registration_sections: sections,
      screening_config,
      updated_at: new Date().toISOString(),
    })
    .eq("id", HACKATHON_ID);
  if (hkErr) { console.error("Failed to update hackathon form:", hkErr); process.exit(1); }
  console.log(`Form updated: ${fields.length} fields across ${sections.length} pages, quotaFieldId=city.`);

  // ── 2. Align the Abu Dhabi phase campus filter with the CSV value ──
  const { error: phErr } = await sb
    .from("competition_phases")
    .update({ campus_filter: "Abu Dhabi City" })
    .eq("hackathon_id", HACKATHON_ID)
    .eq("name", "Abu Dhabi Bootcamp");
  if (phErr) console.warn("Warning: could not update Abu Dhabi phase campus_filter:", phErr.message);
  else console.log('Abu Dhabi phase campus_filter set to "Abu Dhabi City".');

  // ── 3. Create one auth user per applicant (name-only) ──────────────
  // profiles.id is FK -> auth.users, and a handle_new_user trigger creates
  // the profile row (name/username/email) from the auth user's metadata. So
  // we just create the auth user with a non-deliverable placeholder email and
  // let the trigger populate the profile.
  const usable = rows
    .map((r) => ({ row: r, name: (r["Name"] || "").trim() }))
    .filter((x) => x.name);
  const skipped = rows.length - usable.length;

  async function mapLimit(items, limit, fn) {
    const out = new Array(items.length);
    let i = 0;
    await Promise.all(
      Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
      })
    );
    return out;
  }

  let created = 0;
  const results = await mapLimit(usable, 8, async ({ row, name }) => {
    const email = `noemail-${crypto.randomUUID()}@import.invalid`;
    const { data, error } = await sb.auth.admin.createUser({
      email, email_confirm: true,
      user_metadata: { full_name: name, name },
    });
    if (error || !data?.user?.id) {
      console.warn(`  ! createUser failed for "${name}": ${error?.message}`);
      return null;
    }
    created++;
    const form_data = {};
    for (const [col, fid] of Object.entries(COLMAP)) {
      const v = (row[col] ?? "").trim();
      if (v) form_data[fid] = v;
    }
    const filled = valueFieldIds.filter((f) => form_data[f]).length;
    return {
      hackathon_id: HACKATHON_ID,
      user_id: data.user.id,
      status: "accepted",
      form_data,
      completeness_score: Math.round((filled / valueFieldIds.length) * 100),
      is_draft: false,
    };
  });
  const registrations = results.filter(Boolean);
  console.log(`Created ${created} auth users / profiles (${skipped} skipped for missing name).`);

  // ── 4. Insert registrations in batches ─────────────────────────────
  const BATCH = 50;
  let insertedRegs = 0;
  for (let i = 0; i < registrations.length; i += BATCH) {
    const { error, count } = await sb.from("hackathon_registrations").insert(registrations.slice(i, i + BATCH), { count: "exact" });
    if (error) { console.error("Registration insert error:", error); process.exit(1); }
    insertedRegs += count ?? registrations.slice(i, i + BATCH).length;
  }

  // ── 5. Keep the cached participant_count in sync ───────────────────
  await sb.from("hackathons").update({ participant_count: insertedRegs }).eq("id", HACKATHON_ID);

  // Per-campus tally for confirmation.
  const byCampus = {};
  for (const reg of registrations) {
    const c = reg.form_data.city || "(none)";
    byCampus[c] = (byCampus[c] || 0) + 1;
  }
  console.log(`\n✅ Imported ${insertedRegs} applicants (${created} profiles).`);
  console.log("By campus:", JSON.stringify(byCampus));
}

main().catch((e) => { console.error(e); process.exit(1); });
