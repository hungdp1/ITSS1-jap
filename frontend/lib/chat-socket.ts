"use client";

import { io, type Socket } from "socket.io-client";
import { getSocketBaseUrl } from "@/lib/env";
import type { ChatMessage } from "@/app/actions/chat";

let sharedSocket: Socket | null = null;

export function getChatSocket(): Socket {
    if (!sharedSocket) {
        sharedSocket = io(getSocketBaseUrl(), {
            autoConnect: false,
            transports: ["websocket", "polling"],
        });
    }
    return sharedSocket;
}

export function disconnectChatSocket() {
    if (sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
    }
}

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

export function bindChatSocketHandlers(socket: Socket, handlers: ChatSocketHandlers) {
    const {
        onNewMessage,
        onSeenMessage,
        onOnlineStatus,
        onMessageEdited,
        onMessageDeleted,
        onMessageTranslated,
        onChatBlocked,
        onChatUnblocked,
    } = handlers;

    if (onNewMessage) socket.on("newMessage", onNewMessage);
    if (onSeenMessage) socket.on("seenMessage", onSeenMessage);
    if (onOnlineStatus) socket.on("onlineStatus", onOnlineStatus);
    if (onMessageEdited) socket.on("messageEdited", onMessageEdited);
    if (onMessageDeleted) socket.on("messageDeleted", onMessageDeleted);
    if (onMessageTranslated) socket.on("messageTranslated", onMessageTranslated);
    if (onChatBlocked) socket.on("chatBlocked", onChatBlocked);
    if (onChatUnblocked) socket.on("chatUnblocked", onChatUnblocked);

    return () => {
        if (onNewMessage) socket.off("newMessage", onNewMessage);
        if (onSeenMessage) socket.off("seenMessage", onSeenMessage);
        if (onOnlineStatus) socket.off("onlineStatus", onOnlineStatus);
        if (onMessageEdited) socket.off("messageEdited", onMessageEdited);
        if (onMessageDeleted) socket.off("messageDeleted", onMessageDeleted);
        if (onMessageTranslated) socket.off("messageTranslated", onMessageTranslated);
        if (onChatBlocked) socket.off("chatBlocked", onChatBlocked);
        if (onChatUnblocked) socket.off("chatUnblocked", onChatUnblocked);
    };
}
