import { getApiBaseUrl } from "@/lib/env";

export type PublicStatsPayload = {
    activeUserCount: number;
    recentAvatars: string[];
};

const EMPTY_STATS: PublicStatsPayload = {
    activeUserCount: 0,
    recentAvatars: [],
};

export async function fetchPublicStats(): Promise<PublicStatsPayload> {
    try {
        const res = await fetch(`${getApiBaseUrl()}/stats/public`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            next: { revalidate: 60 },
        });

        const data: unknown = await res.json().catch(() => null);

        if (!res.ok || !data || typeof data !== "object") {
            return EMPTY_STATS;
        }

        const record = data as Record<string, unknown>;

        return {
            activeUserCount:
                typeof record.activeUserCount === "number" ? record.activeUserCount : 0,
            recentAvatars: Array.isArray(record.recentAvatars)
                ? record.recentAvatars.filter(
                      (url: unknown): url is string => typeof url === "string"
                  )
                : [],
        };
    } catch {
        return EMPTY_STATS;
    }
}
