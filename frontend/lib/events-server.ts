import { apiGet } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/env";
import type { EventFormat } from "@/app/actions/event";
import { normalizeSearchQuery } from "@/lib/search";

export type EventsListPayload = {
    data: unknown[];
    total: number;
    hasMore: boolean;
};

export async function fetchPublicEventsList(params?: {
    page?: number;
    limit?: number;
}): Promise<EventsListPayload> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();

    try {
        const res = await fetch(`${getApiBaseUrl()}/events/public${qs ? `?${qs}` : ""}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            next: { revalidate: 60 },
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            return { data: [], total: 0, hasMore: false };
        }

        return {
            data: Array.isArray(data?.data) ? data.data : [],
            total: data?.total ?? 0,
            hasMore: Boolean(data?.hasMore),
        };
    } catch (error) {
        console.error("fetchPublicEventsList failed:", error);
        return { data: [], total: 0, hasMore: false };
    }
}

export async function fetchEventsList(params?: {
    page?: number;
    limit?: number;
    format?: EventFormat;
    search?: string;
}) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.format && params.format !== "all") query.set("format", params.format);
    const normalizedSearch = normalizeSearchQuery(params?.search);
    if (normalizedSearch) query.set("search", normalizedSearch);
    const qs = query.toString();
    return apiGet<EventsListPayload>(`/events${qs ? `?${qs}` : ""}`);
}
