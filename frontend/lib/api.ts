import { cookies } from "next/headers";
import { getApiBaseUrl } from "@/lib/env";

export { getApiBaseUrl, getSocketBaseUrl } from "@/lib/env";

type ApiError = {
    ok: false;
    message: string;
    status: number;
};

type ApiSuccess<T> = {
    ok: true;
    data: T;
    status: number;
};

export type ApiResult<T> = ApiSuccess<T> | ApiError;

async function getAuthHeaders(): Promise<HeadersInit> {
    const cookieStore = await cookies();
    const token = cookieStore.get("tomoio_token")?.value;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
}

function parseErrorMessage(data: unknown, fallback: string): string {
    if (data && typeof data === "object") {
        const record = data as Record<string, unknown>;
        if (typeof record.message === "string") return record.message;
        if (typeof record.error === "string") return record.error;
    }
    return fallback;
}

export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
    try {
        const res = await fetch(`${getApiBaseUrl()}${path}`, {
            method: "GET",
            headers: await getAuthHeaders(),
            cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            return {
                ok: false,
                status: res.status,
                message: parseErrorMessage(data, "リクエストに失敗しました。"),
            };
        }

        return { ok: true, status: res.status, data: data as T };
    } catch (error: unknown) {
        return {
            ok: false,
            status: 500,
            message: error instanceof Error ? error.message : "サーバーに接続できません。",
        };
    }
}

export async function apiPost<T = unknown>(
    path: string,
    body: unknown
): Promise<ApiResult<T>> {
    try {
        const res = await fetch(`${getApiBaseUrl()}${path}`, {
            method: "POST",
            headers: await getAuthHeaders(),
            body: JSON.stringify(body),
            cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            return {
                ok: false,
                status: res.status,
                message: parseErrorMessage(data, "送信に失敗しました。"),
            };
        }

        return { ok: true, status: res.status, data: data as T };
    } catch (error: unknown) {
        return {
            ok: false,
            status: 500,
            message: error instanceof Error ? error.message : "サーバーに接続できません。",
        };
    }
}

export async function apiPatch<T = unknown>(
    path: string,
    body: unknown = {}
): Promise<ApiResult<T>> {
    try {
        const res = await fetch(`${getApiBaseUrl()}${path}`, {
            method: "PATCH",
            headers: await getAuthHeaders(),
            body: JSON.stringify(body),
            cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            return {
                ok: false,
                status: res.status,
                message: parseErrorMessage(data, "更新に失敗しました。"),
            };
        }

        return { ok: true, status: res.status, data: data as T };
    } catch (error: unknown) {
        return {
            ok: false,
            status: 500,
            message: error instanceof Error ? error.message : "サーバーに接続できません。",
        };
    }
}

export async function apiPut<T = unknown>(
    path: string,
    body: unknown
): Promise<ApiResult<T>> {
    try {
        const res = await fetch(`${getApiBaseUrl()}${path}`, {
            method: "PUT",
            headers: await getAuthHeaders(),
            body: JSON.stringify(body),
            cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            return {
                ok: false,
                status: res.status,
                message: parseErrorMessage(data, "更新に失敗しました。"),
            };
        }

        return { ok: true, status: res.status, data: data as T };
    } catch (error: unknown) {
        return {
            ok: false,
            status: 500,
            message: error instanceof Error ? error.message : "サーバーに接続できません。",
        };
    }
}
