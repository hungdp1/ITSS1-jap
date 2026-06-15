import type { UserProfile } from "@/app/actions/profile";
import { readSessionCache, writeSessionCache } from "@/lib/session-cache";

export const PROFILE_CACHE_TTL_MS = 60_000;

export type ProfileResult =
    | { success: true; data: UserProfile }
    | { success: false; message: string };

function profileCacheKey(userId: string) {
    return `profile:v2:${userId}`;
}

export function readProfileCache(userId: string): UserProfile | null {
    return readSessionCache<UserProfile>(profileCacheKey(userId), PROFILE_CACHE_TTL_MS);
}

export async function fetchProfileClient(
    userId: string,
    options?: { force?: boolean }
): Promise<ProfileResult> {
    if (!options?.force) {
        const cached = readProfileCache(userId);
        if (cached) {
            return { success: true, data: cached };
        }
    }

    try {
        const res = await fetch(`/api/profiles/${encodeURIComponent(userId)}`, {
            cache: "no-store",
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const message =
                data && typeof data === "object" && "error" in data && typeof data.error === "string"
                    ? data.error
                    : "プロフィールの取得に失敗しました。";
            return { success: false, message };
        }

        const payload = data as UserProfile;
        writeSessionCache(profileCacheKey(userId), payload);
        return { success: true, data: payload };
    } catch (error: unknown) {
        return {
            success: false,
            message: error instanceof Error ? error.message : "プロフィールの取得に失敗しました。",
        };
    }
}

export function prefetchProfile(userId: string) {
    void fetchProfileClient(userId);
}
