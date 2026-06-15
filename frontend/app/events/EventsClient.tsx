"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "@/components/layouts/Sidebar";
import TopNav from "@/components/layouts/TopNav";
import EventCard, { type EventCardData } from "@/components/events/EventCard";
import { engageEventAction } from "@/app/actions/event";
import { formatApiEvent } from "@/lib/events-format";
import { MIN_SEARCH_LENGTH, normalizeSearchQuery, SEARCH_DEBOUNCE_MS } from "@/lib/search";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useAuth } from "@/lib/auth-context";
import {
    fetchEventsListClient,
    readEventsCache,
    type EventFormat,
} from "@/lib/events-client";

const CreateEventModal = dynamic(() => import("@/components/events/CreateEventModal"), {
    ssr: false,
});

type TabFilter = "all" | "offline" | "online";

const TAB_OPTIONS: { id: TabFilter; label: string }[] = [
    { id: "all", label: "全て" },
    { id: "offline", label: "対面のみ" },
    { id: "online", label: "オンラインのみ" },
];

type EventsClientProps = {
    initialEvents?: EventCardData[];
    initialHasMore?: boolean;
    initialError?: string | null;
    currentUserId?: number;
    isAuthenticated?: boolean;
};

export default function EventsClient({
    initialEvents = [],
    initialHasMore = false,
    initialError = null,
}: EventsClientProps = {}) {
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get("search") ?? "";
    const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
    const currentUserId = user?.id;

    const [events, setEvents] = useState<EventCardData[]>(initialEvents);
    const [activeTab, setActiveTab] = useState<TabFilter>("all");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [isBootstrapping, setIsBootstrapping] = useState(!initialError);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [joiningId, setJoiningId] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
    const [joinError, setJoinError] = useState<string | null>(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createSuccess, setCreateSuccess] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const debouncedSearchQuery = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);

    const prevFiltersRef = useRef<string | null>(null);
    const fetchRequestIdRef = useRef(0);
    const hasEventsRef = useRef(events.length > 0);
    hasEventsRef.current = events.length > 0;

    const loadEvents = useCallback(
        async (pageNum: number, tab: TabFilter, search: string, append = false) => {
            const requestId = ++fetchRequestIdRef.current;
            const format: EventFormat = tab === "all" ? "all" : tab;

            if (append) {
                setIsLoadingMore(true);
            } else if (hasEventsRef.current) {
                setIsRefreshing(true);
                setErrorMessage(null);
            } else {
                setIsLoading(true);
                setErrorMessage(null);
            }

            const result = await fetchEventsListClient({
                page: pageNum,
                format,
                search: normalizeSearchQuery(search),
            });

            if (requestId !== fetchRequestIdRef.current) return;

            if (result.success) {
                const formatted = result.data.data.map((event) =>
                    formatApiEvent(event, currentUserId)
                );

                setEvents((prev) => (append ? [...prev, ...formatted] : formatted));
                setHasMore(result.data.hasMore);

                if (pageNum === 1) {
                    setPage(1);
                }
            } else if (pageNum === 1) {
                setEvents([]);
                setHasMore(false);
                setErrorMessage(result.message ?? "イベントの取得に失敗しました。");
            }

            setIsLoading(false);
            setIsRefreshing(false);

            if (pageNum === 1) {
                setIsBootstrapping(false);
            } else {
                setIsLoadingMore(false);
            }
        },
        [currentUserId]
    );

    useEffect(() => {
        if (isAuthLoading) return;

        if (!isAuthenticated || !currentUserId) {
            setEvents([]);
            setErrorMessage("ログインしてください。");
            setIsBootstrapping(false);
            return;
        }

        const cached = initialSearch ? null : readEventsCache("all", 1);

        if (cached) {
            setEvents(cached.data.map((event) => formatApiEvent(event, currentUserId)));
            setHasMore(cached.hasMore);
            setIsBootstrapping(false);
            return;
        }

        void loadEvents(1, "all", initialSearch);
    }, [isAuthLoading, isAuthenticated, currentUserId, loadEvents, initialSearch]);

    const filterKey = JSON.stringify({ activeTab, debouncedSearchQuery });

    useEffect(() => {
        if (isAuthLoading || !isAuthenticated || isBootstrapping) return;

        if (prevFiltersRef.current === null) {
            prevFiltersRef.current = filterKey;
            return;
        }

        if (prevFiltersRef.current === filterKey) return;

        prevFiltersRef.current = filterKey;
        setPage(1);
        void loadEvents(1, activeTab, debouncedSearchQuery);
    }, [
        filterKey,
        isAuthLoading,
        isAuthenticated,
        isBootstrapping,
        activeTab,
        debouncedSearchQuery,
        loadEvents,
    ]);

    const hasPendingSearch =
        searchQuery.trim().length > 0 && normalizeSearchQuery(searchQuery) === undefined;

    const handleJoin = useCallback(async (eventId: number) => {
        setJoiningId(eventId);
        setJoinError(null);

        const result = await engageEventAction(eventId);

        if (result.success) {
            setEvents((prev) =>
                prev.map((event) =>
                    event.id === eventId
                        ? {
                            ...event,
                            isJoined: true,
                            extraMemberCount:
                                event.extraMemberCount + (event.isJoined ? 0 : 1),
                        }
                        : event
                )
            );
        } else {
            setJoinError(result.message ?? "参加に失敗しました。");
        }

        setJoiningId(null);
    }, []);

    const handleTabChange = (tab: TabFilter) => {
        if (tab === activeTab) return;

        setPage(1);
        setActiveTab(tab);
    };

    const handleLoadMore = () => {
        if (!hasMore || isLoadingMore) return;

        const nextPage = page + 1;
        setPage(nextPage);
        void loadEvents(nextPage, activeTab, debouncedSearchQuery, true);
    };

    return (
        <div
            className="flex h-screen w-full overflow-hidden bg-[#F3EFE4]"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Manrope', 'Noto Sans JP', sans-serif" }}
        >
            <Sidebar />

            <div className="relative flex flex-1 flex-col overflow-hidden">
                <TopNav
                    title="イベント一覧"
                    backLink="/community"
                    showSearch
                    searchPlaceholder="イベントを検索..."
                    searchValue={searchQuery}
                    onSearch={setSearchQuery}
                />

                <main className="hide-scrollbar flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(231,111,81,0.10),transparent_32%),linear-gradient(180deg,#F8F4EA_0%,#F3EFE4_45%,#EEF5F2_100%)] p-8 lg:p-12">
                    <div className="mx-auto flex max-w-[1280px] flex-col gap-8">
                        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div className="flex flex-col gap-1.5">
                                <h1 className="text-[30px] leading-[38px] font-extrabold tracking-[-0.8px] text-[#005B5B]">
                                    コミュニティイベント
                                </h1>
                                <p className="text-[14px] font-medium text-[#6E7979]">
                                    言語と文化をつなぐ、特別な体験に参加しましょう。
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(true)}
                                className="group flex h-[46px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#004F4F] via-[#006A6A] to-[#8B5E34] px-6 text-[13px] font-bold text-white shadow-[0_12px_24px_rgba(0,91,91,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:from-[#003F3F] hover:via-[#005B5B] hover:to-[#764C29] hover:shadow-[0_18px_34px_rgba(0,91,91,0.28)] active:scale-[0.98]"
                            >
                                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
                                    <path d="M5.5 0V11M0 5.5H11" stroke="white" strokeWidth="2" />
                                </svg>
                                イベントを作成
                            </button>
                        </header>

                        <section className="relative z-30 flex w-full flex-wrap items-center gap-3 rounded-[28px] border border-[#D9C7A5]/70 bg-[#FFFDF7]/95 p-5 shadow-[0_18px_45px_rgba(79,55,30,0.10)] backdrop-blur-sm">
                            <span className="mr-1 text-[11px] font-black tracking-wider text-[#005B5B] uppercase">
                                表示:
                            </span>

                            {TAB_OPTIONS.map((tab) => {
                                const active = activeTab === tab.id;

                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => handleTabChange(tab.id)}
                                        className={`cursor-pointer rounded-xl px-4 py-2.5 text-[12px] font-bold transition-all active:scale-95 ${active
                                                ? "bg-[#005B5B] text-white shadow-[0_8px_18px_rgba(0,91,91,0.16)]"
                                                : "border border-[#D9C7A5]/70 bg-[#FFFDF7] text-[#3E4948] hover:border-[#005B5B]/30 hover:bg-white"
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}

                            <div className="ml-auto rounded-full border border-[#D9C7A5]/70 bg-[#FFFDF7] px-4 py-2 text-[12px] font-bold text-[#8B5E34] shadow-[0_8px_18px_rgba(79,55,30,0.04)]">
                                {hasPendingSearch
                                    ? `${MIN_SEARCH_LENGTH}文字以上で検索`
                                    : isLoading || isRefreshing
                                        ? "検索中..."
                                        : `${events.length}件表示中`}
                            </div>
                        </section>

                        {createSuccess && (
                            <div className="rounded-xl border border-[#005B5B]/20 bg-[#DDEDEA] px-4 py-3.5 text-[14px] font-semibold text-[#005B5B] animate-profile-action-scale-in">
                                {createSuccess}
                            </div>
                        )}

                        {errorMessage && (
                            <div className="rounded-xl border border-[#B86B4B]/25 bg-[#F8E0D5] px-4 py-3.5 text-[14px] font-semibold text-[#923118] animate-profile-action-scale-in">
                                <p>{errorMessage}</p>

                                {isAuthenticated === false && (
                                    <Link
                                        href="/login"
                                        className="mt-2 inline-block font-bold text-[#005B5B] underline"
                                    >
                                        ログインページへ
                                    </Link>
                                )}
                            </div>
                        )}

                        {joinError && (
                            <div className="rounded-xl border border-[#B86B4B]/25 bg-[#F8E0D5] px-4 py-3.5 text-[14px] font-semibold text-[#923118] animate-profile-action-scale-in">
                                {joinError}
                            </div>
                        )}

                        <section className="flex flex-col gap-6">
                            <div className="flex items-center gap-4">
                                <h3 className="text-[12px] leading-none font-extrabold tracking-[2px] whitespace-nowrap text-[#8B5E34] uppercase select-none">
                                    イベント一覧
                                </h3>
                                <div className="h-px flex-1 bg-[#D9C7A5]/60" />
                            </div>

                            {isBootstrapping || (isLoading && events.length === 0) ? (
                                <div className="grid grid-cols-1 gap-6">
                                    {[1, 2, 3].map((item) => (
                                        <div
                                            key={item}
                                            className="h-[400px] animate-pulse rounded-[28px] border border-[#D9C7A5]/60 bg-[#FFFDF7] shadow-[0_14px_32px_rgba(79,55,30,0.08)]"
                                        />
                                    ))}
                                </div>
                            ) : events.length > 0 ? (
                                <div
                                    className={`flex flex-col gap-8 transition-opacity duration-300 ${isRefreshing ? "pointer-events-none opacity-60" : ""
                                        }`}
                                >
                                    {events.map((event) => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            onJoin={handleJoin}
                                            isJoining={joiningId === event.id}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-[28px] border border-dashed border-[#D9C7A5]/80 bg-[#FFFDF7] px-6 py-16 text-center text-[14px] text-[#6E7979] shadow-[0_16px_40px_rgba(79,55,30,0.08)]">
                                    {errorMessage ? (
                                        "イベントを読み込めませんでした。"
                                    ) : (
                                        <>
                                            <p className="font-semibold">
                                                {hasPendingSearch
                                                    ? `${MIN_SEARCH_LENGTH}文字以上入力してください。`
                                                    : normalizeSearchQuery(searchQuery)
                                                        ? `「${normalizeSearchQuery(searchQuery)}」に一致するイベントはありません。`
                                                        : activeTab === "offline"
                                                            ? "対面のイベントはありません。"
                                                            : activeTab === "online"
                                                                ? "オンラインのイベントはありません。"
                                                                : "表示できるイベントがありません。"}
                                            </p>

                                            {activeTab === "all" &&
                                                !normalizeSearchQuery(searchQuery) &&
                                                !hasPendingSearch && (
                                                    <p className="mt-2 text-[13px] leading-5 text-[#A99B87]">
                                                        一覧には承認済み、かつ開催日が未来のイベントのみ表示されます。
                                                        作成直後は承認待ちのため、公開まで少しお待ちください。
                                                    </p>
                                                )}
                                        </>
                                    )}
                                </div>
                            )}
                        </section>

                        {!isBootstrapping && !isLoading && events.length > 0 && hasMore && (
                            <div className="flex justify-center pt-4 pb-12">
                                <button
                                    type="button"
                                    onClick={handleLoadMore}
                                    disabled={isLoadingMore}
                                    className="flex h-[56px] cursor-pointer items-center justify-center gap-3 rounded-2xl bg-[#923118] px-12 text-[13px] font-extrabold tracking-[2.5px] text-white uppercase shadow-[0_12px_24px_-6px_rgba(146,49,24,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-6px_rgba(146,49,24,0.45)] active:scale-95 disabled:cursor-wait disabled:opacity-80"
                                >
                                    {isLoadingMore ? (
                                        <>
                                            <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                            <span>読み込み中...</span>
                                        </>
                                    ) : (
                                        <span>もっとイベントを表示</span>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            <CreateEventModal
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onCreated={() => {
                    setCreateSuccess("イベントを作成しました。管理者の承認後に公開されます。");
                    setPage(1);
                    void loadEvents(1, activeTab, debouncedSearchQuery);
                }}
            />
        </div>
    );
}
