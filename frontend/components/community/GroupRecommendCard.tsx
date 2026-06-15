"use client";

import Image from "next/image";
import Link from "next/link";
import { resolveImageUrl } from "@/lib/image";

export type GroupCardData = {
    id: number;
    name: string;
    desc: string;
    coverImg: string;
    hobbyTags: string[];
    languageTags: string[];
    memberCount: number;
    memberAvatars: string[];
    isJoined: boolean;
};

function formatTagLabel(tag: string) {
    const normalized = tag.trim();
    return normalized.startsWith("#") ? normalized.toUpperCase() : `#${normalized.toUpperCase()}`;
}

function formatMemberCount(count: number) {
    return count.toLocaleString("ja-JP");
}

function extraMembersLabel(count: number) {
    if (count <= 2) return "";

    const extra = count - 2;
    if (extra >= 1000) return `+${Math.floor(extra / 1000)}K`;

    return `+${extra}`;
}

type GroupRecommendCardProps = {
    group: GroupCardData;
    onJoin?: (groupId: number) => void;
    isJoining?: boolean;
};

export default function GroupRecommendCard({ group, onJoin, isJoining }: GroupRecommendCardProps) {
    const displayTags = [...group.hobbyTags, ...group.languageTags].slice(0, 3);
    const showAvatars = group.memberCount > 0 && group.memberAvatars.length > 0;
    const extraLabel = extraMembersLabel(group.memberCount);

    return (
        <Link href={`/community/${group.id}`} className="block h-full">
            <article className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[28px] border border-[#D9C7A5]/75 bg-[#FFFDF7] shadow-[0_16px_36px_rgba(79,55,30,0.10)] ring-1 ring-white/70 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[#005B5B]/45 hover:bg-white hover:shadow-[0_24px_54px_rgba(0,91,91,0.16)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1.5 bg-gradient-to-r from-[#8B5E34] via-[#E76F51] to-[#005B5B]" />

                <div className="relative h-44 w-full shrink-0 overflow-hidden bg-[#EFE3D0]">
                    <Image
                        src={group.coverImg}
                        alt={group.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-[#181D1B]/75 via-[#181D1B]/20 to-transparent" />

                    {displayTags.length > 0 && (
                        <div className="absolute bottom-5 left-5 z-10 flex flex-wrap gap-2">
                            {displayTags.map((tag, index) => (
                                <span
                                    key={`${tag}-${index}`}
                                    className={`rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.5px] uppercase shadow-sm backdrop-blur-md ${index % 2 === 0
                                            ? "border-[#005B5B]/20 bg-[#DDEDEA] text-[#005B5B]"
                                            : "border-[#B86B4B]/25 bg-[#F8E0D5] text-[#923118]"
                                        }`}
                                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                >
                                    {formatTagLabel(tag)}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex min-h-[244px] flex-1 flex-col justify-between p-6">
                    <div>
                        <h4 className="mb-2 text-[18px] leading-6 font-extrabold text-[#181D1B] transition-colors duration-300 group-hover:text-[#005B5B]">
                            {group.name}
                        </h4>
                        <p className="line-clamp-3 text-[13px] leading-[21px] text-[#6E7979]">
                            {group.desc}
                        </p>
                    </div>

                    <div className="mt-6 rounded-2xl border border-[#E4D1B2]/80 bg-[#F8EEDB] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                        <div className="flex items-end justify-between gap-3">
                            {showAvatars ? (
                                <div className="flex min-w-0 flex-col gap-1.5">
                                    <div className="flex -space-x-1.5">
                                        {group.memberAvatars.slice(0, 2).map((avatar, index) => (
                                            <div
                                                key={index}
                                                className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-[#FFFDF7] bg-[#EFE3D0] shadow-[0_4px_10px_rgba(79,55,30,0.14)]"
                                            >
                                                <Image
                                                    src={resolveImageUrl(
                                                        avatar,
                                                        "/assets/images/avatars/avatar-1.jpg"
                                                    )}
                                                    alt=""
                                                    fill
                                                    sizes="32px"
                                                    className="object-cover"
                                                />
                                            </div>
                                        ))}

                                        {group.memberCount > 2 && (
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#FFFDF7] bg-[#DDEDEA] shadow-[0_4px_10px_rgba(79,55,30,0.12)]">
                                                <span
                                                    className="text-[10px] font-bold text-[#005B5B]"
                                                    style={{
                                                        fontFamily:
                                                            "'Plus Jakarta Sans', sans-serif",
                                                    }}
                                                >
                                                    {extraLabel}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <p
                                        className="text-[10.5px] leading-none font-bold tracking-[0.55px] text-[#8B5E34] uppercase"
                                        style={{
                                            fontFamily:
                                                group.memberCount >= 1000
                                                    ? "'Plus Jakarta Sans', sans-serif"
                                                    : "Manrope",
                                        }}
                                    >
                                        {formatMemberCount(group.memberCount)} メンバー
                                    </p>
                                </div>
                            ) : (
                                <p className="pb-1 text-[10.5px] leading-none font-bold tracking-[0.55px] text-[#8B5E34] uppercase">
                                    {group.memberCount > 0
                                        ? `${formatMemberCount(group.memberCount)} メンバー`
                                        : "メンバー募集中"}
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();

                                    if (!group.isJoined && onJoin) {
                                        onJoin(group.id);
                                    }
                                }}
                                disabled={group.isJoined || isJoining}
                                className={`flex shrink-0 items-center gap-1.5 rounded-2xl px-5 py-2.5 text-[13px] font-bold transition-all duration-300 active:scale-95 ${group.isJoined
                                        ? "cursor-default border border-[#B86B4B]/25 bg-[#F8E0D5] text-[#923118]"
                                        : "cursor-pointer border border-[#005B5B]/25 bg-[#FFFDF7] text-[#005B5B] shadow-sm hover:border-transparent hover:bg-[#005B5B] hover:text-white hover:shadow-[0_10px_22px_rgba(0,91,91,0.18)]"
                                    }`}
                            >
                                {group.isJoined && (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={3}
                                        stroke="currentColor"
                                        className="h-2.5 w-2.5"
                                        aria-hidden
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="m4.5 12.75 6 6 9-13.5"
                                        />
                                    </svg>
                                )}

                                {group.isJoined ? "参加中" : isJoining ? "処理中…" : "参加する"}
                            </button>
                        </div>
                    </div>
                </div>
            </article>
        </Link>
    );
}