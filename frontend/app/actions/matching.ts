"use server";

import { cookies } from "next/headers";
import { apiPost, getApiBaseUrl } from "@/lib/api";
import { normalizeSearchQuery } from "@/lib/search";

export type MatchingSearchParams = {
    page?: number;
    search?: string;
    hobby?: string;
    language?: string;
    purpose?: string;
    jlptLevel?: string;
};

export async function getMatchingFilterOptionsAction() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;

        if (!token) {
            return {
                success: false,
                message: "ログインしてください。",
                purposes: [] as string[],
                hobbies: [] as string[],
            };
        }

        const res = await fetch(`${getApiBaseUrl()}/matchings/filter-options`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
            return {
                success: false,
                message: data.error || data.message || "フィルター候補の取得に失敗しました。",
                purposes: [] as string[],
                hobbies: [] as string[],
            };
        }

        return {
            success: true,
            purposes: (data.purposes ?? []) as string[],
            hobbies: (data.hobbies ?? []) as string[],
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "フィルター候補の取得に失敗しました。";
        return {
            success: false,
            message,
            purposes: [] as string[],
            hobbies: [] as string[],
        };
    }
}

export async function searchMatchingUsersAction(params: MatchingSearchParams = {}) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;

        if (!token) {
            return {
                success: false,
                message: "ログインしてください。",
                data: [],
                total: 0,
                hasMore: false,
            };
        }

        const query = new URLSearchParams();
        if (params.page) query.set("page", String(params.page));
        const normalizedSearch = normalizeSearchQuery(params.search);
        if (normalizedSearch) query.set("search", normalizedSearch);
        if (params.hobby?.trim()) query.set("hobby", params.hobby.trim());
        if (params.language?.trim()) query.set("language", params.language.trim());
        if (params.purpose?.trim()) query.set("purpose", params.purpose.trim());
        if (params.jlptLevel?.trim()) query.set("jlptLevel", params.jlptLevel.trim());

        const res = await fetch(
            `${getApiBaseUrl()}/matchings/search?${query.toString()}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            }
        );

        const data = await res.json();

        if (!res.ok) {
            return {
                success: false,
                message: data.error || data.message || "マッチング候補の取得に失敗しました。",
                data: [],
                total: 0,
                hasMore: false,
            };
        }

        return {
            success: true,
            data: data.data ?? [],
            total: data.total ?? 0,
            hasMore: data.hasMore ?? false,
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "マッチング候補の取得に失敗しました。";
        return {
            success: false,
            message,
            data: [],
            total: 0,
            hasMore: false,
        };
    }
}

export type MatchSession = {
    id: number;
    status: string;
    createdAt: string;
};

export async function createMatchSessionAction(targetUserId: number) {
    const result = await apiPost<MatchSession>("/matchings/session", { targetUserId });

    if (!result.ok) {
        return { success: false as const, message: result.message };
    }

    return { success: true as const, data: result.data };
}

export async function passUserAction(targetUserId: number) {
    const result = await apiPost("/matchings/pass", { targetUserId });

    if (!result.ok) {
        return { success: false as const, message: result.message };
    }

    return { success: true as const };
}

export type LikeUserResult = {
    alreadyLiked?: boolean;
    matched?: boolean;
    sessionId?: number | null;
};

export async function likeUserAction(targetUserId: number) {
    const result = await apiPost<LikeUserResult>("/matchings/like", {
        targetUserId,
    });

    if (!result.ok) {
        return { success: false as const, message: result.message };
    }

    return {
        success: true as const,
        alreadyLiked: result.data?.alreadyLiked ?? false,
        matched: result.data?.matched ?? false,
        sessionId: result.data?.sessionId ?? null,
    };
}

export async function blockUserAction(targetUserId: number) {
    const result = await apiPost<{
        targetUserId: number;
        sessionId: number | null;
        blockStatus: { blockedByMe: boolean; blockedByThem: boolean };
    }>("/matchings/block", { targetUserId });

    if (!result.ok) {
        return { success: false as const, message: result.message };
    }

    return { success: true as const, data: result.data };
}

export async function unblockUserAction(targetUserId: number) {
    const result = await apiPost<{
        targetUserId: number;
        sessionId: number | null;
        blockStatus: { blockedByMe: boolean; blockedByThem: boolean };
    }>("/matchings/unblock", { targetUserId });

    if (!result.ok) {
        return { success: false as const, message: result.message };
    }

    return { success: true as const, data: result.data };
}

export async function reportUserAction(
    targetUserId: number,
    reason: string,
    evidence?: File | null
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;
        const formData = new FormData();
        formData.append("targetUserId", String(targetUserId));
        formData.append("reason", reason.trim());
        if (evidence) {
            formData.append("evidence", evidence);
        }

        const res = await fetch(`${getApiBaseUrl()}/matchings/report`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
            cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const message =
                data && typeof data === "object" && "error" in data && typeof data.error === "string"
                    ? data.error
                    : "通報に失敗しました。";
            return { success: false as const, message };
        }

        return { success: true as const };
    } catch (error: unknown) {
        return {
            success: false as const,
            message: error instanceof Error ? error.message : "通報に失敗しました。",
        };
    }
}
