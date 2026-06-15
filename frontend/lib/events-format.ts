import type { EventCardData } from "@/components/events/EventCard";
import { resolveImageUrl } from "@/lib/image";

export type ApiEngagement = {
    userId: number;
    engagementType?: string;
    user?: { avatarUrl?: string | null };
};

export function formatEventDate(iso: string) {
    const d = new Date(iso);
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 (${weekdays[d.getDay()]})`;
}

export type ApiEvent = {
    id: number;
    title: string;
    description: string;
    eventTime: string;
    format: string;
    address?: string | null;
    urlLink?: string | null;
    imageUrl?: string | null;
    createdAt?: string;
    participantCount?: number;
    engagements?: ApiEngagement[];
};

export function formatApiEvent(event: ApiEvent, currentUserId?: number): EventCardData {
    const joinedEngagements = (event.engagements ?? []).filter((e) => e.engagementType === "joined");
    const avatars = joinedEngagements
        .map((e) => e.user?.avatarUrl)
        .filter((url): url is string => Boolean(url))
        .map((url) => resolveImageUrl(url));

    const participantCount = event.participantCount ?? joinedEngagements.length;
    const displayAvatars = avatars.length > 0 ? avatars : ["/assets/images/avatars/avatar.jpg"];
    const extraCount = Math.max(participantCount - 3, 0);
    const isJoined = currentUserId
        ? joinedEngagements.some((e) => e.userId === currentUserId)
        : false;

    const createdAt = event.createdAt ? new Date(event.createdAt) : null;
    const isNew = createdAt ? Date.now() - createdAt.getTime() < 7 * 24 * 60 * 60 * 1000 : false;

    return {
        id: event.id,
        title: event.title,
        description: event.description,
        eventTime: event.eventTime,
        format: event.format,
        address: event.address,
        urlLink: event.urlLink,
        imageUrl: resolveImageUrl(event.imageUrl, "/assets/images/events/event-1.png"),
        isNew,
        memberAvatars: displayAvatars,
        extraMemberCount: extraCount,
        isJoined,
    };
}
