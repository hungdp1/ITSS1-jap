import "server-only";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const SECRET = process.env.JWT_SECRET || "local-dev-secret-change-me";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export type TokenPayload = { id: number };

export function signToken(payload: TokenPayload): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN } as any);
}

export function verifyToken(token: string): TokenPayload | null {
    try {
        const decoded = jwt.verify(token, SECRET);
        if (decoded && typeof decoded === "object" && "id" in decoded) {
            return { id: Number((decoded as { id: number }).id) };
        }
        return null;
    } catch {
        return null;
    }
}

export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
}

/** Resolve the current user id from the tomoio_token cookie. Null if unauthenticated. */
export async function getCurrentUserId(): Promise<number | null> {
    const store = await cookies();
    const token = store.get("tomoio_token")?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    return payload?.id ?? null;
}
