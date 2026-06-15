"use server";

import { apiGet, apiPatch } from "@/lib/api";

export type AppNotification = {
    id: number;
    userId: number;
    type: string;
    message: string;
    relatedUserId: number | null;
    relatedUser?: {
        id: number;
        name: string;
        avatarUrl?: string | null;
    } | null;
    sessionId: number | null;
    isRead: boolean;
    createdAt: string;
};

export async function getNotificationsAction() {
    const result = await apiGet<AppNotification[]>("/notifications");

    if (!result.ok) {
        return { success: false as const, message: result.message, data: [] as AppNotification[] };
    }

    return { success: true as const, data: result.data };
}

export async function markNotificationReadAction(id: number) {
    const result = await apiPatch(`/notifications/${id}/read`, {});

    if (!result.ok) {
        return { success: false as const, message: result.message };
    }

    return { success: true as const };
}
