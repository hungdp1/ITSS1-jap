"use server";

import { cookies } from "next/headers";
import { apiGet, apiPost } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/env";
import type { MessageTranslations } from "@/lib/chat-translation";

export type ChatUser = {
    id: number;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    status?: string | null;
    isOnline?: boolean;
};

export type ChatMessage = {
    id: number;
    sessionId: number;
    senderId: number;
    content: string | null;
    translatedText: string | MessageTranslations | null;
    messageType: string;
    attachmentUrl: string | null;
    isSeen: boolean;
    sendAt: string;
    editedAt: string | null;
    sender: ChatUser;
};

export type ChatBlockStatus = {
    blockedByMe: boolean;
    blockedByThem: boolean;
};

export type ChatSessionItem = {
    id: number;
    createdAt: string;
    targetUser: ChatUser | null;
    lastMessage: ChatMessage | null;
    unreadCount: number;
    blockStatus?: ChatBlockStatus;
};

export async function getChatsAction() {
    const result = await apiGet<ChatSessionItem[]>("/chats");

    if (!result.ok) {
        return {
            success: false as const,
            message: result.message,
            data: [] as ChatSessionItem[],
        };
    }

    return { success: true as const, data: result.data };
}

export async function getMessagesAction(
    sessionId: number,
    page = 1,
    limit = 50
) {
    const result = await apiGet<ChatMessage[]>(
        `/chats/${sessionId}/messages?page=${page}&limit=${limit}`
    );

    if (!result.ok) {
        return {
            success: false as const,
            message: result.message,
            data: [] as ChatMessage[],
        };
    }

    return { success: true as const, data: result.data };
}

export async function sendMessageAction(sessionId: number, content: string) {
    const result = await apiPost<ChatMessage>(`/chats/${sessionId}/messages`, {
        content,
        messageType: "TEXT",
    });

    if (!result.ok) {
        return { success: false as const, message: result.message };
    }

    return { success: true as const, data: result.data };
}

export async function sendMessageWithAttachmentAction(
    sessionId: number,
    file: File,
    content?: string
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;
        const formData = new FormData();
        formData.append("attachment", file);
        if (content?.trim()) {
            formData.append("content", content.trim());
        }

        const res = await fetch(`${getApiBaseUrl()}/chats/${sessionId}/messages`, {
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
                    : "送信に失敗しました。";
            return { success: false as const, message };
        }

        return { success: true as const, data: data as ChatMessage };
    } catch (error: unknown) {
        return {
            success: false as const,
            message: error instanceof Error ? error.message : "サーバーに接続できません。",
        };
    }
}
