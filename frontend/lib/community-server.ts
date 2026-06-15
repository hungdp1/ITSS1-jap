import { apiGet } from "@/lib/api";
import type { ApiGroup } from "@/lib/community-format";

export type CommunityHomePayload = {
    myGroups: ApiGroup[];
    suggested: ApiGroup[];
};

export type GroupPagePayload = {
    group: {
        groupId: number;
        name: string;
        description?: string | null;
        groupAvatar?: string | null;
        groupCover?: string | null;
        totalMembers: number;
        totalPosts: number;
        hobbyTags: { name: string }[];
        languageTags: { name: string }[];
        isJoined: boolean;
    };
    posts: {
        data: unknown[];
        hasMore: boolean;
    };
};

export async function fetchCommunityHome() {
    return apiGet<CommunityHomePayload>("/groups/community-home");
}

export async function fetchGroupPage(groupId: number, page = 1, limit = 10) {
    const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });
    return apiGet<GroupPagePayload>(`/groups/detail/${groupId}?${qs}`);
}

export async function fetchGroupFilterOptions() {
    return apiGet<{ hobbyTags: string[]; languageTags: string[] }>("/groups/filter-options");
}
