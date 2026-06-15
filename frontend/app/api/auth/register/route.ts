import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        const res = await fetch(`${getApiBaseUrl()}/auth/register`, {
            method: "POST",
            body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(
                { success: false, message: data.error || "登録に失敗しました。" },
                { status: res.status }
            );
        }

        return NextResponse.json({
            success: true,
            message: data.message || "登録が完了しました。",
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "サーバーに接続できません。";
        return NextResponse.json({ success: false, message }, { status: 500 });
    }
}
