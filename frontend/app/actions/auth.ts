"use server";

import { getApiBaseUrl } from "@/lib/api";
import { clearAuthCookies, getSessionUser, setAuthCookies } from "@/lib/auth-session";

/** @deprecated Prefer POST /api/auth/login from client components */
export async function loginAction(email: string, password: string) {
    try {
        const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            return {
                success: false,
                message:
                    data.message ||
                    "ログインに失敗しました。メールアドレスまたはパスワードが正しくありません。",
            };
        }

        const { token, user } = data;
        await setAuthCookies(token, user);

        return { success: true, user };
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "ログインに失敗しました。メールアドレスまたはパスワードが正しくありません。";
        return { success: false, message };
    }
}

/** @deprecated Prefer POST /api/auth/register from client components */
export async function registerAction(formData: FormData) {
    try {
        const res = await fetch(`${getApiBaseUrl()}/auth/register`, {
            method: "POST",
            body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
            return { success: false, message: data.error || "登録に失敗しました。" };
        }

        return { success: true, message: data.message || "登録が完了しました。" };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "サーバーに接続できません。";
        return { success: false, message };
    }
}

export async function logOutAction() {
    await clearAuthCookies();
    return { success: true };
}

export async function getUserAction() {
    return getSessionUser();
}
