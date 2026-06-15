"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/layouts/Sidebar";
import {
    type ChatBlockStatus,
    type ChatMessage,
    type ChatSessionItem,
} from "@/app/actions/chat";
import { blockUserAction, unblockUserAction } from "@/app/actions/matching";
import {
    bumpChatInboxAfterSend,
    fetchChatInboxClient,
    fetchChatMessagesClient,
    patchChatInboxCacheAfterSend,
    patchChatInboxCacheAfterBlock,
    patchChatInboxCacheAfterRead,
    readChatInboxCache,
    sendChatMessageClient,
    sendChatMessageWithAttachmentClient,
    writeChatInboxCache,
} from "@/lib/chat-client";
import { useChatSocket } from "@/hooks/useChatSocket";
import { resolveTranslatedText } from "@/lib/chat-translation";
import { useAuth } from "@/lib/auth-context";
import ChatImagePreview from "@/components/chat/ChatImagePreview";
import { resolveImageUrl } from "@/lib/image";

const DEFAULT_AVATAR = "/assets/images/avatars/avatar-1.jpg";

type SessionUser = {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
};

function getDisplayName(user?: { firstName?: string | null; lastName?: string | null } | null) {
    if (!user) return "ユーザー";

    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return name || "ユーザー";
}

function getAvatarUrl(url?: string | null) {
    return resolveImageUrl(url, DEFAULT_AVATAR);
}

function formatMessageTime(dateStr: string) {
    const date = new Date(dateStr);

    return date.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function formatChatListTime(dateStr?: string | null) {
    if (!dateStr) return "";

    const date = new Date(dateStr);
    const now = new Date();

    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
        return date.toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) return "昨日";

    const diffTime = now.getTime() - date.getTime();
    if (diffTime < 0) {
        return date.toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    const diffDays = Math.floor(diffTime / 86400000);

    if (diffDays < 7) return `${diffDays}日前`;

    return date.toLocaleDateString("ja-JP", {
        month: "numeric",
        day: "numeric",
    });
}

function isSameDay(a: string, b: string) {
    return new Date(a).toDateString() === new Date(b).toDateString();
}

function getMessagePreview(message?: ChatMessage | null) {
    if (!message) return "（メッセージなし）";
    if (message.content?.trim()) return message.content;
    if (message.messageType === "IMAGE") return "📷 画像";
    if (message.messageType === "FILE") return "📎 ファイル";

    return "（メッセージなし）";
}

function getAttachmentFileName(url: string, fallback?: string | null) {
    if (fallback?.trim()) return fallback.trim();

    try {
        const pathname = new URL(url).pathname;
        const name = pathname.split("/").pop();

        return name || "ファイル";
    } catch {
        return "ファイル";
    }
}

function isComposerLockedByBlock(blockStatus?: ChatBlockStatus | null) {
    return Boolean(blockStatus?.blockedByMe || blockStatus?.blockedByThem);
}

function isBlockActive(blockStatus?: ChatBlockStatus | null) {
    return Boolean(blockStatus?.blockedByMe || blockStatus?.blockedByThem);
}

function getBlockBannerMessage(blockStatus?: ChatBlockStatus | null) {
    if (blockStatus?.blockedByMe) {
        return "このユーザーをブロックしました。会話を続けるにはブロックを解除してください。";
    }

    if (blockStatus?.blockedByThem) {
        return "相手にブロックされました。これ以上メッセージを送ることはできません。";
    }

    return null;
}

function resolveBlockStatusFromPayload(
    payload: { blockedByUserId: number; blockedTargetUserId: number },
    viewerId: number
): ChatBlockStatus {
    if (payload.blockedByUserId === viewerId) {
        return { blockedByMe: true, blockedByThem: false };
    }

    if (payload.blockedTargetUserId === viewerId) {
        return { blockedByMe: false, blockedByThem: true };
    }

    return { blockedByMe: false, blockedByThem: false };
}

function isImageAttachment(message: ChatMessage) {
    if (message.messageType === "IMAGE") return true;
    if (message.messageType !== "TEXT" || !message.attachmentUrl) return false;

    return /\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|$)/i.test(message.attachmentUrl);
}

