"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import {
    getUserProfileAction,
    saveProfileAction,
    type UserProfile,
} from "@/app/actions/profile";
import {
    COMMON_HOBBY_OPTIONS,
    COMMON_PURPOSE_OPTIONS,
    JLPT_LEVEL_OPTIONS,
    NATIONALITY_OPTIONS,
} from "@/lib/profile-options";
import {
    languagesFromProfile,
    profileLanguagesToPayload,
    type Nationality,
    type ProfileLanguageEdit,
} from "@/lib/profile-languages";
import { resolveImageUrl } from "@/lib/image";

type ProfileEditModalProps = {
    profile: UserProfile;
    open: boolean;
    onClose: () => void;
    onSaved: (profile: UserProfile) => void;
};

function SectionHeader({ title, icon }: { title: string; icon: ReactNode }) {
    return (
        <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#005B5B]/20 bg-[#DDEDEA] text-[#005B5B]">
                {icon}
            </span>

            <h2 className="text-[18px] leading-7 font-extrabold text-[#005B5B]">{title}</h2>
        </div>
    );
}

function FieldLabel({ children }: { children: ReactNode }) {
    return (
        <span className="text-[12px] leading-4 font-black tracking-[1.2px] text-[#8B5E34] uppercase">
            {children}
        </span>
    );
}

function TagEditor({
    tags,
    onChange,
    placeholder,
    suggestions = [],
}: {
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder: string;
    suggestions?: readonly string[];
}) {
    const [isAdding, setIsAdding] = useState(false);
    const [draft, setDraft] = useState("");

    const addTag = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed || tags.includes(trimmed)) return;

        onChange([...tags, trimmed]);
    };

    const commitAdd = () => {
        const value = draft.trim();
        if (!value) return;

        addTag(value);
        setDraft("");
        setIsAdding(false);
    };

    const availableSuggestions = suggestions.filter((option) => !tags.includes(option));

    return (
        <div className="flex flex-col gap-5">
            {availableSuggestions.length > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl border border-[#E4D1B2]/80 bg-[#F8EEDB]/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-black tracking-[1.1px] text-[#8B5E34] uppercase">
                            候補から選択
                        </span>
                        <span className="text-[11px] font-medium text-[#A99B87]">
                            クリックして追加
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {availableSuggestions.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => addTag(option)}
                                className="rounded-full border border-[#D9C7A5]/90 bg-[#FFFDF7] px-4 py-2 text-[13px] font-bold text-[#3E4948] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#005B5B]/35 hover:bg-[#E8F4F2] hover:text-[#005B5B] active:scale-[0.98]"
                            >
                                <span className="mr-1 text-[#005B5B]">+</span>
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3 rounded-2xl border border-[#005B5B]/15 bg-[#DDEDEA]/45 p-4">
                <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-black tracking-[1.1px] text-[#005B5B] uppercase">
                        選択済み
                    </span>
                    <span className="text-[11px] font-medium text-[#6E7979]">
                        {tags.length}件
                    </span>
                </div>

                {tags.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-3">
                        {tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-2 rounded-full border border-[#005B5B]/25 bg-[#DDEDEA] px-4 py-2 text-[14px] font-bold text-[#005B5B] shadow-sm"
                            >
                                {tag}

                                <button
                                    type="button"
                                    onClick={() => onChange(tags.filter((item) => item !== tag))}
                                    className="flex h-5 w-5 items-center justify-center rounded-full bg-[#005B5B]/10 leading-none text-[#005B5B] transition-all hover:bg-[#005B5B] hover:text-white"
                                    aria-label={`${tag}を削除`}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="rounded-xl border border-dashed border-[#005B5B]/20 bg-[#FFFDF7]/70 px-4 py-3 text-[13px] font-medium text-[#6E7979]">
                        まだ選択されていません。
                    </p>
                )}
            </div>

            <div className="rounded-2xl border border-dashed border-[#D9C7A5] bg-[#FFFDF7] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-black tracking-[1.1px] text-[#8B5E34] uppercase">
                        その他を入力
                    </span>
                    <span className="text-[11px] font-medium text-[#A99B87]">
                        候補にない項目を追加
                    </span>
                </div>

                {isAdding ? (
                    <div className="flex w-full flex-wrap items-center gap-2">
                        <input
                            type="text"
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    commitAdd();
                                }

                                if (event.key === "Escape") {
                                    setDraft("");
                                    setIsAdding(false);
                                }
                            }}
                            placeholder={placeholder}
                            autoFocus
                            className="h-11 min-w-[180px] flex-1 rounded-xl border border-[#D9C7A5]/70 bg-[#FFFDF7] px-3 text-[14px] text-[#181D1B] outline-none placeholder:text-[#6E7979]/45 focus:border-[#005B5B]/40 focus:ring-2 focus:ring-[#005B5B]/15"
                        />

                        <button
                            type="button"
                            onClick={commitAdd}
                            disabled={!draft.trim()}
                            className="h-11 rounded-xl bg-[#005B5B] px-4 text-[14px] font-bold text-white transition-all hover:bg-[#004A4A] disabled:opacity-50"
                        >
                            追加
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setDraft("");
                                setIsAdding(false);
                            }}
                            className="h-11 rounded-xl px-3 text-[14px] font-bold text-[#8B5E34] hover:bg-[#F8EEDB]"
                        >
                            キャンセル
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsAdding(true)}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#D9C7A5]/90 bg-[#FFFDF7] px-4 text-[14px] font-bold text-[#005B5B] transition-all hover:border-[#005B5B]/30 hover:bg-[#E8F4F2] active:scale-[0.98]"
                    >
                        <span className="text-[18px] leading-none">+</span>
                        自由入力を追加
                    </button>
                )}
            </div>
        </div>
    );
}

