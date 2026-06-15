// app/actions/post.ts
"use server";
import { cookies } from "next/headers";
import { getApiBaseUrl } from "@/lib/api";

export async function getPostsAction(groupId: number, page = 1) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;
        const res = await fetch(`${getApiBaseUrl()}/posts?groupId=${groupId}&page=${page}&limit=10`, {
            headers: { "Authorization": `Bearer ${token}` },
            cache: "no-store"
        });
        const data = await res.json();
        return { success: res.ok, data };
    } catch (error: any) {
        return { success: false };
    }
}

export async function createPostAction(formData: FormData) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;
        const res = await fetch(`${getApiBaseUrl()}/posts`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData // multipart/form-data
        });
        const data = await res.json();
        return { success: res.ok, data };
    } catch (error) {
        return { success: false };
    }
}

export async function likePostAction(postId: number) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;
        const res = await fetch(`${getApiBaseUrl()}/posts/like`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ postId })
        });
        return { success: res.ok };
    } catch (error) {
        return { success: false };
    }
}

export async function commentPostAction(postId: number, content: string) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;
        const res = await fetch(`${getApiBaseUrl()}/posts/comment`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ postId, content })
        });
        const data = await res.json();
        return { success: res.ok, data };
    } catch (error) {
        return { success: false };
    }
}

export async function unlikePostAction(postId: number) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;
        const res = await fetch(`${getApiBaseUrl()}/posts/unlike`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ postId })
        });
        return { success: res.ok };
    } catch (error) {
        return { success: false };
    }
}

export async function getCommentsAction(postId: number, page = 1) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;
        const res = await fetch(
            `${getApiBaseUrl()}/posts/${postId}/comments?page=${page}&limit=20`,
            {
                headers: { "Authorization": `Bearer ${token}` },
                cache: "no-store"
            }
        );
        const data = await res.json();
        return { success: res.ok, data };
    } catch (error) {
        return { success: false, data: { data: [] } };
    }
}
