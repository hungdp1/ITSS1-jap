import { normalizeSearchQuery } from "@/lib/search";
import { readSessionCache, writeSessionCache } from "@/lib/session-cache";
import type { ApiEvent } from "@/lib/events-format";

export const EVENTS_CACHE_TTL_MS = 60_000;

export type EventFormat = "online" | "offline" | "all";

export type EventsListData = {
    data: ApiEvent[];
    hasMore: boolean;
    total?: number;
};

export type EventsListResult =
    | { success: true; data: EventsListData }
    | { success: false; message: string };

function eventsCacheKey(format: EventFormat, page: number, search?: string) {
    return `events:v2:${format}:${page}:${normalizeSearchQuery(search) ?? ""}`;
}

export function readEventsCache(
    format: EventFormat = "all",
    page = 1,
    search?: string
): EventsListData | null {
    return readSessionCache<EventsListData>(eventsCacheKey(format, page, search), EVENTS_CACHE_TTL_MS);
}

export async function fetchEventsListClient(params?: {
    page?: number;
    format?: EventFormat;
    search?: string;
    force?: boolean;
}): Promise<EventsListResult> {
    const page = params?.page ?? 1;
    const format = params?.format ?? "all";
    const search = params?.search;
    const cacheKey = eventsCacheKey(format, page, search);

    if (!params?.force) {
        const cached = readSessionCache<EventsListData>(cacheKey, EVENTS_CACHE_TTL_MS);
        if (cached) {
            return { success: true, data: cached };
        }
    }

    const query = new URLSearchParams();
    query.set("page", String(page));
    if (format !== "all") query.set("format", format);
    const normalizedSearch = normalizeSearchQuery(search);
    if (normalizedSearch) query.set("search", normalizedSearch);

    try {
        const res = await fetch(`/api/events?${query}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const message =
                data && typeof data === "object" && "error" in data && typeof data.error === "string"
                    ? data.error
                    : "イベントの取得に失敗しました。";
            return { success: false, message };
        }

        const payload: EventsListData = {
            data: Array.isArray(data?.data) ? data.data : [],
            hasMore: Boolean(data?.hasMore),
            total: data?.total,
        };
        writeSessionCache(cacheKey, payload);
        return { success: true, data: payload };
    } catch (error: unknown) {
        return {
            success: false,
            message: error instanceof Error ? error.message : "イベントの取得に失敗しました。",
        };
    }
}

export function prefetchEventsList() {
    void fetchEventsListClient({ page: 1, format: "all" });
}
