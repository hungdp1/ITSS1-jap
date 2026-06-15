"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
    const { refresh } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        setErrorMsg("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ email, password }),
            });

            const result = await response.json();
            console.log("Login client: received response:", result);

            if (!result.success) {
                console.warn("Login client: login failed:", result.message);
                setErrorMsg(result.message || "ログインに失敗しました。");
                return;
            }

            if (result.user.status === "VERIFIED") {
                console.log("Login client: user verified, calling refresh()...");
                try {
                    await refresh();
                    console.log("Login client: refresh completed successfully.");
                } catch (refreshErr) {
                    console.error("Login client: refresh threw an error:", refreshErr);
                }
                console.log("Login client: redirecting to /community...");
                window.location.assign("/community");
                return;
            }

            setErrorMsg("アカウントはまだ認証されていません。本人確認を完了してください。");
        } catch (error) {
            setErrorMsg(
                error instanceof Error
                    ? error.message
                    : "ログインに失敗しました。メールアドレスまたはパスワードが正しくありません。"
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="relative h-screen w-full overflow-hidden">
            <div className="fixed inset-0 z-0">
                <Image
                    src="/assets/images/home/hero-bg.png?v=5"
                    alt="背景"
                    fill
                    className="object-cover object-center"
                    priority
                />
                <div className="absolute inset-0 bg-[#002424]/75 backdrop-blur-[2px]" />
            </div>

            <div className="fixed top-5 left-6 z-20 md:top-8 md:left-8">
                <Link
                    href="/"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/15 shadow-md backdrop-blur-md transition-all hover:bg-white/25"
                    aria-label="トップページへ戻る"
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                    >
                        <path
                            d="M3.825 9L9.425 14.6L8 16L0 8L8 0L9.425 1.4L3.825 7H16V9H3.825Z"
                            fill="white"
                        />
                    </svg>
                </Link>
            </div>

            <div className="relative z-10 flex h-screen w-full justify-center overflow-y-auto px-4 py-10">
                <div className="my-auto flex w-full max-w-[480px] flex-col items-center">
                    <div className="mb-8 flex flex-col items-center">
                        <span
                            className="text-[38px] leading-10 font-black tracking-[-1.8px] text-white drop-shadow-lg"
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            Tomoio
                        </span>
                        <div className="mt-2 h-1.5 w-16 rounded-full bg-[#E76F51]" />
                        <span className="mt-3 text-[10.4px] leading-4 font-medium tracking-[3.12px] text-white/70">
                            文化交流の架け橋
                        </span>
                    </div>

                    <div className="flex w-full flex-col gap-8 rounded-3xl border border-white/20 bg-white/95 p-8 shadow-[0_25px_60px_rgba(0,0,0,0.3)] backdrop-blur-md sm:p-10">
                        <div className="flex flex-col items-center gap-2 text-center">
                            <h1 className="text-[26px] leading-9 font-medium tracking-[-0.75px] text-[#181D1B] sm:text-[30px]">
                                おかえりなさい
                            </h1>
                            <p className="text-[14px] leading-5 font-medium text-[#526160]">
                                アカウントにログインして文化交流を始めましょう
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="flex w-full flex-col gap-5">
                            {errorMsg && (
                                <div className="w-full rounded-xl border border-red-100 bg-red-50 p-3 text-center text-[14px] font-medium text-red-600">
                                    {errorMsg}
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                <label className="text-[11.2px] leading-4 font-medium tracking-[1.28px] text-[#526160]/80 uppercase">
                                    メールアドレス
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    required
                                    placeholder="example@tomoio.com"
                                    className="h-[52px] w-full rounded-xl border border-[#DFE3E1]/60 bg-[#F0F5F2]/80 px-5 text-[15px] font-medium text-[#181D1B] transition-all placeholder:text-[#6E7979]/40 focus:border-[#005B5B]/30 focus:bg-white focus:ring-2 focus:ring-[#005B5B]/30 focus:outline-none"
                                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex w-full items-center justify-between">
                                    <label className="text-[11.2px] leading-4 font-medium tracking-[1.28px] text-[#526160]/80 uppercase">
                                        パスワード
                                    </label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-[10.4px] font-medium text-[#E76F51] hover:underline"
                                    >
                                        パスワードを忘れた場合
                                    </Link>
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="h-[52px] w-full rounded-xl border border-[#DFE3E1]/60 bg-[#F0F5F2]/80 px-5 text-[15px] font-medium tracking-[4px] text-[#181D1B] transition-all placeholder:text-[#6E7979]/40 focus:border-[#005B5B]/30 focus:bg-white focus:ring-2 focus:ring-[#005B5B]/30 focus:outline-none"
                                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="mt-1 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#005B5B] text-[16px] font-semibold text-white shadow-[0_10px_25px_-4px_rgba(0,91,91,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#004A4A] active:scale-[0.98] disabled:cursor-wait disabled:opacity-75 disabled:hover:translate-y-0"
                            >
                                {isLoading ? (
                                    <svg
                                        className="h-5 w-5 animate-spin text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        aria-hidden
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                ) : (
                                    <>
                                        ログイン
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 14 14"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                            aria-hidden
                                        >
                                            <path
                                                d="M10.1458 7.5H0V5.83333H10.1458L5.47917 1.16667L6.66667 0L13.3333 6.66667L6.66667 13.3333L5.47917 12.1667L10.1458 7.5Z"
                                                fill="white"
                                            />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="relative flex w-full items-center justify-center">
                            <div className="absolute w-full border-t border-[#BEC9C8]/30" />
                            <div className="relative bg-white px-4 text-[12px] font-medium tracking-[1.2px] text-[#6E7979]/60">
                                または
                            </div>
                        </div>

                        <div className="-mt-2 flex w-full items-center justify-center gap-1.5">
                            <span className="text-[14px] font-medium text-[#526160]">
                                アカウントをお持ちでないですか？
                            </span>
                            <Link
                                href="/register"
                                className="text-[14px] font-semibold text-[#005B5B] hover:underline"
                            >
                                新規登録
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}