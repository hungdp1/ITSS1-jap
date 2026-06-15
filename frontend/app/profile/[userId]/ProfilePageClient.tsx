"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProfileView from "@/components/profile/ProfileView";
import type { UserProfile } from "@/app/actions/profile";
import { fetchProfileClient, readProfileCache } from "@/lib/profile-client";
import Sidebar from "@/components/layouts/Sidebar";
import TopNav from "@/components/layouts/TopNav";
import { useAuth } from "@/lib/auth-context";

export default function ProfilePageClient({ userId }: { userId: string }) {
    const { user } = useAuth();
    const cached = readProfileCache(userId);

    const [profile, setProfile] = useState<UserProfile | null>(cached);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(!cached);

    useEffect(() => {
        if (cached) return;

        let cancelled = false;

        void (async () => {
            const result = await fetchProfileClient(userId);
            if (cancelled) return;

            if (!result.success) {
                setError(result.message);
                setIsLoading(false);
                return;
            }

            setProfile(result.data);
            setError(null);
            setIsLoading(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [cached, userId]);

    if (isLoading) {
        return (
            <div
                className="flex h-screen w-full overflow-hidden bg-[#F3EFE4]"
                style={{
                    fontFamily: "'Plus Jakarta Sans', 'Manrope', 'Noto Sans JP', sans-serif",
                }}
            >
                <Sidebar />

                <div className="relative flex flex-1 flex-col overflow-hidden">
                    <TopNav backLink={Number(userId) === user?.id ? undefined : "/matching"} />

                    <main className="hide-scrollbar flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(231,111,81,0.10),transparent_32%),linear-gradient(180deg,#F8F4EA_0%,#F3EFE4_45%,#EEF5F2_100%)] p-8 lg:p-12">
                        <div className="mx-auto flex max-w-[1280px] flex-col gap-8 animate-pulse">
                            <div className="flex flex-col gap-3">
                                <div className="h-9 w-48 rounded-2xl bg-[#D9C7A5]/50" />
                                <div className="h-5 w-80 rounded-xl bg-[#D9C7A5]/35" />
                            </div>

                            <div className="flex flex-col gap-8 lg:flex-row">
                                <div className="h-[620px] w-full rounded-[32px] border border-[#D9C7A5]/60 bg-[#FFFDF7] shadow-[0_14px_32px_rgba(79,55,30,0.08)] lg:w-[340px]" />
                                <div className="h-[620px] flex-1 rounded-[32px] border border-[#D9C7A5]/60 bg-[#FFFDF7] shadow-[0_14px_32px_rgba(79,55,30,0.08)]" />
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div
                className="flex h-screen w-full overflow-hidden bg-[#F3EFE4]"
                style={{
                    fontFamily: "'Plus Jakarta Sans', 'Manrope', 'Noto Sans JP', sans-serif",
                }}
            >
                <Sidebar />

                <div className="relative flex flex-1 flex-col overflow-hidden">
                    <TopNav backLink="/matching" />

                    <main className="hide-scrollbar flex flex-1 items-center justify-center overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(231,111,81,0.10),transparent_32%),linear-gradient(180deg,#F8F4EA_0%,#F3EFE4_45%,#EEF5F2_100%)] p-8">
                        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-[28px] border border-[#D9C7A5]/70 bg-[#FFFDF7] p-8 text-center shadow-[0_16px_40px_rgba(79,55,30,0.10)]">
                            <p className="text-[16px] font-bold text-[#923118]">
                                {error ?? "プロフィールの取得に失敗しました。"}
                            </p>

                            <Link
                                href="/matching"
                                className="mt-2 rounded-2xl bg-gradient-to-r from-[#004F4F] via-[#006A6A] to-[#8B5E34] px-6 py-3 text-[14px] font-bold text-white shadow-[0_12px_24px_rgba(0,91,91,0.18)] transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                            >
                                マッチングに戻る
                            </Link>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return <ProfileView profile={profile} />;
}