import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";

export const AUTH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
};

export type SessionUser = {
    id: number;
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
    status?: string;
};

/** Keep cookie payload small — full Prisma user can exceed browser limits in production. */
export function toSessionUser(user: Record<string, unknown>): SessionUser {
    return {
        id: Number(user.id),
        email: typeof user.email === "string" ? user.email : undefined,
        firstName: typeof user.firstName === "string" ? user.firstName : null,
        lastName: typeof user.lastName === "string" ? user.lastName : null,
        avatarUrl: typeof user.avatarUrl === "string" ? user.avatarUrl : null,
        status: typeof user.status === "string" ? user.status : undefined,
    };
}

export function applyAuthCookies(
    response: NextResponse,
    token: string,
    user: Record<string, unknown>
) {
    const sessionUser = toSessionUser(user);
    response.cookies.set("tomoio_token", token, AUTH_COOKIE_OPTIONS);
    response.cookies.set("tomoio_user", JSON.stringify(sessionUser), AUTH_COOKIE_OPTIONS);
    return response;
}

export async function setAuthCookies(token: string, user: object) {
    const cookieStore = await cookies();
    const sessionUser = toSessionUser(user as Record<string, unknown>);
    cookieStore.set("tomoio_token", token, AUTH_COOKIE_OPTIONS);
    cookieStore.set("tomoio_user", JSON.stringify(sessionUser), AUTH_COOKIE_OPTIONS);
}

export async function clearAuthCookies() {
    const cookieStore = await cookies();
    cookieStore.delete("tomoio_token");
    cookieStore.delete("tomoio_user");
}

export async function getSessionUser() {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("tomoio_user");
    if (!userCookie?.value) return null;
    try {
        return JSON.parse(userCookie.value);
    } catch {
        return null;
    }
}
