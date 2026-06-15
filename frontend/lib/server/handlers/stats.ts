import "server-only";
import { sql } from "@/lib/server/db";
import type { HandlerResult, Row } from "./_shared";

export async function getPublicStats(): Promise<HandlerResult> {
    const [[count], recent] = await Promise.all([
        sql`select count(*)::int as cnt from verified_users where status = 'VERIFIED'`,
        sql`select avatar_url as "avatarUrl" from verified_users
            where status = 'VERIFIED' and avatar_url is not null
            order by created_at desc limit 3`,
    ]);
    return {
        status: 200,
        data: {
            activeUserCount: Number(count.cnt),
            recentAvatars: (recent as Row[])
                .map((u) => u.avatarUrl)
                .filter((u): u is string => typeof u === "string" && u.trim().length > 0),
        },
    };
}
