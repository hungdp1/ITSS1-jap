"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { createEventAction, type CreateEventPayload } from "@/app/actions/event";

type EventFormat = "offline" | "online";

type CategoryOption = {
    label: string;
    icon: "culture" | "language" | "exchange" | "workshop";
};

const CATEGORY_OPTIONS: CategoryOption[] = [
    { label: "文化", icon: "culture" },
    { label: "言語", icon: "language" },
    { label: "交流", icon: "exchange" },
    { label: "ワークショップ", icon: "workshop" },
];

type CreateEventModalProps = {
    open: boolean;
    onClose: () => void;
    onCreated?: () => void;
};

function buildDescription(category: string, title: string, location: string) {
    const prefix = `【${category.trim()}】`;
    const body = location.trim() || title.trim();

    return `${prefix} ${body}`.trim();
}

function FieldLabel({ children }: { children: ReactNode }) {
    return (
        <span className="text-[12px] leading-4 font-black tracking-[1.2px] text-[#8B5E34] uppercase">
            {children}
        </span>
    );
}

function SectionTitle({ number, title }: { number: string; title: string }) {
    return (
        <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#005B5B]/20 bg-[#DDEDEA] text-[13px] font-black text-[#005B5B]">
                {number}
            </span>
            <h3 className="text-[18px] leading-7 font-extrabold text-[#005B5B]">{title}</h3>
        </div>
    );
}

