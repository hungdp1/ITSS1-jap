import "server-only";
import { sql } from "@/lib/server/db";
import { getDisplayName, type HandlerResult, type Row } from "./_shared";

export async function getNotifications(userId: number): Promise<HandlerResult> {
    const list = await sql`
        select id, "userId", type, message, related_user_id as "relatedUserId",
               session_id as "sessionId", "isRead", "createdAt"
        from "Notification"
        where "userId" = ${userId}
        order by "createdAt" desc
        limit 50
    `;
    const relatedIds = [
        ...new Set((list as Row[]).map((n) => n.relatedUserId).filter(Boolean) as number[]),
    ];
    const relatedUsers = relatedIds.length
        ? await sql`
            select user_id as "id", first_name as "firstName", last_name as "lastName", avatar_url as "avatarUrl"
            from verified_users where user_id = any(${relatedIds})
          `
        : [];
    const map = new Map<number, Row>();
    for (const u of relatedUsers as Row[]) map.set(Number(u.id), u);

    const data = (list as Row[]).map((n) => {
        const ru = n.relatedUserId ? map.get(Number(n.relatedUserId)) : null;
        return {
            ...n,
            relatedUser: ru
                ? {
                      id: ru.id,
                      name: getDisplayName(ru as { firstName?: string | null; lastName?: string | null }),
                      avatarUrl: ru.avatarUrl,
                  }
                : null,
        };
    });
    return { status: 200, data };
}

export async function markAllRead(userId: number): Promise<HandlerResult> {
    await sql`update "Notification" set "isRead" = true where "userId" = ${userId} and "isRead" = false`;
    return { status: 200, data: { message: "All marked as read" } };
}

export async function deleteAllNotifications(userId: number): Promise<HandlerResult> {
    await sql`delete from "Notification" where "userId" = ${userId}`;
    return { status: 200, data: { message: "All deleted" } };
}

export async function markOneRead(userId: number, id: number): Promise<HandlerResult> {
    const [notif] = await sql`select "userId" from "Notification" where id = ${id}`;
    if (!notif || Number(notif.userId) !== userId) return { status: 403, data: { error: "Forbidden" } };
    await sql`update "Notification" set "isRead" = true where id = ${id}`;
    return { status: 200, data: { message: "Marked as read" } };
}

export async function deleteOneNotification(userId: number, id: number): Promise<HandlerResult> {
    const [notif] = await sql`select "userId" from "Notification" where id = ${id}`;
    if (!notif || Number(notif.userId) !== userId) return { status: 403, data: { error: "Forbidden" } };
    await sql`delete from "Notification" where id = ${id}`;
    return { status: 200, data: { message: "Deleted" } };
}
