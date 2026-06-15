import "server-only";
import { sql } from "@/lib/server/db";
import { broadcast } from "@/lib/server/realtime";
import { translateText, looksJapanese } from "@/lib/server/translate";
import {
    assertChatNotBlocked,
    createNotification,
    loadBlockStatusMap,
    HttpError,
    getDisplayName,
    type HandlerResult,
    type Row,
} from "./_shared";

const CHAT_SESSION_LIMIT = 80;

const MESSAGE_COLS = sql`
    m.message_id as "id", m.session_id as "sessionId", m.sender_id as "senderId",
    m.content, m.send_at as "sendAt", m.message_type as "messageType",
    m.attachment_url as "attachmentUrl", m.is_seen as "isSeen",
    m.translated_text as "translatedText", m.edited_at as "editedAt"
`;

async function loadMessageById(messageId: number): Promise<Row | null> {
    const [row] = await sql`
        select ${MESSAGE_COLS},
               json_build_object('id', u.user_id, 'firstName', u.first_name,
                   'lastName', u.last_name, 'avatarUrl', u.avatar_url) as sender
        from messages m join verified_users u on u.user_id = m.sender_id
        where m.message_id = ${messageId}
    `;
    return row ?? null;
}

async function isParticipant(sessionId: number, userId: number): Promise<boolean> {
    const [row] = await sql`
        select 1 from match_participants where session_id = ${sessionId} and user_id = ${userId}
    `;
    return Boolean(row);
}

async function loadChatsForUser(userId: number) {
    const sessions = await sql`
        select ms.session_id as "id", ms.created_at as "createdAt",
               u.user_id as "targetId", u.first_name as "firstName", u.last_name as "lastName",
               u.avatar_url as "avatarUrl", u.status
        from match_participants mp
        join match_session ms on ms.session_id = mp.session_id
        join match_participants mp2 on mp2.session_id = ms.session_id and mp2.user_id <> ${userId}
        join verified_users u on u.user_id = mp2.user_id
        where mp.user_id = ${userId}
        order by ms.created_at desc
        limit ${CHAT_SESSION_LIMIT}
    `;
    if (sessions.length === 0) return [];

    const sessionIds = sessions.map((s) => Number(s.id));

    const [lastMessages, unread] = await Promise.all([
        sql`
            select distinct on (m.session_id) ${MESSAGE_COLS},
                   json_build_object('id', u.user_id, 'firstName', u.first_name) as sender
            from messages m join verified_users u on u.user_id = m.sender_id
            where m.session_id = any(${sessionIds}) and m.deleted_at is null
            order by m.session_id, m.send_at desc
        `,
        sql`
            select session_id as "sessionId", count(*)::int as cnt
            from messages
            where session_id = any(${sessionIds}) and sender_id <> ${userId}
              and is_seen = false and deleted_at is null
            group by session_id
        `,
    ]);

    const lastBySession = new Map<number, Row>();
    for (const m of lastMessages) lastBySession.set(Number(m.sessionId), m);
    const unreadMap = new Map<number, number>();
    for (const u of unread) unreadMap.set(Number(u.sessionId), Number(u.cnt));

    const targetIds = sessions.map((s) => Number(s.targetId));
    const blockMap = await loadBlockStatusMap(userId, targetIds);

    const chats = sessions.map((s) => ({
        id: Number(s.id),
        createdAt: s.createdAt,
        targetUser: {
            id: Number(s.targetId),
            firstName: s.firstName,
            lastName: s.lastName,
            avatarUrl: s.avatarUrl,
            status: s.status,
            isOnline: false,
        },
        lastMessage: lastBySession.get(Number(s.id)) ?? null,
        unreadCount: unreadMap.get(Number(s.id)) ?? 0,
        blockStatus: blockMap.get(Number(s.targetId)) ?? { blockedByMe: false, blockedByThem: false },
    }));

    chats.sort((a, b) => {
        const at = (a.lastMessage?.sendAt as string) ?? (a.createdAt as string);
        const bt = (b.lastMessage?.sendAt as string) ?? (b.createdAt as string);
        return new Date(bt).getTime() - new Date(at).getTime();
    });

    return chats;
}

