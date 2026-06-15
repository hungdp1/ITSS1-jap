import { NextResponse } from "next/server";
import { localApiResponse, fileToUpload } from "@/lib/api";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, context: RouteContext) {
    try {
        const { sessionId } = await context.params;
        const contentType = request.headers.get("content-type") ?? "";

        let body: Record<string, unknown> = {};
        let file: Awaited<ReturnType<typeof fileToUpload>> | null = null;

        if (contentType.includes("multipart/form-data")) {
            const form = await request.formData();
            const content = form.get("content");
            const attachment = form.get("attachment");
            if (typeof content === "string" && content.trim()) body.content = content.trim();
            if (attachment instanceof File && attachment.size > 0) file = await fileToUpload(attachment);
        } else {
            body = (await request.json().catch(() => ({}))) ?? {};
        }

        const res = await localApiResponse("POST", `/chats/${sessionId}/messages`, { body, file });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            return NextResponse.json(
                { error: data?.error || "送信に失敗しました。" },
                { status: res.status }
            );
        }
        return NextResponse.json(data, { status: res.status });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "送信に失敗しました。";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
