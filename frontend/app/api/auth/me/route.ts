import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";

export async function GET() {
    try {
        const user = await getSessionUser();
        return NextResponse.json({ user });
    } catch (err) {
        console.error("Next.js Route /api/auth/me: error getting session:", err);
        return NextResponse.json({ user: null, error: String(err) }, { status: 500 });
    }
}
