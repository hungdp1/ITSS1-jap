import "server-only";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
// Service key preferred (bypasses storage RLS); falls back to the anon/publishable key,
// which works because the `uploads` bucket grants anon INSERT (see supabase_setup.sql).
const SUPABASE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "uploads";

let client: ReturnType<typeof createClient> | null = null;
function getClient() {
    if (!client) {
        if (!SUPABASE_URL || !SUPABASE_KEY) {
            throw new Error("Supabase storage env vars are not set");
        }
        client = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
    }
    return client;
}

function extFromMime(mime: string): string {
    const map: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
        "image/avif": "avif",
        "application/pdf": "pdf",
    };
    return map[mime] || "bin";
}

/**
 * Upload a file buffer to Supabase Storage and return its public URL.
 * @param folder logical sub-folder, e.g. "chat", "avatars", "posts"
 */
export async function uploadBuffer(
    buffer: Buffer,
    mimetype: string,
    folder = "uploads"
): Promise<string> {
    const supabase = getClient();
    const ext = extFromMime(mimetype);
    const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(name, buffer, {
        contentType: mimetype,
        upsert: false,
    });
    if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
    return data.publicUrl;
}
