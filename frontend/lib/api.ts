import "server-only";
import { getCurrentUserId } from "@/lib/server/auth";
import { handleApi, type ApiContext, type UploadFile } from "@/lib/server/router";

export { getApiBaseUrl, getSocketBaseUrl } from "@/lib/env";

type ApiError = { ok: false; message: string; status: number };
type ApiSuccess<T> = { ok: true; data: T; status: number };
export type ApiResult<T> = ApiSuccess<T> | ApiError;

function parseErrorMessage(data: unknown, fallback: string): string {
    if (data && typeof data === "object") {
        const record = data as Record<string, unknown>;
        if (typeof record.message === "string") return record.message;
        if (typeof record.error === "string") return record.error;
    }
    return fallback;
}

async function dispatch<T>(
    method: string,
    path: string,
    fallback: string,
    body?: unknown,
    file?: UploadFile | null
): Promise<ApiResult<T>> {
    try {
        const userId = await getCurrentUserId();
        const ctx: ApiContext = { userId, body: body as Record<string, unknown>, file: file ?? null };
        const { status, data } = await handleApi(method, path, ctx);
        if (status < 200 || status >= 300) {
            return { ok: false, status, message: parseErrorMessage(data, fallback) };
        }
        return { ok: true, status, data: data as T };
    } catch (error: unknown) {
        return {
            ok: false,
            status: 500,
            message: error instanceof Error ? error.message : "サーバーに接続できません。",
        };
    }
}

export function apiGet<T>(path: string): Promise<ApiResult<T>> {
    return dispatch<T>("GET", path, "リクエストに失敗しました。");
}

export function apiPost<T = unknown>(path: string, body: unknown): Promise<ApiResult<T>> {
    return dispatch<T>("POST", path, "送信に失敗しました。", body);
}

export function apiPatch<T = unknown>(path: string, body: unknown = {}): Promise<ApiResult<T>> {
    return dispatch<T>("PATCH", path, "更新に失敗しました。", body);
}

export function apiPut<T = unknown>(path: string, body: unknown): Promise<ApiResult<T>> {
    return dispatch<T>("PUT", path, "更新に失敗しました。", body);
}

export function apiDelete<T = unknown>(path: string, body: unknown = {}): Promise<ApiResult<T>> {
    return dispatch<T>("DELETE", path, "削除に失敗しました。", body);
}

/** Convert a browser File (from FormData) into the router's UploadFile shape. */
export async function fileToUpload(file: File): Promise<UploadFile> {
    return { buffer: Buffer.from(await file.arrayBuffer()), mimetype: file.type };
}

/**
 * Drop-in replacement for `fetch(getApiBaseUrl() + path, ...)` used by server
 * actions and the app/api proxy routes. Returns a standard Response so existing
 * `res.ok` / `res.json()` / `res.status` call sites keep working unchanged.
 */
export async function localApiResponse(
    method: string,
    path: string,
    init?: { body?: unknown; file?: UploadFile | null }
): Promise<Response> {
    const userId = await getCurrentUserId();
    const { status, data } = await handleApi(method, path, {
        userId,
        body: init?.body as Record<string, unknown>,
        file: init?.file ?? null,
    });
    return new Response(JSON.stringify(data ?? null), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
