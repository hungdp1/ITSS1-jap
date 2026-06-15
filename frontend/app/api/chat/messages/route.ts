import { NextResponse } from "next/server";
import { localApiResponse, fileToUpload } from "@/lib/api";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get("sessionId");
        const page = searchParams.get("page") ?? "1";
        const limit = searchParams.get("limit") ?? "50";
        if (!sessionId) {
            return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
        }
        const res = await localApiResponse(
            "GET",
            `/chats/${sessionId}/messages?page=${page}&limit=${limit}`
        );
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            return NextResponse.json(
                { error: data?.error || "メッセージの取得に失敗しました。" },
                { status: res.status }
            );
        }
        return NextResponse.json(data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "メッセージの取得に失敗しました。";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const form = await request.formData();
        const sessionId = form.get("sessionId");
        if (typeof sessionId !== "string" || !sessionId) {
            return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
        }
        const content = form.get("content");
        const attachment = form.get("attachment");

        const body: Record<string, unknown> = {};
        if (typeof content === "string" && content.trim()) body.content = content.trim();
        const file =
            attachment instanceof File && attachment.size > 0 ? await fileToUpload(attachment) : null;

        const res = await localApiResponse("POST", `/chats/${sessionId}/messages`, { body, file });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            return NextResponse.json(
                { error: data?.error || "送信に失敗しました。" },
                { status: res.status }
            );
        }
        return NextResponse.json(data, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "送信に失敗しました。";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
