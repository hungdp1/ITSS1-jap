"use client";

import Image from "next/image";
import { useState, useCallback, useEffect } from "react";
import Sidebar from "@/components/layouts/Sidebar";
import TopNav from "@/components/layouts/TopNav";
import { joinGroupAction, leaveGroupAction } from "@/app/actions/group";
import { useAuth } from "@/lib/auth-context";
import { resolveImageUrl } from "@/lib/image";
import {
    createPostAction,
    likePostAction,
    unlikePostAction,
    commentPostAction,
    getCommentsAction,
} from "@/app/actions/post";
import type { GroupPagePayload } from "@/lib/community-server";
import {
    fetchGroupPageClient,
    readGroupPageCache,
} from "@/lib/group-client";

const DEFAULT_AVATAR = "/assets/images/avatars/avatar.jpg";

type GroupDetailClientProps = {
    groupId: number;
    invalid?: boolean;
    initialGroup?: GroupPagePayload["group"];
    initialPosts?: unknown[];
};

export default function GroupDetailClient({
    groupId,
    invalid = false,
    initialGroup,
    initialPosts = [],
}: GroupDetailClientProps) {
    const cached = !invalid && groupId > 0 ? readGroupPageCache(groupId) : null;
    const resolvedGroup = cached?.group ?? initialGroup;
    const resolvedPosts = cached?.posts.data ?? initialPosts;

    const { user: currentUser } = useAuth();
    const [groupInfo, setGroupInfo] = useState(resolvedGroup);
    const [posts, setPosts] = useState<any[]>(resolvedPosts as any[]);
    const [isBootstrapping, setIsBootstrapping] = useState(!resolvedGroup && !invalid);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [isJoined, setIsJoined] = useState(!!resolvedGroup?.isJoined);
    const [postContent, setPostContent] = useState("");
    const [postImage, setPostImage] = useState<File | null>(null);
    const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
    const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
    const [commentsByPost, setCommentsByPost] = useState<Record<number, any[]>>({});
    const [expandedPostIds, setExpandedPostIds] = useState<Set<number>>(new Set());
    const [loadingComments, setLoadingComments] = useState<Set<number>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isJoinLoading, setIsJoinLoading] = useState(false);

    useEffect(() => {
        if (invalid || groupId <= 0) return;
        if (cached) return;

        let cancelled = false;

        void (async () => {
            const result = await fetchGroupPageClient(groupId);
            if (cancelled) return;

            if (!result.success) {
                setLoadError(result.message);
                setIsBootstrapping(false);
                return;
            }

            setGroupInfo(result.data.group);
            setPosts(result.data.posts.data as any[]);
            setIsJoined(!!result.data.group.isJoined);
            setLoadError(null);
            setIsBootstrapping(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [cached, groupId, invalid]);

    const loadComments = useCallback(
        async (postId: number) => {
            if (commentsByPost[postId]) return;

            setLoadingComments((prev) => new Set(prev).add(postId));
            const res = await getCommentsAction(postId);
            if (res.success && res.data?.data) {
                setCommentsByPost((prev) => ({ ...prev, [postId]: res.data.data }));
            }
            setLoadingComments((prev) => {
                const next = new Set(prev);
                next.delete(postId);
                return next;
            });
        },
        [commentsByPost]
    );

    if (invalid || groupId <= 0) {
        return <GroupErrorView message="グループが見つかりません。" />;
    }

    if (isBootstrapping || !groupInfo) {
        return (
            <div className="flex min-h-screen w-full bg-[#F3EFE4]">
                <Sidebar />
                <main className="flex-1 bg-[radial-gradient(circle_at_top_left,rgba(231,111,81,0.10),transparent_32%),linear-gradient(180deg,#F8F4EA_0%,#F3EFE4_45%,#EEF5F2_100%)] p-12">
                    <div className="mx-auto max-w-[960px] space-y-6 animate-pulse">
                        <div className="h-48 rounded-[32px] border border-[#D9C7A5]/60 bg-[#FFFDF7] shadow-[0_14px_32px_rgba(79,55,30,0.08)]" />
                        <div className="h-[320px] rounded-[32px] border border-[#D9C7A5]/60 bg-[#FFFDF7] shadow-[0_14px_32px_rgba(79,55,30,0.08)]" />
                    </div>
                </main>
            </div>
        );
    }

    if (loadError) {
        return <GroupErrorView message={loadError} />;
    }

    const handleCreatePost = async () => {
        if (!isJoined) return;
        if (!postContent.trim() && !postImage) return;
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append("content", postContent);
        formData.append("groupId", groupId.toString());
        if (postImage) formData.append("image", postImage);

        const res = await createPostAction(formData);
        if (res.success) {
            setPosts([
                {
                    ...res.data,
                    isLiked: false,
                    _count: res.data._count ?? { likes: 0, comments: 0 },
                },
                ...posts,
            ]);
            setPostContent("");
            setPostImage(null);
            if (postImagePreview) URL.revokeObjectURL(postImagePreview);
            setPostImagePreview(null);
        }
        setIsSubmitting(false);
    };

    const handleLike = async (postId: number) => {
        if (!isJoined) return;
        const post = posts.find((p) => p.id === postId);
        if (!post) return;

        const res = post.isLiked
            ? await unlikePostAction(postId)
            : await likePostAction(postId);

        if (res.success) {
            setPosts(
                posts.map((p) =>
                    p.id === postId
                        ? {
                              ...p,
                              isLiked: !p.isLiked,
                              _count: {
                                  ...p._count,
                                  likes: p.isLiked
                                      ? Math.max(0, (p._count?.likes ?? 0) - 1)
                                      : (p._count?.likes ?? 0) + 1,
                              },
                          }
                        : p
                )
            );
        }
    };

    const toggleComments = async (postId: number) => {
        const next = new Set(expandedPostIds);
        if (next.has(postId)) {
            next.delete(postId);
            setExpandedPostIds(next);
        } else {
            next.add(postId);
            setExpandedPostIds(next);
            await loadComments(postId);
        }
    };

    const handleComment = async (postId: number) => {
        if (!isJoined) return;
        const content = commentInputs[postId];
        if (!content?.trim()) return;

        const res = await commentPostAction(postId, content);
        if (res.success) {
            const { password: _, ...safeAuthor } = res.data.author ?? {};
            const newComment = { ...res.data, author: safeAuthor };

            setCommentsByPost((prev) => ({
                ...prev,
                [postId]: [...(prev[postId] ?? []), newComment],
            }));
            setPosts(
                posts.map((p) =>
                    p.id === postId
                        ? {
                              ...p,
                              _count: {
                                  ...p._count,
                                  comments: (p._count?.comments ?? 0) + 1,
                              },
                          }
                        : p
                )
            );
            setCommentInputs({ ...commentInputs, [postId]: "" });
            if (!expandedPostIds.has(postId)) {
                setExpandedPostIds(new Set(expandedPostIds).add(postId));
            }
        }
    };

    const handleToggleJoin = async () => {
        setIsJoinLoading(true);
        if (isJoined) {
            const res = await leaveGroupAction(groupId);
            if (res.success) {
                setIsJoined(false);
                setGroupInfo((prev) =>
                    prev
                        ? {
                              ...prev,
                              totalMembers: Math.max(0, prev.totalMembers - 1),
                          }
                        : prev
                );
            }
        } else {
            const res = await joinGroupAction(groupId);
            if (res.success) {
                setIsJoined(true);
                setGroupInfo((prev) =>
                    prev
                        ? {
                              ...prev,
                              totalMembers: prev.totalMembers + 1,
                          }
                        : prev
                );
            }
        }
        setIsJoinLoading(false);
    };

    const handleImageSelect = (file: File | null) => {
        setPostImage(file);
        if (postImagePreview) URL.revokeObjectURL(postImagePreview);
        setPostImagePreview(file ? URL.createObjectURL(file) : null);
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
        if (diffHours < 1) return "たった今";
        if (diffHours < 24) return `${diffHours}時間前`;
        return `${Math.floor(diffHours / 24)}日前`;
    };

    const getFullName = (user: any) => {
        if (!user) return "匿名";
        return [user.lastName, user.firstName].filter(Boolean).join(" ") || "ユーザー";
    };

    const getAvatar = (user: any) => resolveImageUrl(user?.avatarUrl, DEFAULT_AVATAR);

    const allTags = [
        ...(groupInfo.hobbyTags || []).map((t) => t.name),
        ...(groupInfo.languageTags || []).map((t) => t.name),
    ];

    return (
        <div
            className="flex min-h-screen w-full flex-row"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Manrope', 'Noto Sans JP', sans-serif" }}
        >
            <Sidebar />
            <main className="flex min-h-screen flex-1 flex-col items-center bg-[#F3EFE4]">
                <TopNav title="コミュニティ" backLink="/community" />
                <div className="flex w-full flex-col bg-[radial-gradient(circle_at_top_left,rgba(231,111,81,0.10),transparent_32%),linear-gradient(180deg,#F8F4EA_0%,#F3EFE4_45%,#EEF5F2_100%)]">
                    <div className="flex w-full flex-col items-center border-b border-[#D9C7A5]/55 bg-[#FFFDF7]/92 shadow-[0_18px_45px_rgba(79,55,30,0.10)] backdrop-blur-sm">
                        <div className="relative h-64 w-full max-w-5xl overflow-hidden border-x border-[#D9C7A5]/40 bg-[#EFE3D0]">
                            <Image
                                src={groupInfo.groupCover || "/assets/images/home/city-bg.png"}
                                alt="Cover"
                                fill
                                sizes="(max-width: 1024px) 100vw, 1024px"
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#181D1B]/52 via-[#181D1B]/10 to-transparent" />
                        </div>

                        <div className="relative z-10 -mt-12 flex w-full max-w-244 flex-col gap-6 px-6 pb-6">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                                <div className="h-32 w-32 shrink-0 rounded-[28px] border-[4px] border-[#F6EAD5] bg-[#EFE3D0] p-1 shadow-[0_16px_36px_rgba(79,55,30,0.18)] ring-2 ring-[#8B5E34]/10">
                                    <div className="relative h-full w-full overflow-hidden rounded-[22px]">
                                        <Image
                                            src={groupInfo.groupAvatar || "/assets/images/groups/group-1.jpg"}
                                            alt={groupInfo.name}
                                            fill
                                            sizes="128px"
                                            className="object-cover"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-1 flex-col gap-1 pb-2">
                                    <h1
                                        className="text-[30px] font-extrabold leading-9 tracking-[-0.75px] text-[#005B5B]"
                                        style={{ fontFamily: "'Plus Jakarta Sans'" }}
                                    >
                                        {groupInfo.name}
                                    </h1>
                                    <div className="flex items-center gap-4 text-[14px] font-bold text-[#6E7979]">
                                        <span>{groupInfo.totalMembers ?? 0} メンバー</span>
                                        {groupInfo.totalPosts != null && (
                                            <span>{groupInfo.totalPosts} 投稿</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 pb-2">
                                    {isJoined ? (
                                        <button
                                            onClick={handleToggleJoin}
                                            disabled={isJoinLoading}
                                            className="flex items-center gap-2 rounded-2xl border border-[#B86B4B]/25 bg-[#F8E0D5] px-6 py-2.5 text-[14px] font-bold text-[#923118] transition-all hover:bg-[#F3D0C0] active:scale-[0.98] disabled:opacity-60"
                                        >
                                            退出する
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleToggleJoin}
                                            disabled={isJoinLoading}
                                            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#004F4F] via-[#006A6A] to-[#8B5E34] px-6 py-2.5 text-[14px] font-bold text-white shadow-[0_12px_24px_rgba(0,91,91,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(0,91,91,0.28)] active:scale-[0.98] disabled:opacity-60"
                                        >
                                            参加する
                                        </button>
                                    )}
                                </div>
                            </div>

                            <p className="max-w-2xl text-[14px] font-medium leading-6 text-[#3E4948]">
                                {groupInfo.description || "コミュニティの説明がありません。"}
                            </p>

                            {allTags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {allTags.map((tagName, idx) => (
                                        <span
                                            key={idx}
                                            className="rounded-full border border-[#005B5B]/20 bg-[#DDEDEA] px-3 py-1 text-[12px] font-bold text-[#005B5B] shadow-sm"
                                        >
                                            #{tagName}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="my-8 flex w-full justify-center">
                        <div className="flex w-full max-w-244 flex-col gap-6 px-6">
                            {isJoined ? (
                                <div className="flex w-full flex-col gap-4 rounded-[28px] border border-[#D9C7A5]/75 bg-[#FFFDF7] p-5 shadow-[0_16px_36px_rgba(79,55,30,0.10)] ring-1 ring-white/70">
                                    <div className="flex gap-4">
                                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl border-2 border-[#F6EAD5] bg-[#EFE3D0] shadow-[0_8px_18px_rgba(79,55,30,0.12)]">
                                            <Image
                                                src={getAvatar(currentUser)}
                                                alt="You"
                                                fill
                                                sizes="40px"
                                                className="object-cover"
                                            />
                                        </div>
                                        <textarea
                                            value={postContent}
                                            onChange={(e) => setPostContent(e.target.value)}
                                            placeholder="何を投稿しますか？"
                                            className="min-h-20 flex-1 resize-none rounded-2xl border border-[#D9C7A5]/70 bg-[#FFFDF7] p-3 text-[14px] font-medium text-[#181D1B] outline-none transition-all placeholder:text-[#6E7979]/45 focus:border-[#005B5B]/40 focus:ring-4 focus:ring-[#005B5B]/10"
                                        />
                                    </div>

                                    {postImagePreview && (
                                        <div className="relative h-40 w-full overflow-hidden rounded-2xl border border-[#D9C7A5]/70 bg-[#F8EEDB]">
                                            <Image
                                                src={postImagePreview}
                                                alt="Preview"
                                                fill
                                                sizes="(max-width: 896px) 100vw, 896px"
                                                className="object-contain"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleImageSelect(null)}
                                                className="absolute right-2 top-2 rounded-full bg-[#181D1B]/65 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm"
                                            >
                                                削除
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex w-full items-center justify-between border-t border-[#D9C7A5]/60 pt-4">
                                        <label className="relative flex cursor-pointer items-center gap-2 rounded-2xl px-3 py-1.5 text-[#005B5B] transition-colors hover:bg-[#E8F4F2]">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="sr-only"
                                                onChange={(e) =>
                                                    handleImageSelect(e.target.files?.[0] || null)
                                                }
                                            />
                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1.5 13.5C1.0875 13.5 0.734375 13.3531 0.440625 13.0594C0.146875 12.7656 0 12.4125 0 12V1.5C0 1.0875 0.146875 0.734375 0.440625 0.440625C0.734375 0.146875 1.0875 0 1.5 0H12C12.4125 0 12.7656 0.146875 13.0594 0.440625C13.3531 0.734375 13.5 1.0875 13.5 1.5V12C13.5 12.4125 13.3531 12.7656 13.0594 13.0594C12.7656 13.3531 12.4125 13.5 12 13.5H1.5ZM1.5 12H12V1.5H1.5V12ZM2.25 10.5H11.25L8.4375 6.75L6.1875 9.75L4.5 7.5L2.25 10.5ZM1.5 12V1.5V12Z" fill="#005B5B" />
                                            </svg>
                                            <span className="text-[12px] font-bold leading-4">写真</span>
                                        </label>

                                        <button
                                            onClick={handleCreatePost}
                                            disabled={isSubmitting}
                                            className="rounded-2xl bg-gradient-to-r from-[#004F4F] via-[#006A6A] to-[#8B5E34] px-6 py-2 text-[14px] font-bold text-white shadow-[0_12px_24px_rgba(0,91,91,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(0,91,91,0.28)] active:scale-[0.98] disabled:opacity-60"
                                        >
                                            {isSubmitting ? "投稿中…" : "投稿する"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full rounded-[28px] border border-dashed border-[#D9C7A5]/80 bg-[#FFFDF7] p-5 text-center shadow-[0_16px_40px_rgba(79,55,30,0.08)]">
                                    <p className="text-[14px] font-medium text-[#6E7979]">
                                        投稿するにはグループに参加してください。
                                    </p>
                                </div>
                            )}

                            {posts.length === 0 ? (
                                <p className="rounded-[28px] border border-dashed border-[#D9C7A5]/80 bg-[#FFFDF7] py-12 text-center text-[14px] font-medium text-[#6E7979] shadow-[0_16px_40px_rgba(79,55,30,0.08)]">
                                    まだ投稿がありません。最初の投稿をしてみましょう！
                                </p>
                            ) : (
                                <div className="flex flex-col gap-6">
                                    {posts.map((post) => {
                                        const isExpanded = expandedPostIds.has(post.id);
                                        const comments = commentsByPost[post.id] ?? [];

                                        return (
                                            <div
                                                key={post.id}
                                                className="flex w-full flex-col overflow-hidden rounded-[28px] border border-[#D9C7A5]/75 bg-[#FFFDF7] shadow-[0_16px_36px_rgba(79,55,30,0.10)] ring-1 ring-white/70"
                                            >
                                                <div className="p-5 flex flex-col gap-4">
                                                    <PostAuthor
                                                        post={post}
                                                        getFullName={getFullName}
                                                        getAvatar={getAvatar}
                                                        formatTime={formatTime}
                                                    />

                                                    <p className="whitespace-pre-wrap text-[14px] font-medium leading-6 text-[#181D1B]">
                                                        {post.content}
                                                    </p>
                                                    {post.image && (
                                                        <div className="relative mt-2 h-64 w-full overflow-hidden rounded-2xl border border-[#D9C7A5]/70 bg-[#F8EEDB]">
                                                            <Image
                                                                src={post.image}
                                                                alt="Post image"
                                                                fill
                                                                sizes="(max-width: 896px) 100vw, 896px"
                                                                className="object-contain"
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between border-y border-[#D9C7A5]/60 px-5 py-3">
                                                    <div className="flex gap-4">
                                                        <button
                                                            onClick={() => handleLike(post.id)}
                                                            disabled={!isJoined}
                                                            title={!isJoined ? "いいねするにはグループに参加してください" : undefined}
                                                            className={`flex items-center gap-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                                                post.isLiked
                                                                    ? "text-[#005B5B]"
                                                                    : "text-[#6E7979] hover:text-[#005B5B]"
                                                            }`}
                                                        >
                                                            <svg width="15" height="14" viewBox="0 0 15 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path
                                                                    d="M7.5 13.7625L6.4125 12.7875C5.15 11.65 4.10625 10.6687 3.28125 9.84375C2.45625 9.01875 1.8 8.27812 1.3125 7.62187C0.825 6.96562 0.484375 6.3625 0.290625 5.8125C0.096875 5.2625 0 4.7 0 4.125C0 2.95 0.39375 1.96875 1.18125 1.18125C1.96875 0.39375 2.95 0 4.125 0C4.775 0 5.39375 0.1375 5.98125 0.4125C6.56875 0.6875 7.075 1.075 7.5 1.575C7.925 1.075 8.43125 0.6875 9.01875 0.4125C9.60625 0.1375 10.225 0 10.875 0C12.05 0 13.0312 0.39375 13.8188 1.18125C14.6063 1.96875 15 2.95 15 4.125C15 4.7 14.9031 5.2625 14.7094 5.8125C14.5156 6.3625 14.175 6.96562 13.6875 7.62187C13.2 8.27812 12.5437 9.01875 11.7188 9.84375C10.8938 10.6687 9.85 11.65 8.5875 12.7875L7.5 13.7625Z"
                                                                    fill="currentColor"
                                                                />
                                                            </svg>
                                                            <span className="text-[12px] font-medium">いいね</span>
                                                        </button>
                                                        <button
                                                            onClick={() => toggleComments(post.id)}
                                                            className={`flex items-center gap-1.5 transition-colors ${
                                                                isExpanded
                                                                    ? "text-[#005B5B]"
                                                                    : "text-[#6E7979] hover:text-[#005B5B]"
                                                            }`}
                                                        >
                                                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M0 15V1.5C0 1.0875 0.146875 0.734375 0.440625 0.440625C0.734375 0.146875 1.0875 0 1.5 0H13.5C13.9125 0 14.2656 0.146875 14.5594 0.440625C14.8531 0.734375 15 1.0875 15 1.5V10.5C15 10.9125 14.8531 11.2656 14.5594 11.5594C14.2656 11.8531 13.9125 12 13.5 12H3L0 15ZM2.3625 10.5H13.5V1.5H1.5V11.3438L2.3625 10.5Z" fill="currentColor" />
                                                            </svg>
                                                            <span className="text-[12px] font-medium">コメント</span>
                                                        </button>
                                                    </div>
                                                    <PostCounts post={post} />
                                                </div>

                                                {isExpanded && (
                                                    <div className="flex flex-col gap-4 bg-[#F8F4EA] p-5">
                                                        {loadingComments.has(post.id) ? (
                                                            <p className="text-[12px] text-[#6E7979] text-center py-2">
                                                                読み込み中…
                                                            </p>
                                                        ) : (
                                                            comments.map((comment) => (
                                                                <div key={comment.id} className="flex gap-3">
                                                                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl border border-[#F6EAD5] bg-[#EFE3D0]">
                                                                        <Image
                                                                            src={getAvatar(comment.author)}
                                                                            alt={getFullName(comment.author)}
                                                                            fill
                                                                            sizes="32px"
                                                                            className="object-cover"
                                                                        />
                                                                    </div>
                                                                    <div className="flex-1 rounded-2xl border border-[#D9C7A5]/70 bg-[#FFFDF7] p-3 shadow-sm">
                                                                        <div className="flex justify-between items-center mb-1">
                                                                            <span className="text-[12px] font-bold text-[#181D1B]">
                                                                                {getFullName(comment.author)}
                                                                            </span>
                                                                            <span className="text-[10px] font-medium text-[#6E7979]">
                                                                                {formatTime(comment.createdAt)}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[12px] font-medium text-[#3E4948]">
                                                                            {comment.content}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}

                                                        {isJoined ? (
                                                            <div className="flex gap-3 mt-2">
                                                                <CommentAvatar currentUser={currentUser} getAvatar={getAvatar} />
                                                                <div className="flex-1 relative">
                                                                    <input
                                                                        type="text"
                                                                        value={commentInputs[post.id] ?? ""}
                                                                        onChange={(e) =>
                                                                            setCommentInputs({
                                                                                ...commentInputs,
                                                                                [post.id]: e.target.value,
                                                                            })
                                                                        }
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter") handleComment(post.id);
                                                                        }}
                                                                        placeholder="コメントを書く…"
                                                                        className="w-full rounded-full border border-[#D9C7A5]/70 bg-[#FFFDF7] px-4 py-2 text-[12px] font-medium text-[#181D1B] outline-none placeholder:text-[#6E7979]/45 focus:border-[#005B5B]/40 focus:ring-2 focus:ring-[#005B5B]/15"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleComment(post.id)}
                                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#005B5B]"
                                                                    >
                                                                        <svg width="15" height="12" viewBox="0 0 15 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                            <path d="M0 12V0L14.25 6L0 12ZM1.5 9.75L10.3875 6L1.5 2.25V4.875L6 6L1.5 7.125V9.75Z" fill="#005B5B" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-[12px] font-medium text-[#6E7979] text-center mt-2">
                                                                コメントするにはグループに参加してください。
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export function GroupErrorView({ message }: { message: string }) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(231,111,81,0.10),transparent_32%),linear-gradient(180deg,#F8F4EA_0%,#F3EFE4_45%,#EEF5F2_100%)] px-4">
            <p className="rounded-[28px] border border-[#B86B4B]/25 bg-[#F8E0D5] px-6 py-4 text-center text-[14px] font-bold text-[#923118] shadow-[0_16px_40px_rgba(79,55,30,0.08)]">
                {message}
            </p>
        </div>
    );
}

function PostAuthor({
    post,
    getFullName,
    getAvatar,
    formatTime,
}: {
    post: any;
    getFullName: (user: any) => string;
    getAvatar: (user: any) => string;
    formatTime: (date: string) => string;
}) {
    return (
        <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-2xl border-2 border-[#F6EAD5] bg-[#EFE3D0] shadow-[0_8px_18px_rgba(79,55,30,0.12)]">
                <Image
                    src={getAvatar(post.author)}
                    alt={getFullName(post.author)}
                    fill
                    sizes="40px"
                    className="object-cover"
                />
            </div>
            <div className="flex flex-col">
                <span className="text-[14px] font-bold leading-5 text-[#181D1B]">
                    {getFullName(post.author)}
                </span>
                <span className="text-[11px] font-medium text-[#6E7979] leading-4">
                    {formatTime(post.createdAt)}
                </span>
            </div>
        </div>
    );
}

function PostCounts({ post }: { post: any }) {
    return (
        <div className="flex gap-3 text-[11px] font-bold text-[#8B5E34]">
            <span>{post._count?.likes ?? 0}件のいいね</span>
            <span>{post._count?.comments ?? 0}件のコメント</span>
        </div>
    );
}

function CommentAvatar({
    currentUser,
    getAvatar,
}: {
    currentUser: any;
    getAvatar: (user: any) => string;
}) {
    return (
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl border border-[#F6EAD5] bg-[#EFE3D0]">
            <Image src={getAvatar(currentUser)} alt="You" fill sizes="32px" className="object-cover" />
        </div>
    );
}
