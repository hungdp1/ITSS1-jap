"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "@/components/layouts/Sidebar";
import TopNav from "@/components/layouts/TopNav";
import GroupRecommendCard, { type GroupCardData } from "@/components/community/GroupRecommendCard";
import { joinGroupAction, searchGroupsAction } from "../actions/group";
import {
    COMMUNITY_HOME_CACHE_KEY,
    fetchCommunityHomeClient,
    readCommunityHomeCache,
} from "@/lib/community-client";
import {
    type ApiGroup,
    type JoinedGroupItem,
    buildJoinedIdsFromGroups,
    formatGroupCard,
    formatJoinedGroup,
    GROUP_LANGUAGE_LEVEL_OPTIONS,
} from "@/lib/community-format";
import { invalidateSessionCache } from "@/lib/session-cache";
import { MIN_SEARCH_LENGTH, normalizeSearchQuery, SEARCH_DEBOUNCE_MS } from "@/lib/search";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const ALL_FILTER = "全て";

type CommunityClientProps = {
    initialJoinedGroups?: JoinedGroupItem[];
    initialSuggestedGroups?: GroupCardData[];
    initialJoinedIds?: number[];
    initialHobbyTagOptions?: string[];
};

type FilterDropdownProps = {
    value: string;
    options: readonly string[];
    placeholder?: string;
    customPlaceholder: string;
    onChange: (value: string) => void;
};

