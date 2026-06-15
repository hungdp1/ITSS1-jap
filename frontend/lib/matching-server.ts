import { apiGet } from "@/lib/api";

export type MatchingFilterOptions = {
    purposes: string[];
    hobbies: string[];
};

export type MatchingSearchPayload = {
    data: unknown[];
    total: number;
    hasMore: boolean;
};

export type MatchingHomePayload = {
    filterOptions: MatchingFilterOptions;
    search: MatchingSearchPayload;
};

export async function fetchMatchingHome(query?: Record<string, string | undefined>) {
    const qs = new URLSearchParams();
    if (query) {
        for (const [key, value] of Object.entries(query)) {
            if (value?.trim()) qs.set(key, value.trim());
        }
    }
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiGet<MatchingHomePayload>(`/matchings/home${suffix}`);
}
