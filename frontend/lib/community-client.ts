import type { ApiGroup } from "@/lib/community-format";
import { invalidateSessionCache, readSessionCache, writeSessionCache } from "@/lib/session-cache";

export const COMMUNITY_HOME_CACHE_KEY = "community:home:v2";
export const COMMUNITY_HOME_CACHE_TTL_MS = 60_000;

export type CommunityHomeData = {
    myGroups: ApiGroup[];
    suggested: ApiGroup[];
    filterOptions: {
        hobbyTags: string[];
        languageTags: string[];
    };
};

export type CommunityHomeResult =
    | { success: true; data: CommunityHomeData }
    | { success: false; message: string };

function normalizeCommunityHome(data: unknown): CommunityHomeData {
    const record = (data && typeof data === "object" ? data : {}) as Partial<CommunityHomeData> & {
        filterOptions?: Partial<CommunityHomeData["filterOptions"]>;
    };

    return {
        myGroups: Array.isArray(record.myGroups) ? record.myGroups : [],
        suggested: Array.isArray(record.suggested) ? record.suggested : [],
        filterOptions: {
            hobbyTags: Array.isArray(record.filterOptions?.hobbyTags)
                ? record.filterOptions.hobbyTags
                : [],
            languageTags: Array.isArray(record.filterOptions?.languageTags)
                ? record.filterOptions.languageTags
                : [],
        },
    };
}

function isValidCommunityHome(data: CommunityHomeData): boolean {
    return Array.isArray(data.myGroups) && Array.isArray(data.suggested) && !!data.filterOptions;
}

async function fetchGroupFilterOptionsClient(): Promise<CommunityHomeData["filterOptions"]> {
    try {
        const res = await fetch("/api/groups/filter-options", { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data || typeof data !== "object") {
            return { hobbyTags: [], languageTags: [] };
        }

        return {
            hobbyTags: Array.isArray(data.hobbyTags) ? data.hobbyTags : [],
            languageTags: Array.isArray(data.languageTags) ? data.languageTags : [],
        };
    } catch {
        return { hobbyTags: [], languageTags: [] };
    }
}

async function ensureFilterOptions(payload: CommunityHomeData): Promise<CommunityHomeData> {
    const hasTags =
        payload.filterOptions.hobbyTags.length > 0 || payload.filterOptions.languageTags.length > 0;
    if (hasTags) return payload;

    const filterOptions = await fetchGroupFilterOptionsClient();
    return { ...payload, filterOptions };
}

function readValidCommunityCache(): CommunityHomeData | null {
    const cached = readSessionCache<CommunityHomeData>(
        COMMUNITY_HOME_CACHE_KEY,
        COMMUNITY_HOME_CACHE_TTL_MS
    );
    if (!cached || !isValidCommunityHome(cached)) {
        if (cached) invalidateSessionCache(COMMUNITY_HOME_CACHE_KEY);
        return null;
    }
    return cached;
}

export function prefetchCommunityHome() {
    void fetchCommunityHomeClient();
}

export async function fetchCommunityHomeClient(options?: {
    force?: boolean;
}): Promise<CommunityHomeResult> {
    if (!options?.force) {
        const cached = readValidCommunityCache();
        if (cached) {
            return { success: true, data: cached };
        }
    }

    try {
        const res = await fetch("/api/groups/community-home", { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const message =
                data && typeof data === "object" && "error" in data && typeof data.error === "string"
                    ? data.error
                    : "コミュニティデータの取得に失敗しました。";
            return { success: false, message };
        }

        const normalized = normalizeCommunityHome(data);
        const payload = await ensureFilterOptions(normalized);
        writeSessionCache(COMMUNITY_HOME_CACHE_KEY, payload);
        return { success: true, data: payload };
    } catch (error: unknown) {
        return {
            success: false,
            message: error instanceof Error ? error.message : "コミュニティデータの取得に失敗しました。",
        };
    }
}

export function readCommunityHomeCache(): CommunityHomeData | null {
    return readValidCommunityCache();
}
