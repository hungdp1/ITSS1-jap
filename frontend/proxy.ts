import type { NextRequest } from "next/server";
import { runAuthGuard } from "@/lib/auth-guard";

export function proxy(request: NextRequest) {
    return runAuthGuard(request);
}

export const config = {
    matcher: [
        "/community",
        "/community/:path*",
        "/chat",
        "/chat/:path*",
        "/matching",
        "/matching/:path*",
        "/events",
        "/events/:path*",
        "/profile",
        "/profile/:path*",
        "/login",
        "/register",
    ],
};
