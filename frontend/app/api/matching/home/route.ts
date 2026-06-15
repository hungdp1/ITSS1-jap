import { NextResponse } from "next/server";
import { localApiResponse } from "@/lib/api";

export async function GET() {
    try {
        const res = await localApiResponse("GET", "/matchings/home");
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            return NextResponse.json(
                { error: data?.error || "マッチングデータの取得に失敗しました。" },
                { status: res.status }
            );
        }
        return NextResponse.json(data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "マッチングデータの取得に失敗しました。";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
