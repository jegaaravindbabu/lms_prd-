// ============================================================================
//  Client-side file upload → Supabase Storage (bucket: lesson-files)
// ----------------------------------------------------------------------------
//  Uploads go straight from the browser to Supabase (not through Vercel), so
//  there's no request-size limit to worry about. Uses the PUBLIC anon key — a
//  storage policy allows inserts into this one bucket. Files are served from a
//  public URL. Max 50 MB per file.
// ============================================================================

const MAX_BYTES = 50 * 1024 * 1024;

export async function uploadLessonFile(file: File): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("File uploads aren't configured (missing Supabase settings).");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File is too large (max 50 MB). Paste a link instead.");
  }

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "file";
  const path = `lessons/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;

  const res = await fetch(`${url}/storage/v1/object/lesson-files/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "x-upsert": "true",
      "content-type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}). ${text.slice(0, 120)}`);
  }

  return `${url}/storage/v1/object/public/lesson-files/${path}`;
}
