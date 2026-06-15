import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api";
import { toSessionUser, AUTH_COOKIE_OPTIONS } from "@/lib/auth-session";

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        data.error ||
                        data.message ||
                        "ログインに失敗しました。メールアドレスまたはパスワードが正しくありません。",
                },
                { status: res.status }
            );
        }

        const { token, user } = data;
        const sessionUser = toSessionUser(user);

        const response = NextResponse.json({ success: true, user: sessionUser });
        response.cookies.set("tomoio_token", token, AUTH_COOKIE_OPTIONS);
        response.cookies.set("tomoio_user", JSON.stringify(sessionUser), AUTH_COOKIE_OPTIONS);

        return response;
    } catch (error: unknown) {
        console.error("Next.js Login Route: caught exception:", error);
        const message = error instanceof Error ? error.message : "ログインに失敗しました。";
        return NextResponse.json({ success: false, message }, { status: 500 });
    }
}
