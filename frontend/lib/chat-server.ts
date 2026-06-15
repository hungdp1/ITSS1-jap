import { apiGet } from "@/lib/api";
import type { ChatMessage, ChatSessionItem } from "@/app/actions/chat";

export type ChatInboxPayload = {
    chats: ChatSessionItem[];
    messages: ChatMessage[];
    activeSessionId: number | null;
};

export async function fetchChatInbox(sessionId?: number | null, messagesLimit = 50) {
    const qs = new URLSearchParams({ messagesLimit: String(messagesLimit) });
    if (sessionId) qs.set("sessionId", String(sessionId));
    return apiGet<ChatInboxPayload>(`/chats/inbox?${qs}`);
}
