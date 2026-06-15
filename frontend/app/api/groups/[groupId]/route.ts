import { NextResponse } from "next/server";
import { localApiResponse } from "@/lib/api";

export async function GET(
    _request: Request,
    context: { params: Promise<{ groupId: string }> }
) {
    try {
        const { groupId } = await context.params;
        const res = await localApiResponse(
            "GET",
            `/groups/detail/${encodeURIComponent(groupId)}?page=1&limit=10`
        );
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            return NextResponse.json(
                { error: data?.error || "グループの取得に失敗しました。" },
                { status: res.status }
            );
        }
        return NextResponse.json(data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "グループの取得に失敗しました。";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
