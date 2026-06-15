"use client";

import { useEffect, useRef } from "react";
import {
    bindChatSocketHandlers,
    getChatSocket,
    type ChatSocketHandlers,
} from "@/lib/chat-socket";

type UseChatSocketOptions = ChatSocketHandlers & {
    userId: number | null | undefined;
    sessionId: number | null;
};

export function useChatSocket(options: UseChatSocketOptions) {
    const { userId, sessionId } = options;
    const handlersRef = useRef<ChatSocketHandlers>(options);
    handlersRef.current = options;
    const joinedSessionRef = useRef<number | null>(null);

    useEffect(() => {
        if (!userId) return;

        const socket = getChatSocket();

        const unbind = bindChatSocketHandlers(socket, {
            onNewMessage: (message) => handlersRef.current.onNewMessage?.(message),
            onSeenMessage: (payload) => handlersRef.current.onSeenMessage?.(payload),
            onOnlineStatus: (payload) => handlersRef.current.onOnlineStatus?.(payload),
            onMessageEdited: (payload) => handlersRef.current.onMessageEdited?.(payload),
            onMessageDeleted: (payload) => handlersRef.current.onMessageDeleted?.(payload),
            onMessageTranslated: (payload) => handlersRef.current.onMessageTranslated?.(payload),
            onChatBlocked: (payload) => handlersRef.current.onChatBlocked?.(payload),
            onChatUnblocked: (payload) => handlersRef.current.onChatUnblocked?.(payload),
        });

        if (!socket.connected) {
            socket.connect();
        }
        socket.emit("userOnline", userId);

        return () => {
            unbind();
            if (joinedSessionRef.current) {
                socket.emit("leaveSession", joinedSessionRef.current);
                joinedSessionRef.current = null;
            }
        };
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        const socket = getChatSocket();
        const prev = joinedSessionRef.current;

        if (prev && prev !== sessionId) {
            socket.emit("leaveSession", prev);
            joinedSessionRef.current = null;
        }

        if (sessionId) {
            socket.emit("joinSession", sessionId);
            joinedSessionRef.current = sessionId;
        }
    }, [userId, sessionId]);
}
