"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PURPOSE_OPTIONS = ["学習", "友達作り", "ビジネス", "文化交流"];
const OTHER_PURPOSE = "その他";

type Nationality = "日本" | "ベトナム";

export default function RegisterPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nationality, setNationality] = useState<Nationality | null>(null);
    const [purposes, setPurposes] = useState<string[]>([]);
    const [showCustomPurpose, setShowCustomPurpose] = useState(false);
    const [customPurpose, setCustomPurpose] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    const addPurpose = (purpose: string) => {
        const value = purpose.trim();
        if (!value) return;

        setPurposes((prev) => (prev.includes(value) ? prev : [...prev, value]));
    };

    const removePurpose = (purpose: string) => {
        setPurposes((prev) => prev.filter((item) => item !== purpose));
    };

    const togglePurpose = (purpose: string) => {
        setPurposes((prev) =>
            prev.includes(purpose)
                ? prev.filter((item) => item !== purpose)
                : [...prev, purpose]
        );
    };

    const applyCustomPurpose = () => {
        const value = customPurpose.trim();
        if (!value) {
            setError("利用目的を入力してください。");
            return;
        }

        addPurpose(value);
        setCustomPurpose("");
        setShowCustomPurpose(false);
        setError(null);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        if (selectedFile.size > 5 * 1024 * 1024) {
            setError("ファイルサイズは5MB以下にしてください。");
            event.target.value = "";
            return;
        }

        setFile(selectedFile);
        setFileName(selectedFile.name);
        setError(null);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);

        if (!email.trim() || !password.trim() || !nationality || purposes.length === 0) {
            setError("すべての項目を入力・選択してください。");
            return;
        }

        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append("email", email.trim());
            formData.append("password", password);
            formData.append("language", nationality);
            formData.append("purpose", purposes.join(", "));
            if (file) {
                formData.append("cccd", file);
            }

            const response = await fetch("/api/auth/register", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (!result.success) {
                setError(result.message || "登録に失敗しました。入力内容を確認してください。");
                return;
            }

            setShowSuccessToast(true);

            setTimeout(() => {
                router.push("/login");
            }, 1800);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "登録に失敗しました。しばらくしてからもう一度お試しください。"
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
                <div className="my-auto flex w-full max-w-[560px] flex-col items-center">
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

                    <div className="flex w-full flex-col gap-7 rounded-3xl border border-white/20 bg-white/95 p-7 shadow-[0_25px_60px_rgba(0,0,0,0.3)] backdrop-blur-md sm:p-9">
                        <div className="flex flex-col items-center gap-2 text-center">
                            <h1 className="text-[26px] leading-9 font-medium tracking-[-0.75px] text-[#181D1B] sm:text-[30px]">
                                アカウント作成
                            </h1>
                            <p className="text-[14px] leading-5 font-medium text-[#526160]">
                                Tomoioで言語と文化の交流を始めましょう
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
                            {error && (
                                <div className="w-full rounded-xl border border-red-100 bg-red-50 p-3 text-center text-[14px] font-medium text-red-600">
                                    {error}
                                </div>
                            )}

                            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="flex w-full flex-col gap-2">
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

                                <div className="flex w-full flex-col gap-2">
                                    <label className="text-[11.2px] leading-4 font-medium tracking-[1.28px] text-[#526160]/80 uppercase">
                                        パスワード
                                    </label>
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
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[11.2px] leading-4 font-medium tracking-[1.28px] text-[#526160]/80 uppercase">
                                    出身地
                                </label>
                                <div className="flex flex-wrap gap-2.5">
                                    {(["日本", "ベトナム"] as Nationality[]).map((item) => {
                                        const isActive = nationality === item;

                                        return (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() => setNationality(item)}
                                                className={`h-11 rounded-xl px-5 text-[14px] font-semibold transition-all active:scale-[0.98] ${isActive
                                                        ? "bg-[#005B5B] text-white shadow-[0_8px_18px_-6px_rgba(0,91,91,0.45)]"
                                                        : "border border-[#DFE3E1]/70 bg-[#F0F5F2]/80 text-[#526160] hover:border-[#005B5B]/25 hover:bg-white"
                                                    }`}
                                            >
                                                {item}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[11.2px] leading-4 font-medium tracking-[1.28px] text-[#526160]/80 uppercase">
                                    利用目的
                                </label>

                                <div className="flex flex-wrap gap-2.5">
                                    {PURPOSE_OPTIONS.map((purpose) => {
                                        const isActive = purposes.includes(purpose);

                                        return (
                                            <button
                                                key={purpose}
                                                type="button"
                                                onClick={() => togglePurpose(purpose)}
                                                className={`h-11 rounded-xl px-4 text-[14px] font-semibold transition-all active:scale-[0.98] ${isActive
                                                        ? "bg-[#005B5B] text-white shadow-[0_8px_18px_-6px_rgba(0,91,91,0.45)]"
                                                        : "border border-[#DFE3E1]/70 bg-[#F0F5F2]/80 text-[#526160] hover:border-[#005B5B]/25 hover:bg-white"
                                                    }`}
                                            >
                                                {purpose}
                                            </button>
                                        );
                                    })}

                                    <button
                                        type="button"
                                        onClick={() => setShowCustomPurpose((prev) => !prev)}
                                        className={`h-11 rounded-xl px-4 text-[14px] font-semibold transition-all active:scale-[0.98] ${showCustomPurpose
                                                ? "bg-[#E76F51] text-white shadow-[0_8px_18px_-6px_rgba(231,111,81,0.45)]"
                                                : "border border-[#DFE3E1]/70 bg-[#F0F5F2]/80 text-[#526160] hover:border-[#E76F51]/35 hover:bg-white"
                                            }`}
                                    >
                                        {OTHER_PURPOSE}
                                    </button>
                                </div>

                                {showCustomPurpose && (
                                    <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-[#DFE3E1]/70 bg-[#F0F5F2]/70 p-3 sm:flex-row">
                                        <input
                                            type="text"
                                            value={customPurpose}
                                            onChange={(event) => setCustomPurpose(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter") {
                                                    event.preventDefault();
                                                    applyCustomPurpose();
                                                }
                                            }}
                                            placeholder="利用目的を入力してください"
                                            className="h-11 flex-1 rounded-xl border border-[#DFE3E1]/70 bg-white px-4 text-[14px] font-medium text-[#181D1B] outline-none transition-all placeholder:text-[#6E7979]/40 focus:border-[#005B5B]/40 focus:ring-2 focus:ring-[#005B5B]/20"
                                        />
                                        <button
                                            type="button"
                                            onClick={applyCustomPurpose}
                                            className="h-11 rounded-xl bg-[#005B5B] px-5 text-[14px] font-semibold text-white transition-all hover:bg-[#004A4A] active:scale-[0.98]"
                                        >
                                            追加
                                        </button>
                                    </div>
                                )}

                                {purposes.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {purposes.map((purpose) => (
                                            <span
                                                key={purpose}
                                                className="inline-flex items-center gap-1.5 rounded-full border border-[#005B5B]/15 bg-[#005B5B]/8 px-3 py-1 text-[12px] font-semibold text-[#005B5B]"
                                            >
                                                {purpose}
                                                <button
                                                    type="button"
                                                    onClick={() => removePurpose(purpose)}
                                                    className="text-[#005B5B]/70 hover:text-[#005B5B]"
                                                    aria-label={`${purpose}を削除`}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[11.2px] leading-4 font-medium tracking-[1.28px] text-[#526160]/80 uppercase">
                                    プロフィール写真
                                </label>

                                <div className="group relative flex min-h-[132px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#BEC9C8]/80 bg-[#F0F5F2]/80 px-4 py-5 transition-all hover:border-[#005B5B]/40 hover:bg-white">
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        accept="image/jpeg,image/png,image/webp"
                                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                                        aria-label="プロフィール写真をアップロード"
                                    />

                                    {fileName ? (
                                        <>
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#005B5B]/10">
                                                <svg
                                                    width="18"
                                                    height="18"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    aria-hidden
                                                >
                                                    <path
                                                        d="M20 6L9 17L4 12"
                                                        stroke="#005B5B"
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </div>
                                            <div className="flex w-full flex-col items-center gap-1">
                                                <span className="max-w-full truncate px-4 text-center text-[14px] font-semibold text-[#005B5B]">
                                                    {fileName}
                                                </span>
                                                <span className="text-[12px] text-[#6E7979]">
                                                    ファイルを変更する場合はもう一度選択してください
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-transform group-hover:scale-105">
                                                <svg
                                                    width="22"
                                                    height="22"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    aria-hidden
                                                >
                                                    <path
                                                        d="M12 16V4M12 4L7 9M12 4L17 9"
                                                        stroke="#005B5B"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                    <path
                                                        d="M5 16V18C5 19.1046 5.89543 20 7 20H17C18.1046 20 19 19.1046 19 18V16"
                                                        stroke="#005B5B"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                            </div>
                                            <div className="flex flex-col items-center gap-1 text-center">
                                                <span className="text-[14px] font-semibold text-[#181D1B]">
                                                    プロフィール写真をアップロード（任意）
                                                </span>
                                                <span className="text-[12px] font-medium text-[#6E7979]">
                                                    JPEG, PNG, WEBP / 最大5MB
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="mt-1 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#005B5B] text-[16px] font-semibold text-white shadow-[0_10px_25px_-4px_rgba(0,91,91,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#004A4A] active:scale-[0.98] disabled:cursor-wait disabled:opacity-75 disabled:hover:translate-y-0"
                            >
                                {isLoading ? "登録中..." : "アカウントを作成"}
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
                                すでにアカウントをお持ちですか？
                            </span>
                            <Link
                                href="/login"
                                className="text-[14px] font-semibold text-[#005B5B] hover:underline"
                            >
                                ログイン
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {showSuccessToast && (
                <div className="fixed right-6 bottom-6 z-50 flex items-center gap-3 rounded-2xl border border-white/20 border-l-4 border-l-[#005B5B] bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.18)]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#005B5B]/10">
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden
                        >
                            <path
                                d="M20 6L9 17L4 12"
                                stroke="#005B5B"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-[#181D1B]">
                            登録が完了しました
                        </span>
                        <span className="text-[13px] text-[#6E7979]">
                            すぐにログインできます。ログインページへ移動しています...
                        </span>
                    </div>
                </div>
            )}
        </main>
    );
}
