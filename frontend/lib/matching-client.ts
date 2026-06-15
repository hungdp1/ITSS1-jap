import { normalizeSearchQuery } from "@/lib/search";
import { readSessionCache, writeSessionCache } from "@/lib/session-cache";

export const MATCHING_HOME_CACHE_KEY = "matching:home:v2";
export const MATCHING_HOME_CACHE_TTL_MS = 60_000;

export type MatchingHomeData = {
    filterOptions: {
        purposes: string[];
        hobbies: string[];
    };
    search: {
        data: unknown[];
        total: number;
        hasMore: boolean;
    };
};

export type MatchingHomeResult =
    | { success: true; data: MatchingHomeData }
    | { success: false; message: string };

function normalizeMatchingHome(data: unknown): MatchingHomeData | null {
    const record = (data && typeof data === "object" ? data : null) as Partial<MatchingHomeData> | null;
    if (!record?.search || !record.filterOptions) return null;

    return {
        filterOptions: {
            purposes: Array.isArray(record.filterOptions.purposes) ? record.filterOptions.purposes : [],
            hobbies: Array.isArray(record.filterOptions.hobbies) ? record.filterOptions.hobbies : [],
        },
        search: {
            data: Array.isArray(record.search.data) ? record.search.data : [],
            total: record.search.total ?? 0,
            hasMore: Boolean(record.search.hasMore),
        },
    };
}

export function readMatchingHomeCache(): MatchingHomeData | null {
    const cached = readSessionCache<MatchingHomeData>(MATCHING_HOME_CACHE_KEY, MATCHING_HOME_CACHE_TTL_MS);
    if (!cached) return null;
    return normalizeMatchingHome(cached) ?? null;
}

export function prefetchMatchingHome() {
    void fetchMatchingHomeClient();
}

export async function fetchMatchingHomeClient(options?: {
    force?: boolean;
}): Promise<MatchingHomeResult> {
    if (!options?.force) {
        const cached = readMatchingHomeCache();
        if (cached) {
            return { success: true, data: cached };
        }
    }

    try {
        const res = await fetch("/api/matching/home", { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const message =
                data && typeof data === "object" && "error" in data && typeof data.error === "string"
                    ? data.error
                    : "マッチングデータの取得に失敗しました。";
            return { success: false, message };
        }

        const payload = normalizeMatchingHome(data);
        if (!payload) {
            return { success: false, message: "マッチングデータの取得に失敗しました。" };
        }

        writeSessionCache(MATCHING_HOME_CACHE_KEY, payload);
        return { success: true, data: payload };
    } catch (error: unknown) {
        return {
            success: false,
            message: error instanceof Error ? error.message : "マッチングデータの取得に失敗しました。",
        };
    }
}

export type MatchingSearchParams = {
    page?: number;
    search?: string;
    hobby?: string;
    language?: string;
    purpose?: string;
    jlptLevel?: string;
};

export type MatchingSearchResult = {
    success: boolean;
    message?: string;
    data: unknown[];
    total?: number;
    hasMore: boolean;
};

export async function searchMatchingUsers(
    params: MatchingSearchParams = {}
): Promise<MatchingSearchResult> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    const normalizedSearch = normalizeSearchQuery(params.search);
    if (normalizedSearch) query.set("search", normalizedSearch);
    if (params.hobby?.trim()) query.set("hobby", params.hobby.trim());
    if (params.language?.trim()) query.set("language", params.language.trim());
    if (params.purpose?.trim()) query.set("purpose", params.purpose.trim());
    if (params.jlptLevel?.trim()) query.set("jlptLevel", params.jlptLevel.trim());

    const suffix = query.toString() ? `?${query}` : "";

    try {
        const res = await fetch(`/api/matching/search${suffix}`, {
            cache: "no-store",
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const message =
                data && typeof data === "object" && "error" in data && typeof data.error === "string"
                    ? data.error
                    : "マッチング候補の取得に失敗しました。";
            return { success: false, message, data: [], hasMore: false };
        }

        return {
            success: true,
            data: data?.data ?? [],
            total: data?.total,
            hasMore: data?.hasMore ?? false,
        };
    } catch (error: unknown) {
        return {
            success: false,
            message: error instanceof Error ? error.message : "マッチング候補の取得に失敗しました。",
            data: [],
            hasMore: false,
        };
    }
}
