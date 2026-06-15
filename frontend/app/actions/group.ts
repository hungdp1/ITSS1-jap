"use server";

import { cookies } from "next/headers";
import { getApiBaseUrl } from "@/lib/api";
import { GROUP_LANGUAGE_LEVEL_OPTIONS, sortJlptLevels } from "@/lib/groupFilters";
import { normalizeSearchQuery } from "@/lib/search";

export async function getGroupFilterOptionsAction() {
    try {
        const res = await fetch(`${getApiBaseUrl()}/groups/filter-options`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
        });

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
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;

        if (!token) {
            return { success: false, message: "ログインしてください。", data: [] }
        }

        const res = await fetch(`${getApiBaseUrl()}/groups/my-groups`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            cache: "no-store"
        });

        const data = await res.json();

        if (!res.ok) {
            return { success: false, message: data.message || "グループの取得に失敗しました。" }
        }

        return { success: true, data: data }
    } catch (error: any) {
        return { success: false, message: error.message || "グループの取得に失敗しました。", data: [] };
    }
}

export async function getSuggestedGroupsAction() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;

        if (!token) {
            return { success: false, message: "ログインしてください。", data: [] }
        }

        const res = await fetch(`${getApiBaseUrl()}/groups/suggested`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            cache: "no-store"
        });

        const data = await res.json();

        if (!res.ok) {
            return { success: false, message: data.message || "おすすめグループの取得に失敗しました。" }
        }

        return { success: true, data: data }
    } catch (error: any) {
        return { success: false, message: error.message || "おすすめグループの取得に失敗しました。", data: [] };
    }
}

export async function searchGroupsAction(params: {
    search?: string;
    hobbyTag?: string;
    languageTag?: string;
}) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;

        if (!token) return { success: false, data: [] };

        const query = new URLSearchParams();
        const normalizedSearch = normalizeSearchQuery(params.search);
        if (normalizedSearch) query.set("search", normalizedSearch);
        if (params.hobbyTag) query.set("hobbyTag", params.hobbyTag);
        if (params.languageTag) query.set("languageTag", params.languageTag);
        query.set("limit", "50");

        const qs = query.toString();
        const url = `${getApiBaseUrl()}/groups${qs ? `?${qs}` : ""}`;

        const res = await fetch(url, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
            cache: "no-store",
        });

        const data = await res.json();
        return { success: res.ok, data: data.data || data };
    } catch (error: any) {
        return { success: false, data: [] };
    }
}

// グループ詳細の取得
export async function getGroupCardAction(groupId: number) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;
        if (!token) return { success: false };

        const res = await fetch(`${getApiBaseUrl()}/groups/card/${groupId}`, {
            headers: { "Authorization": `Bearer ${token}` },
            cache: "no-store"
        });
        const data = await res.json();
        return { success: res.ok, data };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// グループ参加
export async function joinGroupAction(groupId: number) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;
        const res = await fetch(`${getApiBaseUrl()}/groups/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ groupId })
        });
        return { success: res.ok };
    } catch (error) {
        return { success: false };
    }
}

// グループ退出
export async function leaveGroupAction(groupId: number) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;
        const res = await fetch(`${getApiBaseUrl()}/groups/leave`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ groupId })
        });
        return { success: res.ok };
    } catch (error) {
        return { success: false };
    }
}