function FilterDropdown({
    value,
    options,
    placeholder = "全て",
    customPlaceholder,
    onChange,
}: FilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [customValue, setCustomValue] = useState("");

    const displayValue = value === ALL_FILTER ? placeholder : value;

    const handleSelect = (nextValue: string) => {
        onChange(nextValue);
        setIsOpen(false);
        setCustomValue("");
    };

    const handleApplyCustom = () => {
        const trimmed = customValue.trim();
        if (!trimmed) return;

        onChange(trimmed);
        setIsOpen(false);
        setCustomValue("");
    };

    return (
        <div className="relative w-[160px] shrink-0 2xl:w-[190px]">
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={`flex h-[52px] w-full items-center justify-between rounded-2xl border px-4 text-[14px] font-bold transition-all active:scale-[0.98] ${value !== ALL_FILTER
                        ? "border-[#005B5B]/30 bg-[#E8F4F2] text-[#005B5B] shadow-[0_8px_22px_rgba(0,91,91,0.12)]"
                        : "border-[#D9C7A5]/70 bg-[#FFFDF7] text-[#3E4948] shadow-[0_8px_18px_rgba(79,55,30,0.04)] hover:border-[#005B5B]/30 hover:bg-white"
                    }`}
                aria-expanded={isOpen}
            >
                <span className="truncate">{displayValue}</span>

                <svg
                    className={`ml-2 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                        }`}
                    width="16"
                    height="16"
                    viewBox="0 0 21 21"
                    fill="none"
                    aria-hidden
                >
                    <path
                        d="M6.3 8.4L10.5 12.6L14.7 8.4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute left-0 top-[calc(100%+8px)] z-[120] w-[260px] overflow-hidden rounded-2xl border border-[#D9C7A5]/80 bg-[#FFFDF7] shadow-[0_24px_60px_rgba(79,55,30,0.22)]">
                    <div className="max-h-[236px] overflow-y-auto p-2">
                        <button
                            type="button"
                            onClick={() => handleSelect(ALL_FILTER)}
                            className={`flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-[14px] font-bold transition-all ${value === ALL_FILTER
                                    ? "bg-[#005B5B] text-white"
                                    : "text-[#3E4948] hover:bg-[#F3E7D2]"
                                }`}
                        >
                            <span className="flex h-5 w-5 items-center justify-center">
                                {value === ALL_FILTER && "✓"}
                            </span>
                            <span className="truncate">全て</span>
                        </button>

                        {options.map((option) => {
                            const active = value === option;

                            return (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => handleSelect(option)}
                                    className={`mt-1 flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-[14px] font-bold transition-all ${active
                                            ? "bg-[#005B5B] text-white"
                                            : "text-[#3E4948] hover:bg-[#F3E7D2]"
                                        }`}
                                >
                                    <span className="flex h-5 w-5 items-center justify-center">
                                        {active && "✓"}
                                    </span>
                                    <span className="truncate">{option}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="border-t border-[#D9C7A5]/70 bg-white p-3">
                        <p className="mb-2 text-[11px] font-bold tracking-[1px] text-[#8B5E34] uppercase">
                            その他
                        </p>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={customValue}
                                onChange={(event) => setCustomValue(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        handleApplyCustom();
                                    }
                                }}
                                placeholder={customPlaceholder}
                                className="h-10 min-w-0 flex-1 rounded-xl border border-[#D9C7A5]/70 bg-[#FFFDF7] px-3 text-[13px] font-medium text-[#181D1B] outline-none placeholder:text-[#6E7979]/45 focus:border-[#005B5B]/40 focus:bg-white focus:ring-2 focus:ring-[#005B5B]/15"
                            />

                            <button
                                type="button"
                                onClick={handleApplyCustom}
                                className="h-10 shrink-0 rounded-xl bg-[#005B5B] px-4 text-[13px] font-bold text-white transition-all hover:bg-[#004A4A] active:scale-[0.98]"
                            >
                                適用
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CommunityClient({
    initialJoinedGroups = [],
    initialSuggestedGroups = [],
    initialJoinedIds = [],
    initialHobbyTagOptions = [],
}: CommunityClientProps = {}) {
    const cachedHome = readCommunityHomeCache();

    const cachedJoined = cachedHome?.myGroups.map(formatJoinedGroup) ?? initialJoinedGroups;
    const cachedJoinedIds = cachedHome
        ? buildJoinedIdsFromGroups(cachedJoined)
        : new Set(initialJoinedIds);
    const cachedSuggested =
        cachedHome?.suggested.map((group, index) =>
            formatGroupCard(group, cachedJoinedIds, index)
        ) ?? initialSuggestedGroups;

    const [joinedGroups, setJoinedGroups] = useState(cachedJoined);
    const [suggestedGroups, setSuggestedGroups] = useState(cachedSuggested);
    const [searchResults, setSearchResults] = useState<GroupCardData[]>([]);
    const [joinedIds, setJoinedIds] = useState<Set<number>>(() => new Set(cachedJoinedIds));

    const [searchKeyword, setSearchKeyword] = useState("");
    const debouncedSearchKeyword = useDebouncedValue(searchKeyword, SEARCH_DEBOUNCE_MS);
    const [hobbyFilter, setHobbyFilter] = useState(ALL_FILTER);
    const [levelFilter, setLevelFilter] = useState(ALL_FILTER);
    const [hobbyTagOptions, setHobbyTagOptions] = useState(
        cachedHome?.filterOptions?.hobbyTags ?? initialHobbyTagOptions
    );

    const [isBootstrapping, setIsBootstrapping] = useState(
        !cachedHome && initialSuggestedGroups.length === 0 && initialJoinedGroups.length === 0
    );
    const [bootstrapError, setBootstrapError] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [joiningId, setJoiningId] = useState<number | null>(null);
    const searchRequestIdRef = useRef(0);

    const hasSearchFilter = normalizeSearchQuery(debouncedSearchKeyword) !== undefined;
    const isFiltering =
        hasSearchFilter || hobbyFilter !== ALL_FILTER || levelFilter !== ALL_FILTER;

    const hasPendingSearch =
        searchKeyword.trim().length > 0 &&
        normalizeSearchQuery(searchKeyword) === undefined;

    useEffect(() => {
        if (cachedHome) return;

        let cancelled = false;

        void (async () => {
            const result = await fetchCommunityHomeClient();
            if (cancelled) return;

            if (!result.success) {
                setBootstrapError(result.message);
                setIsBootstrapping(false);
                return;
            }

            const joined = result.data.myGroups.map(formatJoinedGroup);
            const joinedIdSet = buildJoinedIdsFromGroups(joined);

            setJoinedGroups(joined);
            setSuggestedGroups(
                result.data.suggested.map((group, index) =>
                    formatGroupCard(group, joinedIdSet, index)
                )
            );
            setJoinedIds(joinedIdSet);
            setHobbyTagOptions(result.data.filterOptions?.hobbyTags ?? []);
            setBootstrapError(null);
            setIsBootstrapping(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [cachedHome]);

    useEffect(() => {
        if (!isFiltering) {
            setSearchResults([]);
            return;
        }

        const requestId = ++searchRequestIdRef.current;
        setIsSearching(true);

        void (async () => {
            const result = await searchGroupsAction({
                search: normalizeSearchQuery(debouncedSearchKeyword),
                hobbyTag: hobbyFilter !== ALL_FILTER ? hobbyFilter : undefined,
                languageTag: levelFilter !== ALL_FILTER ? levelFilter : undefined,
            });

            if (requestId !== searchRequestIdRef.current) return;

            if (result.success && Array.isArray(result.data)) {
                setSearchResults(
                    result.data.map((group: ApiGroup, index: number) =>
                        formatGroupCard(group, joinedIds, index)
                    )
                );
            } else {
                setSearchResults([]);
            }

            setIsSearching(false);
        })();
    }, [debouncedSearchKeyword, hobbyFilter, levelFilter, isFiltering, joinedIds]);

    const displayedGroups = isFiltering ? searchResults : suggestedGroups;
    const isListLoading = isBootstrapping || (isFiltering && isSearching);

    const resetFilters = useCallback(() => {
        setSearchKeyword("");
        setHobbyFilter(ALL_FILTER);
        setLevelFilter(ALL_FILTER);
    }, []);

    const handleJoin = useCallback(async (groupId: number) => {
        setJoiningId(groupId);

        const result = await joinGroupAction(groupId);

        if (result.success) {
            invalidateSessionCache(COMMUNITY_HOME_CACHE_KEY);

            const refresh = await fetchCommunityHomeClient({ force: true });

            if (refresh.success) {
                const joined = refresh.data.myGroups.map(formatJoinedGroup);
                const joinedIdSet = buildJoinedIdsFromGroups(joined);

                setJoinedGroups(joined);
                setSuggestedGroups(
                    refresh.data.suggested.map((group, index) =>
                        formatGroupCard(group, joinedIdSet, index)
                    )
                );
                setJoinedIds(joinedIdSet);
                setHobbyTagOptions(refresh.data.filterOptions?.hobbyTags ?? []);
            }
        }

        setJoiningId(null);
    }, []);

    return (
        <div
            className="flex h-screen w-full overflow-hidden bg-[#F3EFE4]"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Manrope', 'Noto Sans JP', sans-serif" }}
        >
            <Sidebar />

            <div className="relative flex flex-1 flex-col overflow-hidden">
                <TopNav
                    showSearch
                    searchPlaceholder={`グループを検索…（${MIN_SEARCH_LENGTH}文字以上）`}
                    searchValue={searchKeyword}
                    onSearch={setSearchKeyword}
                    searchClassName="w-[min(42vw,520px)]"
                >
                    <div className="hidden min-w-0 flex-wrap items-center gap-3 xl:flex">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black tracking-wider text-[#005B5B] uppercase">
                                興味:
                            </span>
                            <FilterDropdown
                                value={hobbyFilter}
                                options={hobbyTagOptions}
                                customPlaceholder="興味を入力"
                                onChange={setHobbyFilter}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black tracking-wider text-[#005B5B] uppercase">
                                レベル:
                            </span>
                            <FilterDropdown
                                value={levelFilter}
                                options={GROUP_LANGUAGE_LEVEL_OPTIONS}
                                customPlaceholder="レベルを入力"
                                onChange={setLevelFilter}
                            />
                        </div>

                        {isFiltering && (
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="flex h-[52px] shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-[#B86B4B]/25 bg-[#F8E0D5] px-4 text-[13px] font-bold text-[#923118] shadow-[0_8px_18px_rgba(79,55,30,0.04)] transition-all duration-300 hover:bg-[#F3D0C0] active:scale-95"
                            >
                                クリア
                            </button>
                        )}
                    </div>
                </TopNav>

                <main className="hide-scrollbar flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(231,111,81,0.10),transparent_32%),linear-gradient(180deg,#F8F4EA_0%,#F3EFE4_45%,#EEF5F2_100%)] p-8 lg:p-12">
                    <div className="mx-auto flex max-w-[1280px] flex-col gap-8">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div className="flex flex-col gap-1.5">
                                <h2 className="text-[30px] leading-[38px] font-extrabold tracking-[-0.8px] text-[#005B5B]">
                                    コミュニティ
                                </h2>
                                <p className="text-[14px] font-medium text-[#6E7979]">
                                    興味や学習目標に合うグループで、自然に交流を始めましょう。
                                </p>
                            </div>

                            <Link
                                href="/events"
                                className="group flex h-[46px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#004F4F] via-[#006A6A] to-[#8B5E34] px-6 text-[13px] font-bold text-white shadow-[0_12px_24px_rgba(0,91,91,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:from-[#003F3F] hover:via-[#005B5B] hover:to-[#764C29] hover:shadow-[0_18px_34px_rgba(0,91,91,0.28)] active:scale-[0.98]"
                            >
                                <span>イベントを見る</span>
                                <svg
                                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 14 14"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-hidden
                                >
                                    <path
                                        d="M10.1458 7.5H0V5.83333H10.1458L5.475 1.16667L6.66667 0L13.3333 6.66667L6.66667 13.3333L5.475 12.1667L10.1458 7.5Z"
                                        fill="white"
                                    />
                                </svg>
                            </Link>
                        </div>

                        {bootstrapError && (
                            <div className="w-full rounded-xl border border-[#923118]/15 bg-[#FFDAD6]/50 py-3.5 text-center text-[14px] font-bold text-[#923118] animate-fade-in">
                                {bootstrapError}
                            </div>
                        )}

                        <section className="flex w-full flex-col gap-5">
                            <div className="flex items-center gap-4">
                                <h3 className="text-[12px] leading-none font-extrabold tracking-[2px] whitespace-nowrap text-[#8B5E34] uppercase select-none">
                                    参加中のグループ
                                </h3>
                                <div className="h-px flex-1 bg-[#D9C7A5]/60" />
                            </div>

                            <div className="scrollbar-hide -mt-3 flex w-full gap-4 overflow-x-auto px-0.5 pt-3 pb-4 select-none">
                                {joinedGroups.length > 0 ? (
                                    joinedGroups.map((group) => (
                                        <Link
                                            key={group.id}
                                            href={`/community/${group.id}`}
                                            className="block shrink-0"
                                        >
                                                <div className="group relative flex h-[118px] w-[300px] cursor-pointer items-center gap-4 overflow-hidden rounded-[26px] border border-[#D9C7A5]/70 bg-[#FFFDF7] px-4 py-4 shadow-[0_14px_32px_rgba(79,55,30,0.08)] ring-1 ring-white/70 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[#005B5B]/45 hover:bg-white hover:shadow-[0_22px_44px_rgba(0,91,91,0.12)] active:scale-[0.98]">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#8B5E34] via-[#E76F51] to-[#005B5B]" />

                                                <div className="relative h-[78px] w-[78px] shrink-0 overflow-hidden rounded-2xl border-[3px] border-[#F6EAD5] bg-[#EFE3D0] shadow-[0_10px_22px_rgba(79,55,30,0.16)]">
                                                    <Image
                                                        src={group.img}
                                                        alt={group.name}
                                                        fill
                                                        sizes="78px"
                                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                </div>

                                                <div className="flex min-w-0 flex-col gap-1">
                                                    <h4 className="truncate text-[15px] leading-5 font-extrabold text-[#181D1B] transition-colors group-hover:text-[#005B5B]">
                                                        {group.name}
                                                    </h4>
                                                    <p className="mt-1 text-[11px] leading-none font-bold tracking-wider text-[#A99B87] uppercase">
                                                        {group.members}
                                                    </p>
                                                    <span className="mt-2 w-fit rounded-full border border-[#005B5B]/20 bg-[#DDEDEA] px-2.5 py-1 text-[9px] font-bold text-[#005B5B]">
                                                        参加中
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="w-full rounded-[26px] border border-dashed border-[#D9C7A5]/80 bg-[#FFFDF7]/80 px-6 py-6 text-[13px] font-medium text-[#6E7979] shadow-[0_12px_28px_rgba(79,55,30,0.06)]">
                                        まだ参加しているグループはありません。おすすめのグループから探してみましょう。
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="relative z-40 flex w-full flex-col gap-3 rounded-[28px] border border-[#D9C7A5]/70 bg-[#FFFDF7]/95 p-5 shadow-[0_18px_45px_rgba(79,55,30,0.10)] backdrop-blur-sm xl:hidden">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-black tracking-wider text-[#005B5B] uppercase">
                                        興味:
                                    </span>
                                    <FilterDropdown
                                        value={hobbyFilter}
                                        options={hobbyTagOptions}
                                        customPlaceholder="興味を入力"
                                        onChange={setHobbyFilter}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-black tracking-wider text-[#005B5B] uppercase">
                                        レベル:
                                    </span>
                                    <FilterDropdown
                                        value={levelFilter}
                                        options={GROUP_LANGUAGE_LEVEL_OPTIONS}
                                        customPlaceholder="レベルを入力"
                                        onChange={setLevelFilter}
                                    />
                                </div>

                                {isFiltering && (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="flex h-[52px] shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-[#B86B4B]/25 bg-[#F8E0D5] px-4 text-[13px] font-bold text-[#923118] shadow-[0_8px_18px_rgba(79,55,30,0.04)] transition-all duration-300 hover:bg-[#F3D0C0] active:scale-95"
                                    >
                                        クリア
                                    </button>
                                )}
                            </div>
                        </section>

                        {hasPendingSearch && (
                            <p className="-mt-4 text-[12px] font-semibold text-[#8B5E34]">
                                検索するには{MIN_SEARCH_LENGTH}文字以上入力してください。
                            </p>
                        )}

                        <section className="flex w-full flex-col gap-6">
                            <div className="flex items-center gap-4">
                                <h3 className="text-[12px] leading-none font-extrabold tracking-[2px] whitespace-nowrap text-[#8B5E34] uppercase select-none">
                                    {isFiltering ? "検索結果" : "おすすめのグループ"}
                                </h3>
                                <div className="h-px flex-1 bg-[#D9C7A5]/60" />
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                                {isListLoading ? (
                                    [1, 2, 3].map((item) => (
                                        <div
                                            key={item}
                                            className="h-[400px] animate-pulse rounded-[28px] border border-[#D9C7A5]/60 bg-[#FFFDF7] shadow-[0_14px_32px_rgba(79,55,30,0.08)]"
                                        />
                                    ))
                                ) : displayedGroups.length > 0 ? (
                                    displayedGroups.map((group) => (
                                        <GroupRecommendCard
                                            key={group.id}
                                            group={group}
                                            onJoin={handleJoin}
                                            isJoining={joiningId === group.id}
                                        />
                                    ))
                                ) : (
                                    <div className="col-span-full rounded-[28px] border border-dashed border-[#D9C7A5]/80 bg-[#FFFDF7] py-16 text-center text-[14px] font-medium text-[#6E7979] shadow-[0_16px_40px_rgba(79,55,30,0.08)]">
                                        {isFiltering
                                            ? "条件に一致するグループが見つかりませんでした。"
                                            : "おすすめのグループが見つかりませんでした。"}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}
