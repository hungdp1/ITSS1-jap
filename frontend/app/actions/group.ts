"use server";

import { localApiResponse } from "@/lib/api";
import { GROUP_LANGUAGE_LEVEL_OPTIONS, sortJlptLevels } from "@/lib/groupFilters";
import { normalizeSearchQuery } from "@/lib/search";

export async function getGroupFilterOptionsAction() {
    try {
        const res = await localApiResponse("GET", "/groups/filter-options");
        const data = await res.json();

        if (!res.ok) {
            return {
                success: false,
                hobbyTags: [] as string[],
                languageTags: [...GROUP_LANGUAGE_LEVEL_OPTIONS],
                message: data.error || data.message || "フィルター候補の取得に失敗しました。",
            };
        }

        return {
            success: true,
            hobbyTags: (data.hobbyTags ?? []) as string[],
            languageTags: sortJlptLevels([
                ...GROUP_LANGUAGE_LEVEL_OPTIONS,
                ...(data.languageTags ?? []),
            ]),
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "フィルター候補の取得に失敗しました。";
        return {
            success: false,
            hobbyTags: [] as string[],
            languageTags: [...GROUP_LANGUAGE_LEVEL_OPTIONS],
            message,
        };
    }
}

export async function getMyGroupsAction() {
    try {
        const res = await localApiResponse("GET", "/groups/my-groups");
        const data = await res.json();
        if (!res.ok) {
            return { success: false, message: data.message || data.error || "グループの取得に失敗しました。", data: [] };
        }
        return { success: true, data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "グループの取得に失敗しました。";
        return { success: false, message, data: [] };
    }
}

export async function getSuggestedGroupsAction() {
    try {
        const res = await localApiResponse("GET", "/groups/suggested");
        const data = await res.json();
        if (!res.ok) {
            return { success: false, message: data.message || data.error || "おすすめグループの取得に失敗しました。", data: [] };
        }
        return { success: true, data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "おすすめグループの取得に失敗しました。";
        return { success: false, message, data: [] };
    }
}

export async function searchGroupsAction(params: {
    search?: string;
    hobbyTag?: string;
    languageTag?: string;
}) {
    try {
        const query = new URLSearchParams();
        const normalizedSearch = normalizeSearchQuery(params.search);
        if (normalizedSearch) query.set("search", normalizedSearch);
        if (params.hobbyTag) query.set("hobbyTag", params.hobbyTag);
        if (params.languageTag) query.set("languageTag", params.languageTag);
        query.set("limit", "50");

        const qs = query.toString();
        const res = await localApiResponse("GET", `/groups${qs ? `?${qs}` : ""}`);
        const data = await res.json();
        return { success: res.ok, data: data.data || data };
    } catch {
        return { success: false, data: [] };
    }
}

export async function getGroupCardAction(groupId: number) {
    try {
        const res = await localApiResponse("GET", `/groups/card/${groupId}`);
        const data = await res.json();
        return { success: res.ok, data };
    } catch (error: unknown) {
        return { success: false, message: error instanceof Error ? error.message : "" };
    }
}

export async function joinGroupAction(groupId: number) {
    try {
        const res = await localApiResponse("POST", "/groups/join", { body: { groupId } });
        return { success: res.ok };
    } catch {
        return { success: false };
    }
}

export async function leaveGroupAction(groupId: number) {
    try {
        const res = await localApiResponse("POST", "/groups/leave", { body: { groupId } });
        return { success: res.ok };
    } catch {
        return { success: false };
    }
}
