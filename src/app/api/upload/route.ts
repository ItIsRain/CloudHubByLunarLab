import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import crypto from "crypto";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!;
const API_KEY = process.env.CLOUDINARY_API_KEY!;
const API_SECRET = process.env.CLOUDINARY_API_SECRET!;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  // SVG intentionally excluded — can contain executable JavaScript
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv",
  "application/zip",
  "video/mp4", "video/webm",
]);

const ALLOWED_FOLDERS = new Set([
  "cloudhub/uploads",
  "cloudhub/applications",
  "cloudhub/avatars",
  "cloudhub/events",
  "cloudhub/hackathons",
  "cloudhub/blog",
]);

export async function POST(request: NextRequest) {
  try {
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      return NextResponse.json(
        { error: "Cloudinary not configured" },
        { status: 500 }
      );
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawFolder = (formData.get("folder") as string) || "cloudhub/uploads";
    const context = (formData.get("context") as string) || "";

    // Validate folder against allowlist to prevent path traversal
    const folder = ALLOWED_FOLDERS.has(rawFolder) ? rawFolder : "cloudhub/uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Please upload a supported format (images, PDF, DOC, PPT, XLS, CSV, TXT, ZIP, or MP4)." },
        { status: 400 }
      );
    }

    // Build signed upload params
    const timestamp = Math.floor(Date.now() / 1000);
    const params: Record<string, string> = {
      folder,
      timestamp: String(timestamp),
    };
    if (context) params.context = context;

    // Ensure raw resources (PDFs, docs, etc.) are publicly accessible
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      params.access_mode = "public";
    }

    // Generate signature
    const sortedParams = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");
    const signature = crypto
      .createHash("sha1")
      .update(sortedParams + API_SECRET)
      .digest("hex");

    // Upload to Cloudinary
    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("api_key", API_KEY);
    uploadForm.append("signature", signature);
    for (const [k, v] of Object.entries(params)) {
      uploadForm.append(k, v);
    }

    // Determine resource type
    let resourceType = "auto";
    if (file.type.startsWith("image/")) resourceType = "image";
    else if (file.type.startsWith("video/")) resourceType = "video";
    else resourceType = "raw";

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
      { method: "POST", body: uploadForm }
    );

    if (!uploadRes.ok) {
      const errData = await uploadRes.json().catch(() => ({}));
      console.error("Cloudinary upload error:", errData);
      return NextResponse.json(
        { error: "Upload failed" },
        { status: 500 }
      );
    }

    const result = await uploadRes.json();

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      originalFilename: result.original_filename,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
