"use client";

import Image from "next/image";
import { formatEventDate } from "@/lib/events-format";
import { resolveImageUrl } from "@/lib/image";

export type EventCardData = {
    id: number;
    title: string;
    description: string;
    eventTime: string;
    format: "online" | "offline" | string;
    address?: string | null;
    urlLink?: string | null;
    imageUrl?: string | null;
    tags?: string[];
    isNew?: boolean;
    memberAvatars: string[];
    extraMemberCount: number;
    isJoined?: boolean;
};

function formatEventTime(iso: string) {
    const date = new Date(iso);
    return date.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

type EventCardProps = {
    event: EventCardData;
    onJoin?: (eventId: number) => void;
    isJoining?: boolean;
};

export default function EventCard({ event, onJoin, isJoining }: EventCardProps) {
    const isOnline = event.format === "online";
    const imageSrc = resolveImageUrl(event.imageUrl, "/assets/images/events/event-1.png");

    return (
        <article className="group relative flex min-h-[400px] w-full flex-col overflow-hidden rounded-[28px] border border-[#D9C7A5]/75 bg-[#FFFDF7] shadow-[0_16px_36px_rgba(79,55,30,0.10)] ring-1 ring-white/70 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[#005B5B]/45 hover:bg-white hover:shadow-[0_24px_54px_rgba(0,91,91,0.16)] lg:flex-row">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1.5 bg-gradient-to-r from-[#8B5E34] via-[#E76F51] to-[#005B5B]" />

            <div className="relative isolate flex w-full shrink-0 flex-col justify-center overflow-hidden bg-[#EFE3D0] lg:w-[40%] lg:min-w-[280px] lg:max-w-[420px]">
                <div className="relative h-[240px] w-full overflow-hidden lg:h-full lg:min-h-[280px] lg:flex-1">
                    <Image
                        src={imageSrc}
                        alt={event.title}
                        fill
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        sizes="420px"
                    />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-[#181D1B]/58 via-[#181D1B]/12 to-transparent" />

                {event.isNew && (
                    <span className="absolute left-5 top-5 z-10 rounded-xl bg-[#923118] px-4 py-1.5 text-[11px] font-black tracking-widest text-[#FFF7F6] uppercase shadow-[0_4px_10px_rgba(146,49,24,0.3)]">
                        NEW
                    </span>
                )}

                <span
                    className={`absolute bottom-5 left-5 z-10 rounded-full border px-4 py-1.5 text-[11px] font-black shadow-sm backdrop-blur-md ${isOnline
                            ? "border-[#005B5B]/20 bg-[#DDEDEA] text-[#005B5B]"
                            : "border-[#B86B4B]/25 bg-[#F8E0D5] text-[#923118]"
                        }`}
                >
                    {isOnline ? "オンライン" : "対面"}
                </span>
            </div>

            <div className="flex flex-1 flex-col justify-between p-7 lg:p-9">
                <div className="flex flex-col gap-5 pb-6 lg:pb-8">
                    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
                        <h3 className="text-[24px] leading-[32px] font-extrabold text-[#181D1B] transition-colors duration-300 group-hover:text-[#005B5B] lg:text-[28px] lg:leading-[36px]">
                            {event.title}
                        </h3>
                    </div>

                    <div className="grid gap-3 rounded-2xl border border-[#E4D1B2]/80 bg-[#F8EEDB] px-4 py-3 text-[#6E7979] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                            <svg width="14" height="15" viewBox="0 0 14 15" fill="none" aria-hidden>
                                <path
                                    d="M11.5 1.5H12.5C12.7652 1.5 13.0196 1.60536 13.2071 1.79289C13.3946 1.98043 13.5 2.23478 13.5 2.5V13.5C13.5 13.7652 13.3946 14.0196 13.2071 14.2071C13.0196 14.3946 12.7652 14.5 12.5 14.5H1.5C1.23478 14.5 0.98043 14.3946 0.79289 14.2071C0.60536 14.0196 0.5 13.7652 0.5 13.5V2.5C0.5 2.23478 0.60536 1.98043 0.79289 1.79289C0.98043 1.60536 1.23478 1.5 1.5 1.5H2.5M10.5 1.5V3.5M3.5 1.5V3.5M0.5 6.5H13.5"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <span
                                className="text-[14px] font-semibold"
                                style={{ fontFamily: "Manrope, sans-serif" }}
                            >
                                {formatEventDate(event.eventTime)}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
                                <path
                                    d="M7.5 3.5V7.5L10 9M14 7.5C14 11.0899 11.0899 14 7.5 14C3.91015 14 1 11.0899 1 7.5C1 3.91015 3.91015 1 7.5 1C11.0899 1 14 3.91015 14 7.5Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <span
                                className="text-[14px] font-semibold"
                                style={{ fontFamily: "Manrope, sans-serif" }}
                            >
                                {formatEventTime(event.eventTime)}
                            </span>
                        </div>

                        <div className="flex min-w-0 items-center gap-2 sm:col-span-2">
                            <svg width="12" height="15" viewBox="0 0 12 15" fill="none" aria-hidden>
                                <path
                                    d="M6 7.5C6.82843 7.5 7.5 6.82843 7.5 6C7.5 5.17157 6.82843 4.5 6 4.5C5.17157 4.5 4.5 5.17157 4.5 6C4.5 6.82843 5.17157 7.5 6 7.5Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                />
                                <path
                                    d="M6 13.5C8.5 10.5 10.5 8.5 10.5 6C10.5 3.51472 8.48528 1.5 6 1.5C3.51472 1.5 1.5 3.51472 1.5 6C1.5 8.5 3.5 10.5 6 13.5Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                />
                            </svg>

                            {isOnline && event.urlLink ? (
                                <a
                                    href={event.urlLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="truncate text-[14px] font-semibold text-[#005B5B] underline hover:text-[#004A4A]"
                                >
                                    {event.urlLink}
                                </a>
                            ) : (
                                <span className="truncate text-[14px] font-semibold">
                                    {event.address || "会場未定"}
                                </span>
                            )}
                        </div>
                    </div>

                    <p className="text-[15px] leading-[26px] font-medium text-[#3E4948]">
                        {event.description}
                    </p>

                    {event.tags && event.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {event.tags.map((tag, index) => (
                                <span
                                    key={tag}
                                    className={`rounded-full border px-3 py-1.5 text-[12px] font-bold shadow-sm ${index % 2 === 0
                                            ? "border-[#005B5B]/20 bg-[#DDEDEA] text-[#005B5B]"
                                            : "border-[#B86B4B]/25 bg-[#F8E0D5] text-[#923118]"
                                        }`}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-4 border-t border-[#D9C7A5]/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center">
                        {event.memberAvatars.slice(0, 3).map((avatar, index) => (
                            <div
                                key={`${avatar}-${index}`}
                                className="relative -ml-2.5 h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-[#FFFDF7] bg-[#EFE3D0] shadow-[0_4px_10px_rgba(79,55,30,0.14)] first:ml-0"
                            >
                                <Image
                                    src={resolveImageUrl(avatar, "/assets/images/avatars/avatar-1.jpg")}
                                    alt=""
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        ))}

                        {event.extraMemberCount > 0 && (
                            <div className="relative -ml-2.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#FFFDF7] bg-[#DDEDEA] text-[11px] font-black text-[#005B5B] shadow-[0_4px_10px_rgba(79,55,30,0.12)]">
                                +{event.extraMemberCount}
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => onJoin?.(event.id)}
                        disabled={isJoining || event.isJoined}
                        className={`rounded-2xl px-8 py-3 text-[15px] font-bold transition-all duration-300 ease-out active:scale-95 ${event.isJoined
                                ? "cursor-default border border-[#005B5B]/20 bg-[#DDEDEA] text-[#005B5B]"
                                : "cursor-pointer bg-gradient-to-r from-[#004F4F] via-[#006A6A] to-[#8B5E34] text-white shadow-[0_12px_24px_rgba(0,91,91,0.18)] hover:-translate-y-0.5 hover:from-[#003F3F] hover:via-[#005B5B] hover:to-[#764C29] hover:shadow-[0_18px_34px_rgba(0,91,91,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                            }`}
                    >
                        {event.isJoined ? "参加済み" : isJoining ? "処理中…" : "参加する"}
                    </button>
                </div>
            </div>
        </article>
    );
}