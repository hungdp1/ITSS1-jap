import type { ChatMessage, ChatSessionItem } from "@/app/actions/chat";
import { readSessionCache, writeSessionCache } from "@/lib/session-cache";

export const CHAT_INBOX_CACHE_TTL_MS = 30_000;
const CHAT_INBOX_CACHE_KEY = "chat:inbox:v2";

export type ChatInboxData = {
    chats: ChatSessionItem[];
    messages: ChatMessage[];
    activeSessionId: number | null;
};

export type ChatInboxResult =
    | { success: true; data: ChatInboxData }
    | { success: false; message: string };

export function readChatInboxCache(_sessionId?: number | null): ChatInboxData | null {
    return readSessionCache<ChatInboxData>(CHAT_INBOX_CACHE_KEY, CHAT_INBOX_CACHE_TTL_MS);
}

export function writeChatInboxCache(data: ChatInboxData) {
    writeSessionCache(CHAT_INBOX_CACHE_KEY, data);
}

export async function fetchChatInboxClient(options?: {
    sessionId?: number | null;
    force?: boolean;
    /** Sidebar hover: list chats only, skip loading 50 messages */
    chatsOnly?: boolean;
}): Promise<ChatInboxResult> {
    const sessionId = options?.sessionId ?? null;

    if (!options?.force) {
        const cached = readChatInboxCache();
        if (cached) {
            if (options?.chatsOnly) {
                return { success: true, data: cached };
            }

            const targetSessionId = sessionId ?? cached.activeSessionId;
            const needsMessages =
                targetSessionId != null && cached.messages.length === 0;

            if (
                !needsMessages &&
                (!sessionId || cached.activeSessionId === sessionId)
            ) {
                return { success: true, data: cached };
            }

            if (targetSessionId != null) {
                const messagesOnly = await fetchChatMessagesClient(targetSessionId);
                if (!messagesOnly.success) {
                    return messagesOnly;
                }
                const merged: ChatInboxData = {
                    chats: cached.chats,
                    messages: messagesOnly.data,
                    activeSessionId: targetSessionId,
                };
                writeChatInboxCache(merged);
                return { success: true, data: merged };
            }

            return { success: true, data: cached };
        }
    }

    const query = new URLSearchParams({ messagesLimit: "50" });
    if (sessionId) query.set("sessionId", String(sessionId));
    if (options?.chatsOnly) query.set("includeMessages", "false");

    try {
        const res = await fetch(`/api/chat/inbox?${query}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const message =
                data && typeof data === "object" && "error" in data && typeof data.error === "string"
                    ? data.error
                    : "チャットの取得に失敗しました。";
            return { success: false, message };
        }

        const payload: ChatInboxData = {
            chats: Array.isArray(data?.chats) ? data.chats : [],
            messages: Array.isArray(data?.messages) ? data.messages : [],
            activeSessionId: data?.activeSessionId ?? null,
        };
        writeChatInboxCache(payload);
        return { success: true, data: payload };
    } catch (error: unknown) {
        return {
            success: false,
            message: error instanceof Error ? error.message : "チャットの取得に失敗しました。",
        };
    }
}

/** Prefetch chat list on sidebar hover (no messages — avoids ~5s inbox). */
export function prefetchChatInbox(_sessionId?: number | null) {
    if (readChatInboxCache()) return;
    void fetchChatInboxClient({ chatsOnly: true });
}

export function bumpChatInboxAfterSend(
    chats: ChatSessionItem[],
    message: ChatMessage,
    sessionId: number
): ChatSessionItem[] {
    const updated = chats.map((chat) =>
        chat.id === sessionId
            ? { ...chat, lastMessage: message, unreadCount: 0 }
            : chat
    );
    const active = updated.find((c) => c.id === sessionId);
    if (!active) return updated;
    return [active, ...updated.filter((c) => c.id !== sessionId)];
}

export function patchChatInboxCacheAfterSend(message: ChatMessage, sessionId: number) {
    const cached = readChatInboxCache();
    if (!cached) return;
    writeChatInboxCache({
        chats: bumpChatInboxAfterSend(cached.chats, message, sessionId),
        messages:
            cached.activeSessionId === sessionId
                ? cached.messages.some((m) => m.id === message.id)
                    ? cached.messages
                    : [...cached.messages, message]
                : cached.messages,
        activeSessionId: cached.activeSessionId,
    });
}

export function patchChatInboxCacheAfterBlock(
    sessionId: number,
    blockStatus: ChatSessionItem["blockStatus"]
) {
    const cached = readChatInboxCache();
    if (!cached) return;
    writeChatInboxCache({
        ...cached,
        chats: cached.chats.map((chat) =>
            chat.id === sessionId ? { ...chat, blockStatus } : chat
        ),
    });
}

export async function fetchChatMessagesClient(
    sessionId: number,
    page = 1,
    limit = 50
): Promise<
    | { success: true; data: ChatMessage[] }
    | { success: false; message: string }
> {
    try {
        const query = new URLSearchParams({
            sessionId: String(sessionId),
            page: String(page),
            limit: String(limit),
        });
        const res = await fetch(`/api/chat/messages?${query}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const message =
                data && typeof data === "object" && "error" in data && typeof data.error === "string"
                    ? data.error
                    : "メッセージの取得に失敗しました。";
            return { success: false, message };
        }

        return {
            success: true,
            data: Array.isArray(data) ? data : [],
        };
    } catch (error: unknown) {
        return {
            success: false,
            message: error instanceof Error ? error.message : "メッセージの取得に失敗しました。",
        };
    }
}

export async function sendChatMessageClient(
    sessionId: number,
    content: string
): Promise<
    | { success: true; data: ChatMessage }
    | { success: false; message: string }
> {
    try {
        const res = await fetch(`/api/chat/${sessionId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, messageType: "TEXT" }),
            cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const message =
                data && typeof data === "object" && "error" in data && typeof data.error === "string"
                    ? data.error
                    : "送信に失敗しました。";
            return { success: false, message };
        }

        return { success: true, data: data as ChatMessage };
    } catch (error: unknown) {
        return {
            success: false,
            message: error instanceof Error ? error.message : "送信に失敗しました。",
        };
    }
}

export async function sendChatMessageWithAttachmentClient(
    sessionId: number,
    file: File,
    content?: string
): Promise<
    | { success: true; data: ChatMessage }
    | { success: false; message: string }
> {
    try {
        const formData = new FormData();
        formData.append("sessionId", String(sessionId));
        formData.append("attachment", file);

        if (content?.trim()) {
            formData.append("content", content.trim());
        }

        const res = await fetch("/api/chat/messages", {
            method: "POST",
            body: formData,
            cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const message =
                data && typeof data === "object" && "error" in data && typeof data.error === "string"
                    ? data.error
                    : "送信に失敗しました。";
            return { success: false, message };
        }

        return { success: true, data: data as ChatMessage };
    } catch (error: unknown) {
        return {
            success: false,
            message: error instanceof Error ? error.message : "送信に失敗しました。",
        };
    }
}

export function patchChatInboxCacheAfterRead(sessionId: number) {
    const cached = readChatInboxCache();
    if (!cached) return;
    writeChatInboxCache({
        ...cached,
        chats: cached.chats.map((chat) =>
            chat.id === sessionId ? { ...chat, unreadCount: 0 } : chat
        ),
    });
}

