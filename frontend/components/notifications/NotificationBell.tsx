"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    getNotificationsAction,
    markNotificationReadAction,
    type AppNotification,
} from "@/app/actions/notification";
import { resolveImageUrl } from "@/lib/image";

function getNotificationLink(notification: AppNotification): string | null {
    if (notification.type === "MATCH" && notification.sessionId) {
        return `/chat?session=${notification.sessionId}`;
    }
    if (notification.type === "PROFILE_LIKE" && notification.relatedUserId) {
        return `/profile/${notification.relatedUserId}`;
    }
    if (notification.relatedUserId) {
        return `/profile/${notification.relatedUserId}`;
    }
    return null;
}

function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
        return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

function getNotificationTitle(notification: AppNotification) {
    const name = notification.relatedUser?.name;

    if (notification.type === "PROFILE_LIKE" && name) {
        return `${name}さんがあなたのプロフィールにいいねしました。`;
    }
    if ((notification.type === "NEW_MESSAGE" || notification.type === "MESSAGE") && name) {
        return `${name}さんから新しいメッセージが届きました。`;
    }
    if (notification.type === "MATCH" && name) {
        return `${name}さんとマッチしました。`;
    }

    return notification.message;
}

function getNotificationTypeLabel(type: string) {
    if (type === "PROFILE_LIKE") return "いいね";
    if (type === "NEW_MESSAGE" || type === "MESSAGE") return "メッセージ";
    if (type === "MATCH") return "マッチ";
    if (type === "EVENT") return "イベント";
    if (type === "GROUP") return "グループ";
    return "通知";
}

export default function NotificationBell() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const loadNotifications = useCallback(async () => {
        setIsLoading(true);
        const res = await getNotificationsAction();
        setIsLoading(false);
        if (res.success) {
            setNotifications(res.data);
        }
    }, []);

    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const handleNotificationClick = async (notification: AppNotification) => {
        if (!notification.isRead) {
            await markNotificationReadAction(notification.id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
            );
        }

        const href = getNotificationLink(notification);
        setOpen(false);
        if (href) {
            router.push(href);
        }
    };

    return (
        <div className="relative" ref={panelRef}>
            <button
                type="button"
                onClick={() => {
                    setOpen((prev) => !prev);
                    if (!open) loadNotifications();
                }}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#005B5B] transition-colors hover:bg-[#E8F4F2]"
                aria-label="通知"
            >
                <svg width="16" height="20" viewBox="0 0 16 20" fill="none" aria-hidden>
                    <path
                        d="M0 17V15H2V8C2 6.61667 2.41667 5.3875 3.25 4.3125C4.08333 3.2375 5.16667 2.53333 6.5 2.2V1.5C6.5 1.08333 6.64583 0.729167 6.9375 0.4375C7.22917 0.145833 7.58333 0 8 0C8.41667 0 8.77083 0.145833 9.0625 0.4375C9.35417 0.729167 9.5 1.08333 9.5 1.5V2.2C10.8333 2.53333 11.9167 3.2375 12.75 4.3125C13.5833 5.3875 14 6.61667 14 8V15H16V17H0ZM8 20C7.45 20 6.97917 19.8042 6.5875 19.4125C6.19583 19.0208 6 18.55 6 18H10C10 18.55 9.80417 19.0208 9.4125 19.4125C9.02083 19.8042 8.55 20 8 20ZM4 15H12V8C12 6.9 11.6083 5.95833 10.825 5.175C10.0417 4.39167 9.1 4 8 4C6.9 4 5.95833 4.39167 5.175 5.175C4.39167 5.95833 4 6.9 4 8V15Z"
                        fill="currentColor"
                    />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute right-2 top-2 h-2 min-w-[8px] rounded-full bg-[#E76F51] px-0.5 ring-2 ring-[#FFFDF7]" />
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-12 z-[300] flex max-h-[420px] w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden rounded-[28px] border border-[#D9C7A5]/80 bg-[#FFFDF7] shadow-[0_24px_60px_rgba(79,55,30,0.22)]">
                    <div className="border-b border-[#D9C7A5]/60 bg-[#FFFDF7] px-5 py-4">
                        <h3 className="text-[14px] font-extrabold text-[#005B5B]">通知</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#FFFDF7_0%,#F8F4EA_100%)]">
                        {isLoading ? (
                            <p className="px-5 py-8 text-center text-[13px] font-medium text-[#6E7979]">読み込み中...</p>
                        ) : notifications.length === 0 ? (
                            <p className="px-5 py-8 text-center text-[13px] font-medium text-[#6E7979]">通知はありません</p>
                        ) : (
                            notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    type="button"
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`flex w-full items-start gap-3 border-b border-[#D9C7A5]/45 px-5 py-4 text-left transition-colors hover:bg-[#F8EEDB]/70 ${!notification.isRead ? "bg-[#DDEDEA]/55" : ""}`}
                                >
                                    <span className="relative mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[#D9C7A5]/70 bg-[#F8EEDB]">
                                        {notification.relatedUser?.avatarUrl ? (
                                            <Image
                                                src={resolveImageUrl(notification.relatedUser.avatarUrl)}
                                                alt=""
                                                fill
                                                sizes="36px"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <span className="flex h-full w-full items-center justify-center text-[12px] font-black text-[#005B5B]">
                                                {getNotificationTypeLabel(notification.type).slice(0, 1)}
                                            </span>
                                        )}
                                    </span>

                                    <span className="min-w-0 flex-1">
                                        <span className="mb-1 inline-flex rounded-full border border-[#005B5B]/15 bg-[#E8F4F2] px-2 py-0.5 text-[10px] font-black text-[#005B5B]">
                                            {getNotificationTypeLabel(notification.type)}
                                        </span>
                                        <span className="block text-[13px] font-bold leading-snug text-[#181D1B]">
                                            {getNotificationTitle(notification)}
                                        </span>
                                        <span className="mt-1 block text-[11px] font-medium text-[#8B5E34]">
                                            {formatTime(notification.createdAt)}
                                        </span>
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
