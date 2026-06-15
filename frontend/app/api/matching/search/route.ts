import { NextResponse } from "next/server";
import { localApiResponse } from "@/lib/api";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.toString();
        const res = await localApiResponse("GET", `/matchings/search${query ? `?${query}` : ""}`);
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            return NextResponse.json(
                { error: data?.error || "マッチング候補の取得に失敗しました。" },
                { status: res.status }
            );
        }
        return NextResponse.json(data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "マッチング候補の取得に失敗しました。";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
