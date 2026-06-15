import "server-only";

/**
 * Server-side Supabase Realtime broadcast over the REST endpoint.
 * No persistent socket needed — works on Vercel serverless.
 * Clients subscribe to the matching channel/topic and listen for `event`.
 */
const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

export async function broadcast(
    topic: string,
    event: string,
    payload: unknown
): Promise<void> {
    if (!SUPABASE_URL || !KEY) return;
    try {
        await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: KEY,
                Authorization: `Bearer ${KEY}`,
            },
            body: JSON.stringify({
                messages: [{ topic, event, payload }],
            }),
            cache: "no-store",
        });
    } catch {
        // Realtime is best-effort; a failed broadcast must never break the request.
    }
}

/** Fan a payload out to several topics (e.g. both chat participants). */
export async function broadcastMany(
    topics: string[],
    event: string,
    payload: unknown
): Promise<void> {
    await Promise.all(topics.map((t) => broadcast(t, event, payload)));
}
