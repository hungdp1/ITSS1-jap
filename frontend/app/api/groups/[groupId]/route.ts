import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiBaseUrl } from "@/lib/env";

export async function GET(
    _request: Request,
    context: { params: Promise<{ groupId: string }> }
) {
    try {
        const { groupId } = await context.params;
        const cookieStore = await cookies();
        const token = cookieStore.get("tomoio_token")?.value;

        if (!token) {
            return NextResponse.json({ error: "ログインしてください。" }, { status: 401 });
        }

        const res = await fetch(
            `${getApiBaseUrl()}/groups/detail/${encodeURIComponent(groupId)}?page=1&limit=10`,
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
                    : "グループの取得に失敗しました。";
            return NextResponse.json({ error: message }, { status: res.status });
        }

        return NextResponse.json(data);
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "グループの取得に失敗しました。";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
