import { GROUP_LANGUAGE_LEVEL_OPTIONS } from "@/lib/groupFilters";
import type { GroupCardData } from "@/components/community/GroupRecommendCard";

export type JoinedGroupItem = {
    id: number;
    name: string;
    members: string;
    img: string;
};

export type ApiGroup = {
    groupId: number;
    name: string;
    description?: string | null;
    groupAvatar?: string | null;
    groupCover?: string | null;
    memberCount?: number;
    isJoined?: boolean;
    _count?: { members?: number };
    hobbyTags?: { name: string }[];
    languageTags?: { name: string }[];
    members?: { user?: { avatarUrl?: string | null } }[];
};

const DEFAULT_COVERS = ["/assets/images/recommendations/rec-1.png", "/assets/images/recommendations/rec-2.png", "/assets/images/recommendations/rec-3.png"];

export function formatJoinedGroup(g: ApiGroup): JoinedGroupItem {
    const memberCount = g.memberCount ?? g._count?.members ?? 0;
    return {
        id: g.groupId,
        name: g.name,
        members: `${memberCount.toLocaleString("ja-JP")} メンバー`,
        img: g.groupAvatar || "/assets/images/groups/group-1.jpg",
    };
}

export function formatGroupCard(g: ApiGroup, joinedIds: Set<number>, coverIndex = 0): GroupCardData {
    const hobbyTags = (g.hobbyTags ?? []).map((t) => t.name);
    const languageTags = (g.languageTags ?? []).map((t) => t.name);
    const memberCount = g.memberCount ?? g._count?.members ?? 0;
    const memberAvatars = (g.members ?? [])
        .map((m) => m.user?.avatarUrl)
        .filter((url): url is string => Boolean(url));

    return {
        id: g.groupId,
        name: g.name,
        desc: g.description ?? "",
        coverImg: g.groupCover || g.groupAvatar || DEFAULT_COVERS[coverIndex % DEFAULT_COVERS.length],
        hobbyTags,
        languageTags,
        memberCount,
        memberAvatars,
        isJoined: g.isJoined ?? joinedIds.has(g.groupId),
    };
}

export function buildJoinedIdsFromGroups(groups: JoinedGroupItem[]): Set<number> {
    return new Set(groups.map((g) => g.id));
}

export { GROUP_LANGUAGE_LEVEL_OPTIONS };