function markSessionMessagesSeen(userId: number, sessionId: number): void {
    void (async () => {
        try {
            await sql`
                update messages set is_seen = true
                where session_id = ${sessionId} and sender_id <> ${userId}
                  and is_seen = false and deleted_at is null
            `;
            await broadcast(`session:${sessionId}`, "seen", { sessionId, userId });
        } catch (err) {
            console.error("[markSessionMessagesSeen]", err);
        }
    })();
}

async function loadMessagesForSession(
    userId: number,
    sessionId: number,
    page: number,
    limit: number
): Promise<Row[] | null> {
    if (!(await isParticipant(sessionId, userId))) return null;
    const messages = await sql`
        select ${MESSAGE_COLS},
               json_build_object('id', u.user_id, 'firstName', u.first_name,
                   'lastName', u.last_name, 'avatarUrl', u.avatar_url) as sender
        from messages m join verified_users u on u.user_id = m.sender_id
        where m.session_id = ${sessionId} and m.deleted_at is null
        order by m.send_at desc
        offset ${(page - 1) * limit} limit ${limit}
    `;
    if (page === 1) markSessionMessagesSeen(userId, sessionId);
    return (messages as Row[]).reverse();
}

function scheduleTranslation(messageId: number, sessionId: number, content: string): void {
    void (async () => {
        try {
            const target = looksJapanese(content) ? "vi" : "ja";
            const translated = await translateText(content.trim(), target);
            if (!translated) return;
            const translatedText = { [target]: translated };
            await sql`
                update messages set translated_text = ${sql.json(translatedText)}
                where message_id = ${messageId}
            `;
            await broadcast(`session:${sessionId}`, "message_updated", {
                kind: "translated",
                messageId,
                translatedText,
            });
        } catch (err) {
            console.error("[scheduleTranslation]", err);
        }
    })();
}

export async function getChats(userId: number): Promise<HandlerResult> {
    return { status: 200, data: await loadChatsForUser(userId) };
}

export async function getInbox(userId: number, query: URLSearchParams): Promise<HandlerResult> {
    const preferredSessionId = query.get("sessionId") ? Number(query.get("sessionId")) : null;
    const includeMessages = query.get("includeMessages") !== "false";
    const messageLimit = Math.min(Math.max(Number(query.get("messagesLimit") || 50), 1), 100);

    const chats = await loadChatsForUser(userId);

    if (!includeMessages) {
        const activeSessionId =
            preferredSessionId && chats.some((c) => c.id === preferredSessionId)
                ? preferredSessionId
                : (chats[0]?.id ?? null);
        return { status: 200, data: { chats, messages: [], activeSessionId } };
    }

    let activeSessionId =
        preferredSessionId && chats.some((c) => c.id === preferredSessionId)
            ? preferredSessionId
            : (chats[0]?.id ?? null);

    let messages: Row[] = [];
    if (activeSessionId) {
        const loaded = await loadMessagesForSession(userId, activeSessionId, 1, messageLimit);
        if (loaded) messages = loaded;
        else activeSessionId = chats[0]?.id ?? null;
    }

    return { status: 200, data: { chats, messages, activeSessionId } };
}

export async function getMessages(
    userId: number,
    sessionId: number,
    query: URLSearchParams
): Promise<HandlerResult> {
    const page = Math.max(Number(query.get("page") || 1), 1);
    const limit = Math.max(Number(query.get("limit") || 20), 1);
    const messages = await loadMessagesForSession(userId, sessionId, page, limit);
    if (messages === null) return { status: 403, data: { error: "Access denied" } };
    return { status: 200, data: messages };
}

