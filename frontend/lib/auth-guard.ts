import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/community", "/chat", "/matching", "/events", "/profile"];
const AUTH_PATHS = ["/login", "/register"];

function hasValidSession(request: NextRequest): boolean {
    const token = request.cookies.get("tomoio_token")?.value;
    const userCookie = request.cookies.get("tomoio_user")?.value;
    if (!token || !userCookie) return false;

    try {
        const user = JSON.parse(userCookie);
        return Boolean(user?.id);
    } catch {
        return false;
    }
}

function clearAuthCookies(response: NextResponse) {
    response.cookies.delete("tomoio_token");
    response.cookies.delete("tomoio_user");
}

export function runAuthGuard(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isAuthenticated = hasValidSession(request);

    const isProtectedPath = PROTECTED_PATHS.some((path) => pathname.startsWith(path));
    if (isProtectedPath && !isAuthenticated) {
        const response = NextResponse.redirect(new URL("/login", request.url));
        clearAuthCookies(response);
        return response;
    }

    const isAuthPath = AUTH_PATHS.some((path) => pathname.startsWith(path));
    if (isAuthPath && !isAuthenticated) {
        const hasOrphanCookies =
            request.cookies.has("tomoio_token") || request.cookies.has("tomoio_user");
        if (hasOrphanCookies) {
            const response = NextResponse.next();
            clearAuthCookies(response);
            return response;
        }
    }

    return NextResponse.next();
}
