"use client";

import type { ChatMessage } from "@/app/actions/chat";

/**
 * Realtime payload types. Transport is Supabase Realtime (see useChatSocket),
 * replacing the old Socket.IO layer. These types are kept stable so consumers
 * (ChatClient) need no changes.
 */

export type OnlineStatusPayload = {
    userId: number;
    online: boolean;
};

export type SeenMessagePayload = {
    sessionId: number;
    userId: number;
};

export type MessageEditedPayload = {
    messageId: number;
    newContent: string;
    editedAt: string;
};

export type MessageDeletedPayload = {
    messageId: number;
};

export type MessageTranslatedPayload = {
    messageId: number;
    translatedText: ChatMessage["translatedText"];
};

export type ChatBlockedPayload = {
    sessionId: number;
    blockedByUserId: number;
    blockedTargetUserId: number;
};

export type ChatUnblockedPayload = {
    sessionId: number | null;
    unblockedByUserId: number;
    unblockedTargetUserId: number;
};

export type ChatSocketHandlers = {
    onNewMessage?: (message: ChatMessage) => void;
    onSeenMessage?: (payload: SeenMessagePayload) => void;
    onOnlineStatus?: (payload: OnlineStatusPayload) => void;
    onMessageEdited?: (payload: MessageEditedPayload) => void;
    onMessageDeleted?: (payload: MessageDeletedPayload) => void;
    onMessageTranslated?: (payload: MessageTranslatedPayload) => void;
    onChatBlocked?: (payload: ChatBlockedPayload) => void;
    onChatUnblocked?: (payload: ChatUnblockedPayload) => void;
};
