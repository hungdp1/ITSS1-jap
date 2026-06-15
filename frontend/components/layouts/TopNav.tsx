"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useAuth } from "@/lib/auth-context";
import SearchInput from "@/components/ui/SearchInput";
import UserAvatar from "@/components/ui/UserAvatar";

interface TopNavProps {
    title?: string;
    backLink?: string;
    showSearch?: boolean;
    searchPlaceholder?: string;
    searchValue?: string;
    onSearch?: (query: string) => void;
    searchClassName?: string;
    children?: ReactNode;
}

export default function TopNav({
    title,
    backLink,
    showSearch = false,
    searchPlaceholder,
    searchValue = "",
    onSearch,
    searchClassName = "w-[min(60vw,340px)]",
    children,
}: TopNavProps) {
    const { user } = useAuth();
    const profileHref = user?.id ? `/profile/${user.id}` : "/profile";
    const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "ユーザー";

    return (
        <header className="relative top-0 z-[90] flex min-h-18 w-full items-center justify-between gap-4 border-b border-[#D9C7A5]/45 bg-[#FFFDF7]/88 px-4 py-3 shadow-[0_10px_32px_rgba(79,55,30,0.08)] backdrop-blur-xl md:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-6">
                {backLink && (
                    <Link
                        href={backLink}
                        aria-label="前のページへ戻る"
                        className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D9C7A5]/70 bg-[#FFFDF7] text-[#005B5B] shadow-[0_8px_18px_rgba(79,55,30,0.08)] transition-all duration-300 hover:border-[#005B5B]/30 hover:bg-[#E8F4F2] active:scale-90"
                    >
                        <svg
                            className="transition-transform duration-300 group-hover:-translate-x-0.5"
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden
                        >
                            <path
                                d="M10 14L4 8L10 2"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </Link>
                )}

                {showSearch ? (
                    <div className="rounded-2xl border border-[#D9C7A5]/50 bg-[#FFFDF7] shadow-[0_8px_20px_rgba(79,55,30,0.06)]">
                        <SearchInput
                            value={searchValue}
                            placeholder={searchPlaceholder || "検索"}
                            onValueChange={(value) => onSearch?.(value)}
                            className={searchClassName}
                        />
                    </div>
                ) : (
                    title && (
                        <h2 className="truncate text-[18px] leading-7 font-extrabold tracking-tight text-[#005B5B] md:text-[20px]">
                            {title}
                        </h2>
                    )
                )}

                {children}
            </div>

            <div className="flex flex-row items-center gap-4 md:gap-6">
                <div className="flex flex-row items-center gap-3 md:gap-4">
                    <div className="rounded-full border border-[#D9C7A5]/50 bg-[#FFFDF7] shadow-[0_8px_18px_rgba(79,55,30,0.06)] transition-all hover:border-[#005B5B]/25 hover:bg-[#E8F4F2]">
                        <NotificationBell />
                    </div>

                    <div className="hidden h-7 w-px bg-[#D9C7A5]/70 sm:block" />
                </div>

                <Link
                    href={profileHref}
                    aria-label="プロフィールを開く"
                    className="rounded-full border border-[#D9C7A5]/60 bg-[#FFFDF7] p-1 shadow-[0_8px_18px_rgba(79,55,30,0.08)] ring-2 ring-[#005B5B]/10 transition-all duration-300 hover:scale-105 hover:border-[#005B5B]/35 hover:ring-[#005B5B]/35 active:scale-95"
                >
                    <UserAvatar name={displayName} src={user?.avatarUrl} size={36} />
                </Link>
            </div>

            <div className="absolute right-0 bottom-0 left-8 h-px bg-gradient-to-r from-transparent via-[#D9C7A5]/55 to-transparent" />
        </header>
    );
}