function CategoryIcon({ name }: { name: CategoryOption["icon"] }) {
    const common = "stroke-current";

    return (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/20 bg-transparent text-current/80">
            {name === "culture" && (
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
                    <path className={common} d="M7.5 1.5V13.5M3.2 3.8C5.9 3.8 7.5 5.4 7.5 7.5C7.5 5.4 9.1 3.8 11.8 3.8M2.4 9.6C5.1 9.6 6.9 8.8 7.5 7.5C8.1 8.8 9.9 9.6 12.6 9.6" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
            {name === "language" && (
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
                    <path className={common} d="M2.2 3.2H8.1V7.8H5.5L2.2 10.1V3.2ZM7 7.8V11.5H9.6L12.8 13.4V6.3H8.1" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
            {name === "exchange" && (
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
                    <path className={common} d="M2 5.2H11.8M9.5 2.9L11.8 5.2L9.5 7.5M13 9.8H3.2M5.5 7.5L3.2 9.8L5.5 12.1" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
            {name === "workshop" && (
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
                    <path className={common} d="M5.2 2.2L7.5 4.5L4.1 7.9L1.8 5.6L5.2 2.2ZM8.3 8.2L12.8 12.7M10.4 4.1L12.2 2.3L13.1 3.2L11.3 5M9.5 5.9L5.3 10.1" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
        </span>
    );
}

export default function CreateEventModal({ open, onClose, onCreated }: CreateEventModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("言語");
    const [customCategory, setCustomCategory] = useState("");
    const [format, setFormat] = useState<EventFormat>("offline");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [location, setLocation] = useState("");
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetForm = () => {
        setTitle("");
        setCategory("言語");
        setCustomCategory("");
        setFormat("offline");
        setDate("");
        setTime("");
        setLocation("");
        setCoverPreview(null);
        setError(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    useEffect(() => {
        if (!open) return;
        resetForm();
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !saving) {
                onClose();
            }
        };

        window.addEventListener("keydown", onKey);

        return () => window.removeEventListener("keydown", onKey);
    }, [open, saving, onClose]);

    useEffect(() => {
        return () => {
            if (coverPreview) {
                URL.revokeObjectURL(coverPreview);
            }
        };
    }, [coverPreview]);

    const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setError("画像ファイルを選択してください。");
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError("画像サイズは5MB以下にしてください。");
            event.target.value = "";
            return;
        }

        if (coverPreview) {
            URL.revokeObjectURL(coverPreview);
        }

        setCoverPreview(URL.createObjectURL(file));
        setError(null);
    };

    const handleApplyCustomCategory = () => {
        const trimmed = customCategory.trim();

        if (!trimmed) {
            setError("カテゴリー名を入力してください。");
            return;
        }

        setCategory(trimmed);
        setCustomCategory("");
        setError(null);
    };

    const handlePublish = async () => {
        setError(null);

        const trimmedTitle = title.trim();
        const trimmedLocation = location.trim();
        const trimmedCategory = category.trim();

        if (!trimmedCategory) {
            setError("カテゴリーを選択、または入力してください。");
            return;
        }

        if (trimmedTitle.length < 5 || trimmedTitle.length > 50) {
            setError("イベント名は5〜50文字で入力してください。");
            return;
        }

        if (!date || !time) {
            setError("日付と開始時間を入力してください。");
            return;
        }

        if (!trimmedLocation) {
            setError(
                format === "online"
                    ? "オンライン会議のURLを入力してください。"
                    : "開催場所を入力してください。"
            );
            return;
        }

        const eventTime = new Date(`${date}T${time}`);

        if (Number.isNaN(eventTime.getTime())) {
            setError("日付または時間が正しくありません。");
            return;
        }

        if (eventTime <= new Date()) {
            setError("過去の日時は指定できません。");
            return;
        }

        const description = buildDescription(trimmedCategory, trimmedTitle, trimmedLocation);

        if (description.length < 10) {
            setError("場所・URLの内容をもう少し詳しく入力してください。");
            return;
        }

        if (format === "online") {
            try {
                new URL(trimmedLocation);
            } catch {
                setError("有効なURLを入力してください。");
                return;
            }
        }

        const payload: CreateEventPayload = {
            title: trimmedTitle,
            description,
            eventTime: eventTime.toISOString(),
            format,
            ...(format === "offline"
                ? { address: trimmedLocation }
                : { urlLink: trimmedLocation }),
        };

        setSaving(true);

        const result = await createEventAction(payload);

        setSaving(false);

        if (!result.success) {
            setError(result.message ?? "イベントの作成に失敗しました。");
            return;
        }

        onCreated?.();
        onClose();
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-event-title"
        >
            <button
                type="button"
                className="absolute inset-0 bg-[#181D1B]/45 backdrop-blur-sm"
                onClick={saving ? undefined : onClose}
                aria-label="閉じる"
            />

            <div
                className="relative flex max-h-[min(90vh,973px)] w-full max-w-[920px] flex-col overflow-hidden rounded-[32px] border border-[#D9C7A5]/70 bg-[#FFFDF7] shadow-[0_24px_60px_rgba(0,0,0,0.24)]"
                style={{
                    fontFamily: "'Plus Jakarta Sans', 'Manrope', 'Noto Sans JP', sans-serif",
                }}
            >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#8B5E34] via-[#E76F51] to-[#005B5B]" />

                <div className="flex shrink-0 items-center justify-between border-b border-[#D9C7A5]/60 bg-[#FFFDF7] px-6 py-5 sm:px-8">
                    <div>
                        <h2
                            id="create-event-title"
                            className="text-[22px] font-extrabold tracking-[-0.4px] text-[#005B5B]"
                        >
                            新しいイベントを作成
                        </h2>
                        <p className="mt-1 text-[12px] font-medium text-[#6E7979]">
                            交流イベントの内容を入力してください。作成後、承認されると公開されます。
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D9C7A5]/70 bg-[#FFFDF7] text-[#8B5E34] transition-all hover:bg-[#F8EEDB] disabled:opacity-50"
                        aria-label="閉じる"
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                            <path
                                d="M1 1L13 13M13 1L1 13"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(231,111,81,0.08),transparent_30%),linear-gradient(180deg,#FFFDF7_0%,#F8F4EA_45%,#F3EFE4_100%)] px-4 py-6 sm:px-8">
                    {error && (
                        <div className="mb-6 rounded-2xl border border-[#B86B4B]/25 bg-[#F8E0D5] px-4 py-3 text-[14px] font-bold text-[#923118]">
                            {error}
                        </div>
                    )}

                    <div className="grid gap-6 md:grid-cols-2">
                        <section className="flex flex-col gap-6 rounded-[28px] border border-[#D9C7A5]/70 bg-[#FFFDF7] p-6 shadow-[0_14px_32px_rgba(79,55,30,0.08)]">
                            <SectionTitle number="1" title="ビジュアルとタイトル" />

                            <div className="flex flex-col gap-4">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={handleCoverChange}
                                />

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="group relative flex min-h-[196px] w-full flex-col items-center justify-center overflow-hidden rounded-[24px] border-2 border-dashed border-[#D9C7A5] bg-[#F8EEDB]/70 px-4 py-9 transition-all hover:border-[#005B5B]/40 hover:bg-[#FFFDF7]"
                                >
                                    {coverPreview ? (
                                        <>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={coverPreview}
                                                alt="カバー画像プレビュー"
                                                className="absolute inset-0 h-full w-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-[#181D1B]/25" />
                                            <span className="relative z-10 rounded-full bg-white/90 px-4 py-2 text-[12px] font-bold text-[#005B5B] shadow-sm backdrop-blur-md">
                                                画像を変更
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="mb-3 flex h-[58px] w-[58px] items-center justify-center rounded-full border border-[#005B5B]/20 bg-[#DDEDEA] text-[#005B5B] shadow-sm transition-transform group-hover:scale-105">
                                                <svg
                                                    width="28"
                                                    height="25"
                                                    viewBox="0 0 28 25"
                                                    fill="none"
                                                    aria-hidden
                                                >
                                                    <path
                                                        d="M14 2V14M8 8H20M6 20H22C23.1 20 24 19.1 24 18V7C24 5.9 23.1 5 22 5H6C4.9 5 4 5.9 4 7V18C4 19.1 4.9 20 6 20Z"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                    />
                                                    <circle cx="20" cy="9" r="2" fill="currentColor" />
                                                </svg>
                                            </span>

                                            <span className="text-[14px] font-extrabold text-[#181D1B]">
                                                カバー画像をアップロード
                                            </span>
                                            <span className="mt-1 text-[12px] font-medium text-[#6E7979]">
                                                JPEG, PNG / 最大5MB / 1200×600px 推奨
                                            </span>
                                        </>
                                    )}
                                </button>

                                <div className="flex flex-col gap-2">
                                    <FieldLabel>イベント名</FieldLabel>
                                    <input
                                        id="event-title"
                                        type="text"
                                        value={title}
                                        onChange={(event) => setTitle(event.target.value)}
                                        placeholder="例：東京・代々木公園でのピクニック言語交換会"
                                        className="h-12 w-full rounded-2xl border border-[#D9C7A5]/70 bg-[#FFFDF7] px-4 text-[15px] font-medium text-[#181D1B] outline-none transition-all placeholder:text-[#6E7979]/45 focus:border-[#005B5B]/40 focus:ring-4 focus:ring-[#005B5B]/10"
                                    />
                                    <p className="text-[12px] text-[#A99B87]">
                                        5〜50文字で入力してください。
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="flex flex-col gap-6 rounded-[28px] border border-[#D9C7A5]/70 bg-[#FFFDF7] p-6 shadow-[0_14px_32px_rgba(79,55,30,0.08)]">
                            <SectionTitle number="2" title="開催詳細" />

                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-4">
                                    <FieldLabel>カテゴリー</FieldLabel>

                                    <div className="rounded-2xl border border-[#E4D1B2]/80 bg-[#F8EEDB]/60 p-4">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <span className="text-[11px] font-black tracking-[1.1px] text-[#8B5E34] uppercase">
                                                候補から選択
                                            </span>
                                            <span className="text-[11px] font-medium text-[#A99B87]">
                                                クリックして選択
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {CATEGORY_OPTIONS.map((cat) => {
                                                const selected = category === cat.label;

                                                return (
                                                    <button
                                                        key={cat.label}
                                                        type="button"
                                                        onClick={() => setCategory(cat.label)}
                                                        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-bold transition-all active:scale-[0.98] ${selected
                                                                ? "border-[#005B5B] bg-[#005B5B] text-white shadow-[0_8px_18px_rgba(0,91,91,0.16)]"
                                                                : "border-[#D9C7A5]/80 bg-[#FFFDF7] text-[#3E4948] hover:border-[#005B5B]/35 hover:bg-[#E8F4F2] hover:text-[#005B5B]"
                                                            }`}
                                                    >
                                                        <CategoryIcon name={cat.icon} />
                                                        {cat.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-[#005B5B]/15 bg-[#DDEDEA]/45 p-4">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <span className="text-[11px] font-black tracking-[1.1px] text-[#005B5B] uppercase">
                                                選択中
                                            </span>
                                        </div>

                                        <span className="inline-flex items-center rounded-full border border-[#005B5B]/25 bg-[#DDEDEA] px-4 py-2 text-[14px] font-bold text-[#005B5B] shadow-sm">
                                            {category}
                                        </span>
                                    </div>

                                    <div className="rounded-2xl border border-dashed border-[#D9C7A5] bg-[#FFFDF7] p-4">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <span className="text-[11px] font-black tracking-[1.1px] text-[#8B5E34] uppercase">
                                                その他を入力
                                            </span>
                                            <span className="text-[11px] font-medium text-[#A99B87]">
                                                候補にないカテゴリー
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <input
                                                type="text"
                                                value={customCategory}
                                                onChange={(event) =>
                                                    setCustomCategory(event.target.value)
                                                }
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter") {
                                                        event.preventDefault();
                                                        handleApplyCustomCategory();
                                                    }
                                                }}
                                                placeholder="例：スポーツ、料理、映画"
                                                className="h-11 min-w-[180px] flex-1 rounded-xl border border-[#D9C7A5]/70 bg-[#FFFDF7] px-3 text-[14px] text-[#181D1B] outline-none placeholder:text-[#6E7979]/45 focus:border-[#005B5B]/40 focus:ring-2 focus:ring-[#005B5B]/15"
                                            />

                                            <button
                                                type="button"
                                                onClick={handleApplyCustomCategory}
                                                className="h-11 shrink-0 rounded-xl bg-[#005B5B] px-4 text-[14px] font-bold text-white transition-all hover:bg-[#004A4A] active:scale-[0.98]"
                                            >
                                                適用
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <FieldLabel>開催形式</FieldLabel>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setFormat("offline")}
                                            className={`flex items-center justify-center gap-3 rounded-2xl border px-4 py-4 transition-all active:scale-[0.98] ${format === "offline"
                                                    ? "border-[#005B5B] bg-[#DDEDEA] text-[#005B5B] shadow-[0_8px_18px_rgba(0,91,91,0.10)]"
                                                    : "border-[#D9C7A5]/70 bg-[#FFFDF7] text-[#6E7979] hover:bg-[#F8EEDB]"
                                                }`}
                                        >
                                            <svg
                                                width="16"
                                                height="20"
                                                viewBox="0 0 16 20"
                                                fill="currentColor"
                                                aria-hidden
                                            >
                                                <path d="M8 0C4.13 0 1 3.13 1 7c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S6.62 4.5 8 4.5s2.5 1.12 2.5 2.5S9.38 9.5 8 9.5z" />
                                            </svg>
                                            <span className="text-[15px] font-extrabold">対面</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setFormat("online")}
                                            className={`flex items-center justify-center gap-3 rounded-2xl border px-4 py-4 transition-all active:scale-[0.98] ${format === "online"
                                                    ? "border-[#005B5B] bg-[#DDEDEA] text-[#005B5B] shadow-[0_8px_18px_rgba(0,91,91,0.10)]"
                                                    : "border-[#D9C7A5]/70 bg-[#FFFDF7] text-[#6E7979] hover:bg-[#F8EEDB]"
                                                }`}
                                        >
                                            <svg
                                                width="20"
                                                height="16"
                                                viewBox="0 0 20 16"
                                                fill="currentColor"
                                                aria-hidden
                                            >
                                                <path d="M18 0H2C.9 0 0 .9 0 2v8c0 1.1.9 2 2 2h4l-2 4 1.5-1.5L10 12h8c1.1 0 2-.9 2-2V2c0-1.1-.9-2-2-2zm0 10H2V2h16v8z" />
                                            </svg>
                                            <span className="text-[15px] font-extrabold">
                                                オンライン
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <FieldLabel>日付</FieldLabel>

                                        <div className="relative">
                                            <svg
                                                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8B5E34]/60"
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                aria-hidden
                                            >
                                                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z" />
                                            </svg>

                                            <input
                                                id="event-date"
                                                type="date"
                                                value={date}
                                                onChange={(event) => setDate(event.target.value)}
                                                className="h-12 w-full rounded-2xl border border-[#D9C7A5]/70 bg-[#FFFDF7] pl-11 pr-4 text-[14px] font-medium text-[#181D1B] outline-none transition-all focus:border-[#005B5B]/40 focus:ring-4 focus:ring-[#005B5B]/10"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <FieldLabel>開始時間</FieldLabel>

                                        <div className="relative">
                                            <svg
                                                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8B5E34]/60"
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                aria-hidden
                                            >
                                                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
                                            </svg>

                                            <input
                                                id="event-time"
                                                type="time"
                                                value={time}
                                                onChange={(event) => setTime(event.target.value)}
                                                className="h-12 w-full rounded-2xl border border-[#D9C7A5]/70 bg-[#FFFDF7] pl-11 pr-4 text-[14px] font-medium text-[#181D1B] outline-none transition-all focus:border-[#005B5B]/40 focus:ring-4 focus:ring-[#005B5B]/10"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <FieldLabel>{format === "online" ? "URL" : "場所"}</FieldLabel>

                                    <div className="relative">
                                        <svg
                                            className="pointer-events-none absolute left-4 top-4 text-[#8B5E34]/60"
                                            width="18"
                                            height="18"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            aria-hidden
                                        >
                                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
                                        </svg>

                                        <textarea
                                            id="event-location"
                                            value={location}
                                            onChange={(event) => setLocation(event.target.value)}
                                            rows={3}
                                            placeholder={
                                                format === "online"
                                                    ? "Zoom / Google Meet などのURLを入力"
                                                    : "例：東京都渋谷区代々木公園"
                                            }
                                            className="w-full resize-none rounded-2xl border border-[#D9C7A5]/70 bg-[#FFFDF7] py-3.5 pl-11 pr-4 text-[14px] font-medium leading-5 text-[#181D1B] outline-none transition-all placeholder:text-[#6E7979]/45 focus:border-[#005B5B]/40 focus:ring-4 focus:ring-[#005B5B]/10"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-4 border-t border-[#D9C7A5]/60 bg-[#FFFDF7] px-6 py-5 sm:px-8">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-2xl border border-[#D9C7A5]/70 bg-[#FFFDF7] px-6 py-3 text-[15px] font-bold text-[#8B5E34] transition-all hover:bg-[#F8EEDB] disabled:opacity-50"
                    >
                        キャンセル
                    </button>

                    <button
                        type="button"
                        onClick={handlePublish}
                        disabled={saving}
                        className="relative flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#004F4F] via-[#006A6A] to-[#8B5E34] px-8 py-3 text-[15px] font-bold text-white shadow-[0_12px_24px_rgba(0,91,91,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(0,91,91,0.28)] active:scale-[0.98] disabled:opacity-60"
                    >
                        {saving ? (
                            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        ) : (
                            <svg width="16" height="14" viewBox="0 0 16 14" fill="none" aria-hidden>
                                <path d="M2 1L14 7L2 13V1Z" fill="white" />
                            </svg>
                        )}
                        {saving ? "公開中…" : "イベントを公開する"}
                    </button>
                </div>
            </div>
        </div>
    );
}
