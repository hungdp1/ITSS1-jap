import type { GroupPagePayload } from "@/lib/community-server";
import { readSessionCache, writeSessionCache } from "@/lib/session-cache";

export const GROUP_PAGE_CACHE_TTL_MS = 60_000;

export type GroupPageData = GroupPagePayload;

export type GroupPageResult =
    | { success: true; data: GroupPageData }
    | { success: false; message: string };

function groupPageCacheKey(groupId: number) {
    return `group:v2:${groupId}`;
}

export function readGroupPageCache(groupId: number): GroupPageData | null {
    return readSessionCache<GroupPageData>(groupPageCacheKey(groupId), GROUP_PAGE_CACHE_TTL_MS);
}

export async function fetchGroupPageClient(
    groupId: number,
    options?: { force?: boolean }
): Promise<GroupPageResult> {
    if (!options?.force) {
        const cached = readGroupPageCache(groupId);
        if (cached) {
            return { success: true, data: cached };
        }
    }

    try {
        const res = await fetch(`/api/groups/${groupId}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const message =
                data && typeof data === "object" && "error" in data && typeof data.error === "string"
                    ? data.error
                    : "グループの取得に失敗しました。";
            return { success: false, message };
        }

        const payload = data as GroupPageData;
        writeSessionCache(groupPageCacheKey(groupId), payload);
        return { success: true, data: payload };
    } catch (error: unknown) {
        return {
            success: false,
            message: error instanceof Error ? error.message : "グループの取得に失敗しました。",
        };
    }
}

export function prefetchGroupPage(groupId: number) {
    void fetchGroupPageClient(groupId);
}