function BlockConfirmDialog({
    open,
    isBusy,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    isBusy: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#181D1B]/45 px-4 backdrop-blur-sm">
            <div className="relative flex w-full max-w-md flex-col gap-4 overflow-hidden rounded-[32px] border border-[#D9C7A5]/70 bg-[#FFFDF7] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#8B5E34] via-[#E76F51] to-[#005B5B]" />
                <h3 className="pt-2 text-center text-[18px] font-extrabold text-[#005B5B]">
                    ブロック確認
                </h3>

                <p className="text-center text-[15px] font-medium leading-relaxed text-[#3E4948]">
                    本当にこのユーザーをブロックしますか？
                </p>

                <div className="flex justify-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isBusy}
                        className="rounded-2xl border border-[#D9C7A5]/70 bg-[#FFFDF7] px-8 py-2.5 text-[14px] font-bold text-[#8B5E34] transition-all hover:bg-[#F8EEDB] disabled:opacity-60"
                    >
                        いいえ
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isBusy}
                        className="rounded-2xl bg-[#923118] px-8 py-2.5 text-[14px] font-bold text-white shadow-[0_12px_24px_rgba(146,49,24,0.14)] transition-all hover:bg-[#7A2813] active:scale-[0.98] disabled:opacity-60"
                    >
                        {isBusy ? "処理中..." : "はい"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function MessageAttachment({
    message,
    isMine,
    onImageClick,
}: {
    message: ChatMessage;
    isMine: boolean;
    onImageClick: (url: string, fileName: string) => void;
}) {
    if (!message.attachmentUrl) return null;

    if (isImageAttachment(message)) {
        const fileName = getAttachmentFileName(message.attachmentUrl, message.content);

        return (
            <button
                type="button"
                onClick={() => onImageClick(message.attachmentUrl!, fileName)}
                className="block cursor-zoom-in"
            >
                <div className="relative w-[240px] max-w-full overflow-hidden rounded-2xl bg-black/5 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={message.attachmentUrl}
                        alt="添付画像"
                        className="block h-auto max-h-[320px] w-full object-contain"
                    />
                </div>
            </button>
        );
    }

    if (message.messageType === "FILE") {
        return (
            <a
                href={message.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className={`mb-2 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold underline-offset-2 transition-all hover:underline ${isMine
                        ? "bg-white/12 text-white"
                        : "border border-[#005B5B]/20 bg-[#DDEDEA] text-[#005B5B]"
                    }`}
            >
                <span aria-hidden>📎</span>
                {getAttachmentFileName(message.attachmentUrl, message.content)}
            </a>
        );
    }

    return null;
}

type ChatClientProps = {
    initialChats?: ChatSessionItem[];
    initialMessages?: ChatMessage[];
    initialSessionId?: number | null;
};

export default function ChatClient({
    initialChats = [],
    initialMessages = [],
    initialSessionId = null,
}: ChatClientProps = {}) {
    const searchParams = useSearchParams();

    const preferredSessionId = useMemo(() => {
        const raw = searchParams.get("session");
        const parsed = raw ? Number(raw) : null;

        return parsed && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }, [searchParams]);

    const cachedInbox = readChatInboxCache(preferredSessionId);

    // If preferredSessionId is provided (e.g. via URL query), prioritize it over cached active session
    const activeId = preferredSessionId ?? cachedInbox?.activeSessionId ?? initialSessionId;
    const isPreferredMatched = !preferredSessionId || cachedInbox?.activeSessionId === preferredSessionId;

    const [chats, setChats] = useState<ChatSessionItem[]>(
        cachedInbox?.chats ?? initialChats
    );
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
        activeId
    );
    const [messages, setMessages] = useState<ChatMessage[]>(
        isPreferredMatched ? (cachedInbox?.messages ?? initialMessages) : []
    );

    const [isBootstrapping, setIsBootstrapping] = useState(
        !cachedInbox && initialChats.length === 0
    );
    const [isLoadingChats, setIsLoadingChats] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isTranslationOn, setIsTranslationOn] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [messageText, setMessageText] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
    const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<{ url: string; fileName: string } | null>(
        null
    );
    const [blockDialogOpen, setBlockDialogOpen] = useState(false);
    const [isBlocking, setIsBlocking] = useState(false);
    const [isUnblocking, setIsUnblocking] = useState(false);

    const { user: authUser } = useAuth();
    const currentUser = authUser as SessionUser | null;

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const selectedSessionIdRef = useRef<number | null>(null);
    const currentUserIdRef = useRef<number | undefined>(undefined);
    const skipSessionFetchRef = useRef(
        Boolean((cachedInbox && isPreferredMatched) || initialMessages.length > 0)
    );

    selectedSessionIdRef.current = selectedSessionId;
    currentUserIdRef.current = currentUser?.id;

    const selectedChat = useMemo(
        () => chats.find((chat) => chat.id === selectedSessionId) ?? null,
        [chats, selectedSessionId]
    );

    const selectedBlockStatus = selectedChat?.blockStatus;
    const composerLockedByBlock = isComposerLockedByBlock(selectedBlockStatus);
    const isBlockActiveForSession = isBlockActive(selectedBlockStatus);
    const blockBannerMessage = getBlockBannerMessage(selectedBlockStatus);

    const filteredChats = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        if (!query) return chats;

        return chats.filter((chat) => {
            const name = getDisplayName(chat.targetUser).toLowerCase();
            const preview = getMessagePreview(chat.lastMessage).toLowerCase();

            return name.includes(query) || preview.includes(query);
        });
    }, [chats, searchQuery]);

    const applyBlockStatusToChat = useCallback(
        (sessionId: number, blockStatus: ChatBlockStatus) => {
            setChats((prev) =>
                prev.map((chat) => (chat.id === sessionId ? { ...chat, blockStatus } : chat))
            );
            patchChatInboxCacheAfterBlock(sessionId, blockStatus);
        },
        []
    );

    useEffect(() => {
        if (cachedInbox) {
            setIsBootstrapping(false);
            return;
        }

        let cancelled = false;

        void (async () => {
            setIsLoadingChats(true);

            const result = await fetchChatInboxClient({ sessionId: preferredSessionId });

            if (cancelled) return;

            setIsLoadingChats(false);

            if (!result.success) {
                setError(result.message);
                setChats([]);
                setMessages([]);
                setSelectedSessionId(null);
                setIsBootstrapping(false);
                return;
            }

            setChats(result.data.chats);
            setMessages(result.data.messages);
            setSelectedSessionId(result.data.activeSessionId);
            skipSessionFetchRef.current = true;
            setError(null);
            setIsBootstrapping(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [cachedInbox, preferredSessionId]);

    const loadMessages = useCallback(async (sessionId: number) => {
        setIsLoadingMessages(true);

        const result = await fetchChatMessagesClient(sessionId);

        setIsLoadingMessages(false);

        if (!result.success) {
            setError(result.message);
            setMessages([]);
            return;
        }

        setMessages(result.data);
        setError(null);
        setChats((prev) =>
            prev.map((chat) => (chat.id === sessionId ? { ...chat, unreadCount: 0 } : chat))
        );

        // Update activeSessionId and messages in the cache to stay in sync!
        const cached = readChatInboxCache();
        if (cached) {
            writeChatInboxCache({
                ...cached,
                activeSessionId: sessionId,
                messages: result.data,
                chats: cached.chats.map((chat) =>
                    chat.id === sessionId ? { ...chat, unreadCount: 0 } : chat
                ),
            });
        }
    }, []);

    useEffect(() => {
        if (skipSessionFetchRef.current) {
            skipSessionFetchRef.current = false;
            return;
        }

        if (!selectedSessionId) {
            setMessages([]);
            return;
        }

        const cached = readChatInboxCache();

        if (cached?.activeSessionId === selectedSessionId && cached.messages.length > 0) {
            setMessages(cached.messages);
            return;
        }

        void loadMessages(selectedSessionId);
    }, [selectedSessionId, loadMessages]);

    const handleNewMessage = useCallback((message: ChatMessage) => {
        const activeSessionId = selectedSessionIdRef.current;

        setChats((prev) =>
            prev.map((chat) => {
                if (chat.id !== message.sessionId) return chat;

                const isActiveSession = message.sessionId === activeSessionId;

                return {
                    ...chat,
                    lastMessage: message,
                    unreadCount: isActiveSession ? 0 : chat.unreadCount + 1,
                };
            })
        );

        if (message.sessionId !== activeSessionId) return;

        setMessages((prev) => {
            if (prev.some((item) => item.id === message.id)) return prev;
            return [...prev, message];
        });
    }, []);

    const handleSeenMessage = useCallback((payload: { sessionId: number; userId: number }) => {
        if (payload.sessionId !== selectedSessionIdRef.current) return;

        const myId = currentUserIdRef.current;

        if (!myId || payload.userId === myId) return;

        setMessages((prev) =>
            prev.map((message) =>
                message.senderId === myId ? { ...message, isSeen: true } : message
            )
        );
    }, []);

    const handleOnlineStatus = useCallback((payload: { userId: number; online: boolean }) => {
        setChats((prev) =>
            prev.map((chat) => {
                if (chat.targetUser?.id !== payload.userId) return chat;

                return {
                    ...chat,
                    targetUser: { ...chat.targetUser, isOnline: payload.online },
                };
            })
        );
    }, []);

    const handleMessageEdited = useCallback((payload: { messageId: number; newContent: string }) => {
        setMessages((prev) =>
            prev.map((message) =>
                message.id === payload.messageId
                    ? { ...message, content: payload.newContent }
                    : message
            )
        );
    }, []);

    const handleMessageDeleted = useCallback((payload: { messageId: number }) => {
        setMessages((prev) => prev.filter((message) => message.id !== payload.messageId));
    }, []);

    const handleMessageTranslated = useCallback(
        (payload: { messageId: number; translatedText: ChatMessage["translatedText"] }) => {
            setMessages((prev) =>
                prev.map((message) =>
                    message.id === payload.messageId
                        ? { ...message, translatedText: payload.translatedText }
                        : message
                )
            );
        },
        []
    );

    const handleChatBlocked = useCallback(
        (payload: {
            sessionId: number;
            blockedByUserId: number;
            blockedTargetUserId: number;
        }) => {
            const myId = currentUserIdRef.current;

            if (!myId) return;

            const blockStatus = resolveBlockStatusFromPayload(payload, myId);

            applyBlockStatusToChat(payload.sessionId, blockStatus);

            if (payload.sessionId === selectedSessionIdRef.current) {
                setPendingAttachment(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                if (imageInputRef.current) imageInputRef.current.value = "";
            }
        },
        [applyBlockStatusToChat]
    );

    const handleChatUnblocked = useCallback(
        (payload: {
            sessionId: number | null;
            unblockedByUserId: number;
            unblockedTargetUserId: number;
        }) => {
            const myId = currentUserIdRef.current;

            if (!myId) return;

            const clearedStatus: ChatBlockStatus = {
                blockedByMe: false,
                blockedByThem: false,
            };

            if (payload.sessionId) {
                applyBlockStatusToChat(payload.sessionId, clearedStatus);
                return;
            }

            setChats((prev) =>
                prev.map((chat) => {
                    const targetId = chat.targetUser?.id;

                    if (
                        targetId !== payload.unblockedByUserId &&
                        targetId !== payload.unblockedTargetUserId
                    ) {
                        return chat;
                    }

                    patchChatInboxCacheAfterBlock(chat.id, clearedStatus);

                    return { ...chat, blockStatus: clearedStatus };
                })
            );
        },
        [applyBlockStatusToChat]
    );

    useChatSocket({
        userId: currentUser?.id,
        sessionId: selectedSessionId,
        onNewMessage: handleNewMessage,
        onSeenMessage: handleSeenMessage,
        onOnlineStatus: handleOnlineStatus,
        onMessageEdited: handleMessageEdited,
        onMessageDeleted: handleMessageDeleted,
        onMessageTranslated: handleMessageTranslated,
        onChatBlocked: handleChatBlocked,
        onChatUnblocked: handleChatUnblocked,
    });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, selectedSessionId]);

    useEffect(() => {
        if (!pendingAttachment) {
            setAttachmentPreviewUrl(null);
            return;
        }

        if (!pendingAttachment.type.startsWith("image/")) {
            setAttachmentPreviewUrl(null);
            return;
        }

        const url = URL.createObjectURL(pendingAttachment);
        setAttachmentPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [pendingAttachment]);

    const handleSelectChat = (sessionId: number) => {
        setSelectedSessionId(sessionId);
        setChats((prev) =>
            prev.map((chat) => (chat.id === sessionId ? { ...chat, unreadCount: 0 } : chat))
        );
        patchChatInboxCacheAfterRead(sessionId);
    };

    const clearPendingAttachment = () => {
        setPendingAttachment(null);

        if (fileInputRef.current) fileInputRef.current.value = "";
        if (imageInputRef.current) imageInputRef.current.value = "";
    };

    const handleAttachmentSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError("ファイルサイズは5MB以下にしてください。");
            event.target.value = "";
            return;
        }

        setError(null);
        setPendingAttachment(file);
    };

    const handleSend = async () => {
        const text = messageText.trim();

        if (
            (!text && !pendingAttachment) ||
            !selectedSessionId ||
            isSending ||
            composerLockedByBlock
        ) {
            return;
        }

        setIsSending(true);

        const result = pendingAttachment
            ? await sendChatMessageWithAttachmentClient(
                selectedSessionId,
                pendingAttachment,
                text || undefined
            )
            : await sendChatMessageClient(selectedSessionId, text);

        setIsSending(false);

        if (!result.success) {
            setError(result.message);
            if (pendingAttachment) {
                clearPendingAttachment();
            }
            return;
        }

        setMessageText("");
        clearPendingAttachment();

        setMessages((prev) => {
            if (prev.some((message) => message.id === result.data.id)) return prev;
            return [...prev, result.data];
        });

        setChats((prev) => bumpChatInboxAfterSend(prev, result.data, selectedSessionId));
        patchChatInboxCacheAfterSend(result.data, selectedSessionId);
        setError(null);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void handleSend();
        }
    };

    const handleBlock = async () => {
        const targetUserId = selectedChat?.targetUser?.id;

        if (!targetUserId || !selectedSessionId || isBlocking || isBlockActiveForSession) return;

        setIsBlocking(true);

        const result = await blockUserAction(targetUserId);

        setIsBlocking(false);

        if (!result.success) {
            setError(result.message);
            return;
        }

        setBlockDialogOpen(false);
        applyBlockStatusToChat(
            selectedSessionId,
            result.data?.blockStatus ?? { blockedByMe: true, blockedByThem: false }
        );
        clearPendingAttachment();
        setMessageText("");
        setError(null);
    };

    const handleUnblock = async () => {
        const targetUserId = selectedChat?.targetUser?.id;

        if (!targetUserId || !selectedSessionId || isUnblocking) return;

        setIsUnblocking(true);

        const result = await unblockUserAction(targetUserId);

        setIsUnblocking(false);

        if (!result.success) {
            setError(result.message);
            return;
        }

        applyBlockStatusToChat(selectedSessionId, {
            blockedByMe: false,
            blockedByThem: false,
        });
        setError(null);
    };

    return (
        <div
            className={`flex h-screen w-full overflow-hidden bg-[#F3EFE4] ${isBootstrapping ? "opacity-95" : ""
                }`}
            style={{
                fontFamily: "'Plus Jakarta Sans', 'Manrope', 'Noto Sans JP', sans-serif",
            }}
        >
            <Sidebar />

            <aside className="flex w-[340px] shrink-0 flex-col border-r border-[#D9C7A5]/55 bg-[#FFFDF7]/95 shadow-[8px_0_28px_rgba(79,55,30,0.08)]">
                <div className="flex shrink-0 flex-col gap-4 border-b border-[#D9C7A5]/55 p-6">
                    <div className="flex items-end justify-between">
                        <div>
                            <h2 className="text-[24px] font-extrabold tracking-[-0.6px] text-[#005B5B]">
                                チャット
                            </h2>
                            <p className="mt-1 text-[12px] font-medium text-[#6E7979]">
                                マッチした相手と会話できます。
                            </p>
                        </div>

                        <span className="rounded-full border border-[#D9C7A5]/70 bg-[#F8EEDB] px-3 py-1 text-[11px] font-bold text-[#8B5E34]">
                            {filteredChats.length}件
                        </span>
                    </div>

                    <div className="relative w-full">
                        <svg
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B5E34]/55"
                            width="16"
                            height="16"
                            viewBox="0 0 18 18"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden
                        >
                            <path
                                d="M16.6 18L10.3 11.7C9.8 12.1 9.225 12.4167 8.575 12.65C7.925 12.8833 7.23333 13 6.5 13C4.68333 13 3.14583 12.3708 1.8875 11.1125C0.629167 9.85417 0 8.31667 0 6.5C0 4.68333 0.629167 3.14583 1.8875 1.8875C3.14583 0.629167 4.68333 0 6.5 0C8.31667 0 9.85417 0.629167 11.1125 1.8875C12.3708 3.14583 13 4.68333 13 6.5C13 7.23333 12.8833 7.925 12.65 8.575C12.4167 9.225 12.1 9.8 11.7 10.3L18 16.6L16.6 18ZM6.5 11C7.75 11 8.8125 10.5625 9.6875 9.6875C10.5625 8.8125 11 7.75 11 6.5C11 5.25 10.5625 4.1875 9.6875 3.3125C8.8125 2.4375 7.75 2 6.5 2C5.25 2 4.1875 2.4375 3.3125 3.3125C2.4375 4.1875 2 5.25 2 6.5C2 7.75 2.4375 8.8125 3.3125 9.6875C4.1875 10.5625 5.25 11 6.5 11Z"
                                fill="currentColor"
                            />
                        </svg>

                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="メッセージを検索"
                            className="h-[44px] w-full rounded-2xl border border-[#D9C7A5]/70 bg-[#FFFDF7] pl-11 pr-4 text-[13px] font-medium text-[#181D1B] shadow-[0_8px_18px_rgba(79,55,30,0.04)] outline-none transition-all placeholder:text-[#6E7979]/45 hover:bg-white focus:border-[#005B5B]/40 focus:ring-4 focus:ring-[#005B5B]/10"
                        />
                    </div>
                </div>

                <div className="hide-scrollbar flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-4">
                    {isLoadingChats && (
                        <p className="py-8 text-center text-[12px] text-[#6E7979]">
                            読み込み中...
                        </p>
                    )}

                    {!isLoadingChats && filteredChats.length === 0 && (
                        <div className="mx-2 rounded-2xl border border-dashed border-[#D9C7A5]/80 bg-[#FFFDF7] px-4 py-8 text-center text-[12px] leading-relaxed text-[#6E7979]">
                            まだメッセージがありません。マッチングから会話を始めましょう。
                        </div>
                    )}

                    {filteredChats.map((chat) => {
                        const isActive = chat.id === selectedSessionId;
                        const target = chat.targetUser;
                        const preview = getMessagePreview(chat.lastMessage);
                        const time = formatChatListTime(chat.lastMessage?.sendAt ?? chat.createdAt);

                        return (
                            <button
                                key={chat.id}
                                type="button"
                                onClick={() => handleSelectChat(chat.id)}
                                className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-[22px] border p-3 text-left transition-all duration-300 active:scale-[0.98] ${isActive
                                        ? "border-[#005B5B]/35 bg-[#E8F4F2] shadow-[0_12px_24px_rgba(0,91,91,0.10)]"
                                        : "border-transparent bg-transparent hover:border-[#D9C7A5]/65 hover:bg-[#FFFDF7]"
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#8B5E34] via-[#E76F51] to-[#005B5B]" />
                                )}

                                <div className="relative h-12 w-12 shrink-0">
                                    <Image
                                        src={getAvatarUrl(target?.avatarUrl)}
                                        alt={getDisplayName(target)}
                                        fill
                                        className="rounded-2xl border-2 border-[#F6EAD5] bg-[#EFE3D0] object-cover shadow-[0_8px_18px_rgba(79,55,30,0.14)]"
                                    />

                                    {target?.isOnline && (
                                        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#FFFDF7] bg-[#22C55E]" />
                                    )}
                                </div>

                                <div className="flex min-w-0 flex-1 flex-col justify-center">
                                    <div className="mb-0.5 flex items-center justify-between">
                                        <span className="truncate text-[14px] font-extrabold text-[#181D1B]">
                                            {getDisplayName(target)}
                                        </span>
                                        <span
                                            className={`shrink-0 text-[10px] font-bold ${isActive ? "text-[#005B5B]" : "text-[#8B5E34]"
                                                }`}
                                        >
                                            {time}
                                        </span>
                                    </div>

                                    <p className="truncate text-[11px] font-medium text-[#6E7979]">
                                        {preview}
                                    </p>
                                </div>

                                {chat.unreadCount > 0 && (
                                    <span className="flex h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#923118] px-1 text-[10px] font-bold text-white shadow-sm">
                                        {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </aside>

            <main className="relative flex flex-1 flex-col bg-[radial-gradient(circle_at_top_left,rgba(231,111,81,0.10),transparent_32%),linear-gradient(180deg,#F8F4EA_0%,#F3EFE4_45%,#EEF5F2_100%)]">
                {!selectedChat ? (
                    <div className="flex flex-1 items-center justify-center p-8">
                        <div className="rounded-[28px] border border-[#D9C7A5]/70 bg-[#FFFDF7] px-8 py-10 text-center shadow-[0_16px_40px_rgba(79,55,30,0.08)]">
                            <p className="text-[14px] font-bold text-[#6E7979]">
                                {isLoadingChats ? "読み込み中..." : "会話を選択してください。"}
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <header className="z-10 flex h-[76px] w-full shrink-0 items-center justify-between border-b border-[#D9C7A5]/55 bg-[#FFFDF7]/88 px-6 shadow-[0_10px_32px_rgba(79,55,30,0.08)] backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <div className="relative h-11 w-11 shrink-0">
                                    <Image
                                        src={getAvatarUrl(selectedChat.targetUser?.avatarUrl)}
                                        alt={getDisplayName(selectedChat.targetUser)}
                                        fill
                                        className="rounded-2xl border-2 border-[#F6EAD5] bg-[#EFE3D0] object-cover shadow-[0_8px_18px_rgba(79,55,30,0.12)]"
                                    />

                                    {selectedChat.targetUser?.isOnline && (
                                        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#FFFDF7] bg-[#22C55E]" />
                                    )}
                                </div>

                                <div className="flex flex-col">
                                    <span className="text-[15px] leading-5 font-extrabold text-[#181D1B]">
                                        {getDisplayName(selectedChat.targetUser)}
                                    </span>

                                    <span
                                        className={`text-[11px] leading-tight font-bold ${selectedChat.targetUser?.isOnline
                                                ? "text-[#16A34A]"
                                                : "text-[#8B5E34]"
                                            }`}
                                    >
                                        {selectedChat.targetUser?.isOnline ? "オンライン" : "オフライン"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsTranslationOn(!isTranslationOn)}
                                    className={`rounded-full border px-3 py-1.5 text-[12px] font-bold transition-all ${isTranslationOn
                                            ? "border-[#005B5B]/20 bg-[#DDEDEA] text-[#005B5B]"
                                            : "border-[#D9C7A5]/70 bg-[#FFFDF7] text-[#8B5E34] hover:bg-[#F8EEDB]"
                                        }`}
                                >
                                    翻訳サポート {isTranslationOn ? "ON" : "OFF"}
                                </button>

                                {selectedChat.targetUser && (
                                    <Link
                                        href={`/profile/${selectedChat.targetUser.id}`}
                                        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D9C7A5]/70 bg-[#FFFDF7] text-[#6E7979] transition-all hover:border-[#005B5B]/30 hover:bg-[#E8F4F2] hover:text-[#005B5B]"
                                        aria-label="プロフィールを見る"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                                            <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" />
                                            <path
                                                d="M9 8.25C9.41421 8.25 9.75 7.91421 9.75 7.5C9.75 7.08579 9.41421 6.75 9 6.75C8.58579 6.75 8.25 7.08579 8.25 7.5C8.25 7.91421 8.58579 8.25 9 8.25Z"
                                                fill="currentColor"
                                            />
                                            <path
                                                d="M9 9.75V12"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                    </Link>
                                )}

                                {!isBlockActiveForSession && selectedChat.targetUser && (
                                    <button
                                        type="button"
                                        onClick={() => setBlockDialogOpen(true)}
                                        disabled={isBlocking}
                                        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#B86B4B]/25 bg-[#F8E0D5] text-[#923118] transition-all hover:bg-[#F3D0C0] disabled:opacity-40"
                                        aria-label="ブロック"
                                    >
                                        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden>
                                            <circle cx="8.5" cy="8.5" r="7" stroke="currentColor" strokeWidth="1.5" />
                                            <path d="M3 8.5H14" stroke="currentColor" strokeWidth="1.5" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </header>

                        {error && (
                            <div className="mx-6 mt-3 rounded-2xl border border-[#B86B4B]/25 bg-[#F8E0D5] px-4 py-3 text-[12px] font-semibold text-[#923118]">
                                {error}
                            </div>
                        )}

                        <div className="hide-scrollbar relative flex flex-1 flex-col overflow-y-auto p-6">
                            {isLoadingMessages && messages.length === 0 && (
                                <p className="text-center text-[12px] text-[#6E7979]">
                                    メッセージを読み込み中...
                                </p>
                            )}

                            {!isLoadingMessages && messages.length === 0 && (
                                <div className="mx-auto mt-12 rounded-[24px] border border-dashed border-[#D9C7A5]/80 bg-[#FFFDF7]/90 px-6 py-8 text-center shadow-[0_12px_28px_rgba(79,55,30,0.06)]">
                                    <p className="text-[13px] font-bold text-[#6E7979]">
                                        最初のメッセージを送ってみましょう。
                                    </p>
                                </div>
                            )}

                            {messages.map((message, index) => {
                                const isMine = currentUser?.id === message.senderId;
                                const translatedPreview = resolveTranslatedText(message.translatedText);
                                const showDateMarker =
                                    index === 0 || !isSameDay(message.sendAt, messages[index - 1].sendAt);
                                const dateLabel = new Date(message.sendAt).toLocaleDateString("ja-JP", {
                                    month: "long",
                                    day: "numeric",
                                    weekday: "short",
                                });
                                const hasImage = Boolean(message.attachmentUrl && isImageAttachment(message));
                                const hasText = Boolean(message.content?.trim());

                                return (
                                    <div key={message.id}>
                                        {showDateMarker && (
                                            <div className="my-3 flex w-full justify-center">
                                                <span className="rounded-full border border-[#D9C7A5]/60 bg-[#FFFDF7] px-3 py-1 text-[10px] font-bold tracking-[1px] text-[#8B5E34] uppercase shadow-sm">
                                                    {dateLabel}
                                                </span>
                                            </div>
                                        )}

                                        {isMine ? (
                                            <div className="mt-5 flex w-full flex-col items-end gap-1 pl-12">
                                                {hasText && hasImage ? (
                                                    <div className="flex w-full flex-col items-end gap-2">
                                                        <div className="max-w-[80%] rounded-[18px] rounded-tr-none bg-gradient-to-r from-[#004F4F] via-[#006A6A] to-[#8B5E34] p-4 shadow-[0_10px_22px_rgba(0,91,91,0.16)]">
                                                            <p className="whitespace-pre-wrap text-right text-[14px] leading-[23px] font-medium text-white">
                                                                {message.content}
                                                            </p>
                                                        </div>

                                                        <div className="max-w-[80%] rounded-[18px] rounded-tr-none bg-transparent p-1">
                                                            <MessageAttachment
                                                                message={message}
                                                                isMine
                                                                onImageClick={(url, fileName) =>
                                                                    setPreviewImage({ url, fileName })
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={`max-w-[80%] rounded-[18px] rounded-tr-none ${hasImage && !hasText
                                                                ? "bg-transparent p-1"
                                                                : "bg-gradient-to-r from-[#004F4F] via-[#006A6A] to-[#8B5E34] p-4 shadow-[0_10px_22px_rgba(0,91,91,0.16)]"
                                                            }`}
                                                    >
                                                        <MessageAttachment
                                                            message={message}
                                                            isMine
                                                            onImageClick={(url, fileName) =>
                                                                setPreviewImage({ url, fileName })
                                                            }
                                                        />

                                                        {hasText && (
                                                            <p className="whitespace-pre-wrap text-right text-[14px] leading-[23px] font-medium text-white">
                                                                {message.content}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="mr-1 flex items-center gap-1.5">
                                                    {message.isSeen && (
                                                        <span className="text-[10px] font-bold text-[#005B5B]">
                                                            既読
                                                        </span>
                                                    )}

                                                    <span className="text-[10px] font-medium text-[#6E7979]">
                                                        {formatMessageTime(message.sendAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-5 flex w-full items-start gap-3">
                                                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#EFE3D0] shadow-[0_4px_10px_rgba(79,55,30,0.14)]">
                                                    <Image
                                                        src={getAvatarUrl(message.sender.avatarUrl)}
                                                        alt={getDisplayName(message.sender)}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>

                                                <div className="flex max-w-[80%] flex-col items-start gap-1">
                                                    {hasText && hasImage ? (
                                                        <div className="flex w-full flex-col items-start gap-2">
                                                            <div className="w-full rounded-[18px] rounded-tl-none border border-[#E4D1B2]/80 bg-[#FFFDF7] p-4 shadow-[0_8px_18px_rgba(79,55,30,0.07)]">
                                                                <p className="whitespace-pre-wrap text-[14px] leading-[23px] font-medium text-[#3E4948]">
                                                                    {message.content}
                                                                </p>

                                                                {isTranslationOn &&
                                                                    translatedPreview &&
                                                                    message.messageType === "TEXT" && (
                                                                        <>
                                                                            <div className="my-2 h-px w-full bg-[#E4D1B2]/70" />
                                                                            <p className="text-[11px] leading-[18px] font-medium text-[#005B5B]/70 italic">
                                                                                {translatedPreview}
                                                                            </p>
                                                                        </>
                                                                    )}
                                                            </div>

                                                            <div className="w-full rounded-[18px] rounded-tl-none bg-transparent p-1">
                                                                <MessageAttachment
                                                                    message={message}
                                                                    isMine={false}
                                                                    onImageClick={(url, fileName) =>
                                                                        setPreviewImage({ url, fileName })
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className={`w-full rounded-[18px] rounded-tl-none ${hasImage && !hasText
                                                                    ? "bg-transparent p-1"
                                                                    : "border border-[#E4D1B2]/80 bg-[#FFFDF7] p-4 shadow-[0_8px_18px_rgba(79,55,30,0.07)]"
                                                                }`}
                                                        >
                                                            <MessageAttachment
                                                                message={message}
                                                                isMine={false}
                                                                onImageClick={(url, fileName) =>
                                                                    setPreviewImage({ url, fileName })
                                                                }
                                                            />

                                                            {hasText && (
                                                                <p className="whitespace-pre-wrap text-[14px] leading-[23px] font-medium text-[#3E4948]">
                                                                    {message.content}
                                                                </p>
                                                            )}

                                                            {isTranslationOn &&
                                                                translatedPreview &&
                                                                message.messageType === "TEXT" && (
                                                                    <>
                                                                        <div className="my-2 h-px w-full bg-[#E4D1B2]/70" />
                                                                        <p className="text-[11px] leading-[18px] font-medium text-[#005B5B]/70 italic">
                                                                            {translatedPreview}
                                                                        </p>
                                                                    </>
                                                                )}
                                                        </div>
                                                    )}

                                                    <span className="ml-1 text-[10px] font-medium text-[#6E7979]">
                                                        {formatMessageTime(message.sendAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            <div ref={messagesEndRef} />
                        </div>

                        <div className="z-10 flex w-full shrink-0 flex-col items-stretch gap-3 border-t border-[#D9C7A5]/55 bg-[#FFFDF7]/92 p-5 shadow-[0_-12px_30px_rgba(79,55,30,0.06)] backdrop-blur-xl">
                            {!composerLockedByBlock && (pendingAttachment || attachmentPreviewUrl) && (
                                attachmentPreviewUrl ? (
                                    <div className="w-full overflow-hidden rounded-2xl border border-[#D9C7A5]/70 bg-[#F8EEDB]">
                                        <div className="flex w-full justify-center bg-black/5 p-2">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={attachmentPreviewUrl}
                                                alt="プレビュー"
                                                className="h-auto max-h-[min(36vh,280px)] w-auto max-w-full rounded-xl object-contain"
                                            />
                                        </div>

                                        <div className="flex items-center gap-3 px-3 py-2">
                                            <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#181D1B]">
                                                {pendingAttachment?.name}
                                            </p>

                                            <button
                                                type="button"
                                                onClick={clearPendingAttachment}
                                                className="shrink-0 px-2 text-[12px] font-bold text-[#8B5E34] hover:text-[#181D1B]"
                                            >
                                                取消
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex w-full items-center gap-3 rounded-2xl border border-[#D9C7A5]/70 bg-[#F8EEDB] p-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFFDF7] text-xl">
                                            📎
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-medium text-[#181D1B]">
                                                {pendingAttachment?.name}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={clearPendingAttachment}
                                            className="px-2 text-[12px] font-bold text-[#8B5E34] hover:text-[#181D1B]"
                                        >
                                            取消
                                        </button>
                                    </div>
                                )
                            )}

                            {!composerLockedByBlock && (
                                <div className="flex min-h-[46px] w-full flex-row items-end gap-3">
                                    <div className="flex h-[44px] shrink-0 flex-row items-center gap-1">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf,.doc,.docx,.txt,.zip"
                                            className="hidden"
                                            onChange={handleAttachmentSelect}
                                        />
                                        <input
                                            ref={imageInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleAttachmentSelect}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isSending || composerLockedByBlock}
                                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D9C7A5]/60 bg-[#FFFDF7] text-[#005B5B] transition-all hover:bg-[#F8EEDB] disabled:opacity-40"
                                            aria-label="ファイルを添付"
                                        >
                                            <span className="text-[18px]">＋</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => imageInputRef.current?.click()}
                                            disabled={isSending || composerLockedByBlock}
                                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D9C7A5]/60 bg-[#FFFDF7] text-[#005B5B] transition-all hover:bg-[#F8EEDB] disabled:opacity-40"
                                            aria-label="画像を添付"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                                                <path
                                                    d="M2 18C1.45 18 0.979167 17.8042 0.5875 17.4125C0.195833 17.0208 0 16.55 0 16V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H16C16.55 0 17.0208 0.195833 17.4125 0.5875C17.8042 0.979167 18 1.45 18 2V16C18 16.55 17.8042 17.0208 17.4125 17.4125C17.0208 17.8042 16.55 18 16 18H2ZM2 16H16V2H2V16ZM3 14H15L11.25 9L8.25 13L6 10L3 14Z"
                                                    fill="currentColor"
                                                />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="relative min-w-0 flex-1">
                                        <textarea
                                            value={messageText}
                                            onChange={(event) => setMessageText(event.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="メッセージを入力..."
                                            disabled={isSending || composerLockedByBlock}
                                            rows={1}
                                            className="h-[46px] max-h-[128px] min-h-[46px] w-full resize-none rounded-2xl border border-[#D9C7A5]/70 bg-[#FFFDF7] py-3 pl-4 pr-14 text-[14px] font-medium leading-[20px] text-[#181D1B] outline-none transition-all placeholder:text-[#6E7979]/45 focus:border-[#005B5B]/40 focus:ring-4 focus:ring-[#005B5B]/10 disabled:opacity-60"
                                        />

                                        <button
                                            type="button"
                                            onClick={handleSend}
                                            disabled={
                                                (!messageText.trim() && !pendingAttachment) ||
                                                isSending ||
                                                composerLockedByBlock
                                            }
                                            className="absolute right-[10px] top-1/2 flex h-[30px] w-[34px] -translate-y-1/2 items-center justify-center rounded-xl bg-[#005B5B] text-white transition-all hover:bg-[#004A4A] disabled:opacity-40"
                                            aria-label="送信"
                                        >
                                            <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden>
                                                <path
                                                    d="M0 9.33333V5.83333L4.66667 4.66667L0 3.5V0L11.0833 4.66667L0 9.33333Z"
                                                    fill="white"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {blockBannerMessage && (
                                <div className="flex w-full flex-col items-center gap-2 rounded-2xl border border-[#B86B4B]/25 bg-[#F8E0D5] px-4 py-3 text-center text-[13px] font-medium text-[#923118]">
                                    <p>{blockBannerMessage}</p>

                                    {selectedBlockStatus?.blockedByMe && (
                                        <button
                                            type="button"
                                            onClick={handleUnblock}
                                            disabled={isUnblocking}
                                            className="rounded-full bg-[#005B5B] px-4 py-1.5 text-[12px] font-bold text-white transition-all hover:bg-[#004A4A] disabled:opacity-50"
                                        >
                                            {isUnblocking ? "処理中..." : "ブロック解除"}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {previewImage && (
                <ChatImagePreview
                    imageUrl={previewImage.url}
                    fileName={previewImage.fileName}
                    onClose={() => setPreviewImage(null)}
                />
            )}

            <BlockConfirmDialog
                open={blockDialogOpen}
                isBusy={isBlocking}
                onConfirm={handleBlock}
                onCancel={() => setBlockDialogOpen(false)}
            />
        </div>
    );
}
