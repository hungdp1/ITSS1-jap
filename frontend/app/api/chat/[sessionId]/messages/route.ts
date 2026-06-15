import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiBaseUrl } from "@/lib/env";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, context: RouteContext) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;

        if (!token) {
            return NextResponse.json({ error: "ログインしてください。" }, { status: 401 });
        }

        const { sessionId } = await context.params;
        const contentType = request.headers.get("content-type") ?? "";

        const headers: HeadersInit = { Authorization: `Bearer ${token}` };
        let body: BodyInit;

        if (contentType.includes("multipart/form-data")) {
            body = await request.formData();
        } else {
            const payload = await request.json().catch(() => null);
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(payload ?? {});
        }

        const res = await fetch(`${getApiBaseUrl()}/chats/${sessionId}/messages`, {
            method: "POST",
            headers,
            body,
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

        return NextResponse.json(data, { status: res.status });
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "送信に失敗しました。";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
