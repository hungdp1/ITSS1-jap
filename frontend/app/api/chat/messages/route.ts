import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiBaseUrl } from "@/lib/env";

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;

        if (!token) {
            return NextResponse.json({ error: "ログインしてください。" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get("sessionId");
        const page = searchParams.get("page") ?? "1";
        const limit = searchParams.get("limit") ?? "50";

        if (!sessionId) {
            return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
        }

        const res = await fetch(
            `${getApiBaseUrl()}/chats/${sessionId}/messages?page=${page}&limit=${limit}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            }
        );

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const message =
                data && typeof data === "object" && "error" in data && typeof data.error === "string"
                    ? data.error
                    : "メッセージの取得に失敗しました。";
            return NextResponse.json({ error: message }, { status: res.status });
        }

        return NextResponse.json(data);
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "メッセージの取得に失敗しました。";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;

        if (!token) {
            return NextResponse.json({ error: "ログインしてください。" }, { status: 401 });
        }

        const incoming = await request.formData();
        const sessionId = incoming.get("sessionId");

        if (typeof sessionId !== "string" || !sessionId) {
            return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
        }

        const outgoing = new FormData();
        const content = incoming.get("content");
        const attachment = incoming.get("attachment");

        if (typeof content === "string" && content.trim()) {
            outgoing.append("content", content.trim());
        }

        if (attachment instanceof File) {
            outgoing.append("attachment", attachment);
        }

        const res = await fetch(`${getApiBaseUrl()}/chats/${sessionId}/messages`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: outgoing,
            cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const message =
                data && typeof data === "object" && "error" in data && typeof data.error === "string"
                    ? data.error
                    : "送信に失敗しました。";
            return NextResponse.json({ error: message }, { status: res.status });
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "送信に失敗しました。";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