export default function ProfileEditModal({
    profile,
    open,
    onClose,
    onSaved,
}: ProfileEditModalProps) {
    const [displayName, setDisplayName] = useState(profile.name);
    const [location, setLocation] = useState(profile.location === "—" ? "" : profile.location);
    const [bio, setBio] = useState(profile.bio);
    const [languageEdit, setLanguageEdit] = useState<ProfileLanguageEdit>(() =>
        languagesFromProfile(profile.languages)
    );
    const [hobbies, setHobbies] = useState(profile.interests.map((interest) => interest.name));
    const [purposes, setPurposes] = useState(profile.purposes.map((purpose) => purpose.label));
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const galleryImages = Array.from(
        new Set(
            [
                profile.avatarUrl,
                ...(Array.isArray(profile.gallery) ? profile.gallery : []),
            ].filter(Boolean)
        )
    );
    const safeGalleryImages =
        galleryImages.length > 0 ? galleryImages : ["/assets/images/avatars/avatar.jpg"];
    const activeImage = safeGalleryImages[activeImageIndex] ?? safeGalleryImages[0];

    useEffect(() => {
        if (!open) return;

        setDisplayName(profile.name);
        setLocation(profile.location === "—" ? "" : profile.location);
        setBio(profile.bio);
        setLanguageEdit(languagesFromProfile(profile.languages));
        setHobbies(profile.interests.map((interest) => interest.name));
        setPurposes(profile.purposes.map((purpose) => purpose.label));
        setActiveImageIndex(0);
        setError(null);
    }, [open, profile]);

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
            if (event.key === "Escape" && !saving) onClose();
        };

        window.addEventListener("keydown", onKey);

        return () => window.removeEventListener("keydown", onKey);
    }, [open, saving, onClose]);

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        const result = await saveProfileAction(profile.id, {
            displayName,
            location,
            bio,
            languages: profileLanguagesToPayload(languageEdit),
            hobbies,
            purposes,
        });

        setSaving(false);

        if (!result.success) {
            setError(result.message ?? "保存に失敗しました。");
            return;
        }

        if (result.data) {
            onSaved(result.data);
            return;
        }

        const refreshed = await getUserProfileAction(String(profile.id));

        if (refreshed.success && refreshed.data) {
            onSaved(refreshed.data);
        } else {
            onClose();
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-edit-title"
        >
            <button
                type="button"
                className="absolute inset-0 bg-[#181D1B]/45 backdrop-blur-sm"
                onClick={saving ? undefined : onClose}
                aria-label="閉じる"
            />

            <div
                className="relative flex max-h-[min(90vh,1137px)] w-full max-w-[640px] flex-col overflow-hidden rounded-[32px] border border-[#D9C7A5]/70 bg-[#FFFDF7] shadow-[0_24px_60px_rgba(0,0,0,0.24)]"
                style={{
                    fontFamily: "'Plus Jakarta Sans', 'Manrope', 'Noto Sans JP', sans-serif",
                }}
            >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#8B5E34] via-[#E76F51] to-[#005B5B]" />

                <div className="flex shrink-0 items-center justify-between border-b border-[#D9C7A5]/60 bg-[#FFFDF7] px-6 py-5">
                    <div>
                        <h2
                            id="profile-edit-title"
                            className="text-[20px] font-extrabold tracking-[-0.4px] text-[#005B5B]"
                        >
                            プロフィール編集
                        </h2>
                        <p className="mt-1 text-[12px] font-medium text-[#6E7979]">
                            自己紹介、語学レベル、興味を更新できます。
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

                <div className="flex flex-1 flex-col gap-6 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(231,111,81,0.08),transparent_30%),linear-gradient(180deg,#FFFDF7_0%,#F8F4EA_45%,#F3EFE4_100%)] px-4 py-6 sm:px-6">
                    <section className="flex flex-col gap-5 rounded-[28px] border border-[#D9C7A5]/70 bg-[#FFFDF7] p-6 shadow-[0_14px_32px_rgba(79,55,30,0.08)] sm:p-8">
                        <SectionHeader
                            title="プロフィール写真"
                            icon={
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                    <path d="M4 5.5C4 4.12 5.12 3 6.5 3H17.5C18.88 3 20 4.12 20 5.5V18.5C20 19.88 18.88 21 17.5 21H6.5C5.12 21 4 19.88 4 18.5V5.5ZM7 16.8H17L14.1 12.9L11.75 15.85L10.2 13.9L7 16.8ZM9 10.5C9.83 10.5 10.5 9.83 10.5 9C10.5 8.17 9.83 7.5 9 7.5C8.17 7.5 7.5 8.17 7.5 9C7.5 9.83 8.17 10.5 9 10.5Z" />
                                </svg>
                            }
                        />

                        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                            <div className="relative aspect-square overflow-hidden rounded-[24px] border-[8px] border-[#F6EAD5] bg-white shadow-inner">
                                <Image
                                    src={resolveImageUrl(activeImage)}
                                    alt={profile.name}
                                    fill
                                    className="object-contain"
                                    sizes="160px"
                                />
                            </div>

                            <div className="flex flex-col gap-3">
                                <p className="text-[13px] leading-5 font-medium text-[#6E7979]">
                                    登録時の写真がメイン画像として表示されます。投稿や関連する投稿画像はギャラリーに並びます。
                                </p>

                                <div className="grid grid-cols-4 gap-2">
                                    {safeGalleryImages.slice(0, 8).map((image, index) => (
                                        <button
                                            key={`${image}-${index}`}
                                            type="button"
                                            onClick={() => setActiveImageIndex(index)}
                                            className={`relative aspect-square overflow-hidden rounded-2xl border bg-white transition-all ${index === activeImageIndex
                                                    ? "border-[#005B5B] shadow-[0_0_0_3px_rgba(0,91,91,0.15)]"
                                                    : "border-[#F1E5CF] opacity-75 hover:opacity-100"
                                                }`}
                                        >
                                            <Image
                                                src={resolveImageUrl(image)}
                                                alt={`プロフィール写真 ${index + 1}`}
                                                fill
                                                className={index === 0 ? "object-contain p-1" : "object-cover"}
                                                sizes="72px"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="flex flex-col gap-6 rounded-[28px] border border-[#D9C7A5]/70 bg-[#FFFDF7] p-6 shadow-[0_14px_32px_rgba(79,55,30,0.08)] sm:p-8">
                        <SectionHeader
                            title="基本情報"
                            icon={
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    aria-hidden
                                >
                                    <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z" />
                                </svg>
                            }
                        />

                        <div className="flex flex-col gap-6">
                            <label className="flex flex-col gap-2">
                                <FieldLabel>ユーザー名</FieldLabel>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(event) => setDisplayName(event.target.value)}
                                    className="h-12 w-full rounded-2xl border border-[#D9C7A5]/70 bg-[#FFFDF7] px-4 text-[16px] text-[#181D1B] outline-none transition-all focus:border-[#005B5B]/40 focus:ring-4 focus:ring-[#005B5B]/10"
                                />
                            </label>

                            <label className="flex flex-col gap-2">
                                <FieldLabel>場所</FieldLabel>

                                <div className="relative">
                                    <svg
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8B5E34]/60"
                                        width="16"
                                        height="20"
                                        viewBox="0 0 10 12"
                                        fill="currentColor"
                                        aria-hidden
                                    >
                                        <path d="M5 0C2.24 0 0 2.24 0 5C0 8.75 5 12 5 12C5 12 10 8.75 10 5C10 2.24 7.76 0 5 0ZM5 7C3.9 7 3 6.1 3 5C3 3.9 3.9 3 5 3C6.1 3 7 3.9 7 5C7 6.1 6.1 7 5 7Z" />
                                    </svg>

                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(event) => setLocation(event.target.value)}
                                        placeholder="東京, 日本"
                                        className="h-12 w-full rounded-2xl border border-[#D9C7A5]/70 bg-[#FFFDF7] pl-11 pr-4 text-[16px] text-[#181D1B] outline-none transition-all placeholder:text-[#6E7979]/45 focus:border-[#005B5B]/40 focus:ring-4 focus:ring-[#005B5B]/10"
                                    />
                                </div>
                            </label>

                            <label className="flex flex-col gap-2">
                                <FieldLabel>自己紹介</FieldLabel>
                                <textarea
                                    value={bio}
                                    onChange={(event) => setBio(event.target.value)}
                                    rows={5}
                                    className="w-full resize-none rounded-2xl border border-[#D9C7A5]/70 bg-[#FFFDF7] px-4 py-3 text-[16px] leading-6 text-[#181D1B] outline-none transition-all focus:border-[#005B5B]/40 focus:ring-4 focus:ring-[#005B5B]/10"
                                />
                            </label>
                        </div>
                    </section>

                    <section className="flex flex-col gap-6 rounded-[28px] border border-[#D9C7A5]/70 bg-[#FFFDF7] p-6 shadow-[0_14px_32px_rgba(79,55,30,0.08)] sm:p-8">
                        <SectionHeader
                            title="語学レベル"
                            icon={<span className="text-[14px] font-black leading-none">Aあ</span>}
                        />

                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-3">
                                <FieldLabel>国籍</FieldLabel>

                                <div className="flex flex-wrap gap-3">
                                    {NATIONALITY_OPTIONS.map((nationality) => {
                                        const isActive = languageEdit.nationality === nationality;

                                        return (
                                            <button
                                                key={nationality}
                                                type="button"
                                                onClick={() =>
                                                    setLanguageEdit((prev) => ({
                                                        ...prev,
                                                        nationality: nationality as Nationality,
                                                        jlptLevel:
                                                            nationality === "日本"
                                                                ? null
                                                                : prev.jlptLevel,
                                                    }))
                                                }
                                                className={`rounded-2xl border px-6 py-2.5 text-[14px] font-bold transition-all active:scale-[0.98] ${isActive
                                                    ? "border-[#005B5B] bg-[#005B5B] text-white shadow-[0_8px_18px_rgba(0,91,91,0.16)]"
                                                    : "border-[#D9C7A5]/70 bg-[#FFFDF7] text-[#3E4948] hover:border-[#005B5B]/30 hover:bg-[#E8F4F2]"
                                                    }`}
                                            >
                                                {nationality}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {languageEdit.nationality === "ベトナム" && (
                                <label className="flex flex-col gap-3">
                                    <FieldLabel>日本語レベル（JLPT）</FieldLabel>

                                    <select
                                        value={languageEdit.jlptLevel ?? ""}
                                        onChange={(event) =>
                                            setLanguageEdit((prev) => ({
                                                ...prev,
                                                jlptLevel: event.target.value || null,
                                            }))
                                        }
                                        className="h-12 w-full rounded-2xl border border-[#D9C7A5]/70 bg-[#FFFDF7] px-4 text-[16px] text-[#181D1B] outline-none transition-all focus:border-[#005B5B]/40 focus:ring-4 focus:ring-[#005B5B]/10"
                                    >
                                        <option value="">レベルを選択</option>
                                        {JLPT_LEVEL_OPTIONS.map((level) => (
                                            <option key={level} value={level}>
                                                {level}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}

                            {languageEdit.nationality === "日本" && (
                                <p className="rounded-2xl border border-[#E4D1B2]/80 bg-[#F8EEDB] px-4 py-3 text-[14px] leading-relaxed text-[#6E7979]">
                                    日本国籍の方は日本語ネイティブとして表示されます。
                                </p>
                            )}
                        </div>
                    </section>

                    <section className="flex flex-col gap-6 rounded-[28px] border border-[#D9C7A5]/70 bg-[#FFFDF7] p-6 shadow-[0_14px_32px_rgba(79,55,30,0.08)] sm:p-8">
                        <SectionHeader
                            title="興味・関心"
                            icon={
                                <svg
                                    width="20"
                                    height="19"
                                    viewBox="0 0 20 19"
                                    fill="currentColor"
                                    aria-hidden
                                >
                                    <circle cx="6" cy="6" r="4" />
                                    <rect x="11" y="3" width="8" height="8" rx="1" />
                                </svg>
                            }
                        />

                        <TagEditor
                            tags={hobbies}
                            onChange={setHobbies}
                            placeholder="例：料理、旅行"
                            suggestions={COMMON_HOBBY_OPTIONS}
                        />
                    </section>

                    <section className="flex flex-col gap-6 rounded-[28px] border border-[#D9C7A5]/70 bg-[#FFFDF7] p-6 shadow-[0_14px_32px_rgba(79,55,30,0.08)] sm:p-8">
                        <SectionHeader
                            title="交流の目的"
                            icon={
                                <svg
                                    width="20"
                                    height="19"
                                    viewBox="0 0 20 19"
                                    fill="currentColor"
                                    aria-hidden
                                >
                                    <circle cx="6" cy="6" r="4" />
                                    <rect x="11" y="3" width="8" height="8" rx="1" />
                                </svg>
                            }
                        />

                        <TagEditor
                            tags={purposes}
                            onChange={setPurposes}
                            placeholder="例：言語交換、文化交流"
                            suggestions={COMMON_PURPOSE_OPTIONS}
                        />
                    </section>

                    {error && (
                        <p className="rounded-2xl border border-[#B86B4B]/25 bg-[#F8E0D5] px-4 py-3 text-center text-[14px] font-bold text-[#923118]">
                            {error}
                        </p>
                    )}
                </div>

                <div className="flex shrink-0 items-center justify-end gap-4 border-t border-[#D9C7A5]/60 bg-[#FFFDF7] px-6 py-5">
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
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-2xl bg-gradient-to-r from-[#004F4F] via-[#006A6A] to-[#8B5E34] px-10 py-3 text-[15px] font-bold text-white shadow-[0_12px_24px_rgba(0,91,91,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(0,91,91,0.28)] active:scale-[0.98] disabled:opacity-60"
                    >
                        {saving ? "保存中..." : "保存する"}
                    </button>
                </div>
            </div>
        </div>
    );
}
