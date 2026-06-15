import { NextResponse } from "next/server";
import { localApiResponse, fileToUpload } from "@/lib/api";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const cccd = formData.get("cccd");
        const res = await localApiResponse("POST", "/auth/register", {
            body: {
                email: formData.get("email"),
                password: formData.get("password"),
                language: formData.get("language"),
                purpose: formData.get("purpose"),
            },
            file: cccd instanceof File && cccd.size > 0 ? await fileToUpload(cccd) : null,
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
