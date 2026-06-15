"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { ChatSocketHandlers } from "@/lib/chat-socket";

type UseChatSocketOptions = ChatSocketHandlers & {
    userId: number | null | undefined;
    sessionId: number | null;
};

type UpdatePayload =
    | { kind: "translated"; messageId: number; translatedText: unknown }
    | { kind: "edited"; messageId: number; content: string; editedAt: string }
    | { kind: "deleted"; messageId: number };

/**
 * Realtime chat over Supabase Realtime (Broadcast + Presence). Drop-in for the
 * old Socket.IO hook: same handler interface, works on Vercel serverless.
 */
export function useChatSocket(options: UseChatSocketOptions) {
    const { userId, sessionId } = options;
    const handlersRef = useRef<ChatSocketHandlers>(options);
    handlersRef.current = options;

    // Per-user channel (block events) + presence (online status).
    useEffect(() => {
        if (!userId) return;
        const supabase = getSupabaseBrowser();
        if (!supabase) return;

        const h = () => handlersRef.current;

        const userChannel = supabase.channel(`user:${userId}`);
        userChannel
            .on("broadcast", { event: "chat_blocked" }, ({ payload }) =>
                h().onChatBlocked?.(payload)
            )
            .on("broadcast", { event: "chat_unblocked" }, ({ payload }) =>
                h().onChatUnblocked?.(payload)
            )
            .subscribe();

        const presence = supabase.channel("presence:online", {
            config: { presence: { key: String(userId) } },
        });
        const emitPresence = () => {
            const state = presence.presenceState();
            for (const key of Object.keys(state)) {
                h().onOnlineStatus?.({ userId: Number(key), online: true });
            }
        };
        presence
            .on("presence", { event: "sync" }, emitPresence)
            .on("presence", { event: "join" }, ({ key }) =>
                h().onOnlineStatus?.({ userId: Number(key), online: true })
            )
            .on("presence", { event: "leave" }, ({ key }) =>
                h().onOnlineStatus?.({ userId: Number(key), online: false })
            )
            .subscribe(async (status) => {
                if (status === "SUBSCRIBED") await presence.track({ userId, at: Date.now() });
            });

        return () => {
            supabase.removeChannel(userChannel);
            supabase.removeChannel(presence);
        };
    }, [userId]);

    // Per-session channel (messages, updates, seen).
    useEffect(() => {
        if (!userId || !sessionId) return;
        const supabase = getSupabaseBrowser();
        if (!supabase) return;

        const h = () => handlersRef.current;

        const channel: RealtimeChannel = supabase.channel(`session:${sessionId}`);
        channel
            .on("broadcast", { event: "new_message" }, ({ payload }) =>
                h().onNewMessage?.(payload)
            )
            .on("broadcast", { event: "seen" }, ({ payload }) => h().onSeenMessage?.(payload))
            .on("broadcast", { event: "message_updated" }, ({ payload }) => {
                const p = payload as UpdatePayload;
                if (p.kind === "translated") {
                    h().onMessageTranslated?.({
                        messageId: p.messageId,
                        translatedText: p.translatedText as never,
                    });
                } else if (p.kind === "edited") {
                    h().onMessageEdited?.({
                        messageId: p.messageId,
                        newContent: p.content,
                        editedAt: p.editedAt,
                    });
                } else if (p.kind === "deleted") {
                    h().onMessageDeleted?.({ messageId: p.messageId });
                }
            })
            .on("broadcast", { event: "chat_blocked" }, ({ payload }) =>
                h().onChatBlocked?.(payload)
            )
            .on("broadcast", { event: "chat_unblocked" }, ({ payload }) =>
                h().onChatUnblocked?.(payload)
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, sessionId]);
}