export async function sendMessage(
    userId: number,
    sessionId: number,
    body: { content?: string; messageType?: string; attachmentUrl?: string | null },
    file?: { buffer: Buffer; mimetype: string; uploadedUrl?: string } | null
): Promise<HandlerResult> {
    let content = typeof body.content === "string" ? body.content.trim() : "";
    let attachmentUrl = body.attachmentUrl || null;
    let messageType = body.messageType || "TEXT";

    if (file?.uploadedUrl) {
        attachmentUrl = file.uploadedUrl;
        messageType = file.mimetype.startsWith("image/") ? "IMAGE" : "FILE";
    }

    if (!content && !attachmentUrl) {
        return { status: 400, data: { error: "Tin nhắn không được trống" } };
    }

    if (!(await isParticipant(sessionId, userId))) {
        return { status: 403, data: { error: "Access denied" } };
    }

    const [receiver] = await sql`
        select user_id as "userId" from match_participants
        where session_id = ${sessionId} and user_id <> ${userId} limit 1
    `;

    if (receiver) {
        try {
            await assertChatNotBlocked(userId, Number(receiver.userId));
        } catch (err) {
            if (err instanceof HttpError) {
                return { status: err.status, data: { error: err.message, code: err.code } };
            }
            throw err;
        }
    }

    const [inserted] = await sql`
        insert into messages (session_id, sender_id, content, message_type, attachment_url)
        values (${sessionId}, ${userId}, ${content || null}, ${messageType}, ${attachmentUrl})
        returning message_id as "id"
    `;
    const message = await loadMessageById(Number(inserted.id));

    await broadcast(`session:${sessionId}`, "new_message", message);

    // Background: notification + translation (best-effort, don't block the response).
    void (async () => {
        try {
            const [me] = await sql`select first_name as "firstName" from verified_users where user_id = ${userId}`;
            const senderName = getDisplayName(me as { firstName?: string | null });
            if (receiver) {
                await createNotification({
                    userId: Number(receiver.userId),
                    type: "NEW_MESSAGE",
                    message: content ? `${senderName}: ${content}` : `${senderName} đã gửi một tệp`,
                    relatedUserId: userId,
                    sessionId,
                });
            }
            if (content) scheduleTranslation(Number(inserted.id), sessionId, content);
        } catch (err) {
            console.error("[sendMessage background]", err);
        }
    })();

    return { status: 201, data: message };
}

export async function editMessage(
    userId: number,
    sessionId: number,
    messageId: number,
    body: { content?: string }
): Promise<HandlerResult> {
    const content = body.content?.trim();
    if (!content) return { status: 400, data: { error: "Nội dung không được trống" } };

    const [message] = await sql`
        select session_id as "sessionId", sender_id as "senderId", deleted_at as "deletedAt",
               message_type as "messageType" from messages where message_id = ${messageId}
    `;
    if (!message) return { status: 404, data: { error: "Tin nhắn không tồn tại" } };
    if (Number(message.sessionId) !== sessionId)
        return { status: 403, data: { error: "Message không thuộc session này" } };
    if (Number(message.senderId) !== userId)
        return { status: 403, data: { error: "Không có quyền sửa tin nhắn này" } };
    if (message.deletedAt) return { status: 400, data: { error: "Không thể sửa tin nhắn đã xoá" } };
    if (message.messageType !== "TEXT")
        return { status: 400, data: { error: "Chỉ có thể sửa tin nhắn text" } };

    await sql`
        update messages set content = ${content}, translated_text = null, edited_at = now()
        where message_id = ${messageId}
    `;
    const updated = await loadMessageById(messageId);
    await broadcast(`session:${sessionId}`, "message_updated", {
        kind: "edited",
        messageId,
        content,
        editedAt: (updated?.editedAt as string) ?? new Date().toISOString(),
    });
    scheduleTranslation(messageId, sessionId, content);
    return { status: 200, data: updated };
}

export async function deleteMessage(
    userId: number,
    sessionId: number,
    messageId: number
): Promise<HandlerResult> {
    const [message] = await sql`
        select session_id as "sessionId", sender_id as "senderId", deleted_at as "deletedAt"
        from messages where message_id = ${messageId}
    `;
    if (!message) return { status: 404, data: { error: "Tin nhắn không tồn tại" } };
    if (Number(message.sessionId) !== sessionId)
        return { status: 403, data: { error: "Message không thuộc session này" } };
    if (Number(message.senderId) !== userId)
        return { status: 403, data: { error: "Không có quyền xoá tin nhắn này" } };
    if (message.deletedAt) return { status: 400, data: { error: "Tin nhắn đã bị xoá" } };

    await sql`update messages set deleted_at = now(), content = null where message_id = ${messageId}`;
    await broadcast(`session:${sessionId}`, "message_updated", { kind: "deleted", messageId });
    return { status: 200, data: { message: "Đã xoá tin nhắn" } };
}
