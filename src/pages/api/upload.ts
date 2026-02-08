import { createClient } from "@supabase/supabase-js";
import type { APIRoute } from "astro";

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_KEY or PUBLIC_SUPABASE_URL environment variable."
  );
}

// Service role client for storage operations (server-side only)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================
// Security: File validation
// ============================================================

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

// Allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/tiff",
  "application/pdf",
  "application/postscript", // .ai, .eps
  "application/illustrator", // .ai
  "image/vnd.adobe.photoshop", // .psd
  "application/x-photoshop", // .psd
  "application/zip",
  "application/x-zip-compressed",
]);

// Allowed file extensions
const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "tif",
  "tiff",
  "pdf",
  "ai",
  "eps",
  "psd",
  "zip",
]);

// Allowed folder names (prevent path traversal)
const ALLOWED_FOLDERS = new Set([
  "uploads",
  "papers",
  "products",
  "news",
  "works",
  "services",
  "team",
  "hero",
  "about",
  "orders",
  "partners",
  "faq",
  "general",
]);

// Auth check: unauthenticated requests can only upload to 'orders' folder
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Check authentication status
    const accessToken =
      cookies.get("sb-access-token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");
    const isAuthenticated = !!accessToken;

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const requestedFolder = (formData.get("folder") as string) || "uploads";

    // Unauthenticated users can only upload to 'orders'
    const folder = isAuthenticated ? requestedFolder : "orders";

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // --- File size validation ---
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // --- File extension validation ---
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return new Response(
        JSON.stringify({ error: `File type .${ext} is not allowed.` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // --- MIME type validation ---
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      // Allow empty/unknown MIME (some design files don't have standard MIME)
      // But block known dangerous types
      const dangerousTypes = [
        "text/html",
        "application/javascript",
        "text/javascript",
        "application/x-executable",
      ];
      if (dangerousTypes.includes(file.type)) {
        return new Response(
          JSON.stringify({ error: `MIME type ${file.type} is not allowed.` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // --- Folder path traversal prevention ---
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "");
    const finalFolder = ALLOWED_FOLDERS.has(safeFolder)
      ? safeFolder
      : "uploads";

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${finalFolder}/${timestamp}-${randomStr}.${ext}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { error } = await supabaseAdmin.storage
      .from("images")
      .upload(fileName, uint8Array, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      return new Response(JSON.stringify({ error: "Upload failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("images")
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        success: true,
        url: urlData.publicUrl,
        path: fileName,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(JSON.stringify({ error: "Upload failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
