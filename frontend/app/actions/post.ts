// app/actions/post.ts
"use server";
import { localApiResponse, fileToUpload } from "@/lib/api";

export async function getPostsAction(groupId: number, page = 1) {
    try {
        const res = await localApiResponse("GET", `/posts?groupId=${groupId}&page=${page}&limit=10`);
        const data = await res.json();
        return { success: res.ok, data };
    } catch {
        return { success: false };
    }
}

export async function createPostAction(formData: FormData) {
    try {
        const image = formData.get("image");
        const res = await localApiResponse("POST", "/posts", {
            body: {
                content: formData.get("content"),
                groupId: formData.get("groupId"),
            },
            file: image instanceof File && image.size > 0 ? await fileToUpload(image) : null,
        });
        const data = await res.json();
        return { success: res.ok, data };
    } catch {
        return { success: false };
    }
}

export async function likePostAction(postId: number) {
    try {
        const res = await localApiResponse("POST", "/posts/like", { body: { postId } });
        return { success: res.ok };
    } catch {
        return { success: false };
    }
}

export async function commentPostAction(postId: number, content: string) {
    try {
        const res = await localApiResponse("POST", "/posts/comment", { body: { postId, content } });
        const data = await res.json();
        return { success: res.ok, data };
    } catch {
        return { success: false };
    }
}

export async function unlikePostAction(postId: number) {
    try {
        const res = await localApiResponse("POST", "/posts/unlike", { body: { postId } });
        return { success: res.ok };
    } catch {
        return { success: false };
    }
}

export async function getCommentsAction(postId: number, page = 1) {
    try {
        const res = await localApiResponse("GET", `/posts/${postId}/comments?page=${page}&limit=20`);
        const data = await res.json();
        return { success: res.ok, data };
    } catch {
        return { success: false, data: { data: [] } };
    }
}
