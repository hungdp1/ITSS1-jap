import { NextResponse } from "next/server";

export function POST() {
    const response = NextResponse.json({ success: true });
    response.cookies.delete("tomoio_token");
    response.cookies.delete("tomoio_user");
    return response;
}
