"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function ProfileIndexPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;
        if (user?.id) {
            router.replace(`/profile/${user.id}`);
            return;
        }
        router.replace("/login");
    }, [user, isLoading, router]);

    return (
        <div className="flex w-full min-h-screen bg-[#F6FAF8] flex-col items-center justify-center px-6 gap-4">
            <div className="h-10 w-10 border-2 border-[#005B5B] border-t-transparent rounded-full animate-spin" />
            <p className="text-[14px] text-[#526160]">プロフィールを読み込み中...</p>
            {!isLoading && !user?.id && (
                <Link
                    href="/login"
                    className="px-6 py-3 bg-[#005B5B] text-white rounded-xl text-[14px] font-medium"
                >
                    ログイン
                </Link>
            )}
        </div>
    );
}
