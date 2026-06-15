import { NextResponse } from "next/server";
import { localApiResponse } from "@/lib/api";

export async function GET(
    _request: Request,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await context.params;
        const res = await localApiResponse("GET", `/profiles/${encodeURIComponent(userId)}`);
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            return NextResponse.json(
                { error: data?.error || "プロフィールの取得に失敗しました。" },
                { status: res.status }
            );
        }
        return NextResponse.json(data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "プロフィールの取得に失敗しました。";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
