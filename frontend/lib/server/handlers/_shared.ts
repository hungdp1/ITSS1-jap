import "server-only";
import { sql } from "@/lib/server/db";
import { broadcast } from "@/lib/server/realtime";

export type Row = Record<string, unknown>;
export type HandlerResult = { status: number; data: unknown };

export const MIN_SEARCH_LENGTH = 2;

export function normalizeSearchQuery(search?: string | null): string | null {
    const trimmed = typeof search === "string" ? search.trim() : "";
    if (!trimmed || trimmed.length < MIN_SEARCH_LENGTH) return null;
    return trimmed;
}

export function splitPurposeValues(purpose?: string | null): string[] {
    if (!purpose || typeof purpose !== "string") return [];
    return purpose
        .split(/[,、]/)
        .map((s) => s.trim())
        .filter(Boolean);
}

export function getDisplayName(user: {
    firstName?: string | null;
    lastName?: string | null;
}): string {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return name || "ユーザー";
}

export function calculateAge(dateOfBirth?: string | Date | null): number | null {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age -= 1;
    }
    return age;
}

// ---------------- Notifications ----------------

export async function createNotification(opts: {
    userId: number;
    type: string;
    message: string;
    relatedUserId?: number | null;
    sessionId?: number | null;
}): Promise<Row> {
    const [row] = await sql`
        insert into "Notification" ("userId", type, message, related_user_id, session_id)
        values (${opts.userId}, ${opts.type}, ${opts.message}, ${opts.relatedUserId ?? null}, ${opts.sessionId ?? null})
        returning id, "userId", type, message, related_user_id as "relatedUserId",
                  session_id as "sessionId", "isRead", "createdAt"
    `;

    let relatedUser: Row | null = null;
    if (opts.relatedUserId) {
        const [u] = await sql`
            select user_id as "id", first_name as "firstName", last_name as "lastName", avatar_url as "avatarUrl"
            from verified_users where user_id = ${opts.relatedUserId}
        `;
        if (u) {
            relatedUser = {
                id: u.id,
                name: getDisplayName(u as { firstName?: string | null; lastName?: string | null }),
                avatarUrl: u.avatarUrl,
            };
        }
    }

    await broadcast(`notify:${opts.userId}`, "notification", { ...row, relatedUser });
    return row;
}

// ---------------- Match sessions ----------------

export async function findMatchSessionId(
    userId: number,
    targetUserId: number
): Promise<number | null> {
    const [row] = await sql`
        select mp.session_id as "id"
        from match_participants mp
        join match_participants mp2
          on mp2.session_id = mp.session_id and mp2.user_id = ${targetUserId}
        where mp.user_id = ${userId}
        limit 1
    `;
    return row ? Number(row.id) : null;
}

export async function getOrCreateMatchSession(
    userId: number,
    targetUserId: number
): Promise<{ id: number; participants: { userId: number }[] }> {
    const existingId = await findMatchSessionId(userId, targetUserId);
    if (existingId) {
        return {
            id: existingId,
            participants: [{ userId }, { userId: targetUserId }],
        };
    }
    const [session] = await sql`
        insert into match_session (status) values ('ACTIVE')
        returning session_id as "id"
    `;
    const sid = Number(session.id);
    await sql`
        insert into match_participants (session_id, user_id)
        values (${sid}, ${userId}), (${sid}, ${targetUserId})
    `;
    return { id: sid, participants: [{ userId }, { userId: targetUserId }] };
}

export async function hasMutualLike(
    userId: number,
    targetUserId: number
): Promise<boolean> {
    const rows = await sql`
        select 1 from user_profile_actions
        where action = 'LIKE'
          and ((actor_id = ${userId} and target_id = ${targetUserId})
            or (actor_id = ${targetUserId} and target_id = ${userId}))
    `;
    return rows.length >= 2;
}

// ---------------- Block helpers ----------------

export type BlockStatus = { blockedByMe: boolean; blockedByThem: boolean };

export function formatBlockStatus(
    block: { actorId: number; targetId: number } | null,
    viewerId: number
): BlockStatus {
    if (!block) return { blockedByMe: false, blockedByThem: false };
    return {
        blockedByMe: block.actorId === viewerId,
        blockedByThem: block.targetId === viewerId,
    };
}

export async function loadBlockStatusMap(
    viewerId: number,
    targetUserIds: number[]
): Promise<Map<number, BlockStatus>> {
    const uniqueIds = [...new Set(targetUserIds.filter(Boolean))];
    const map = new Map<number, BlockStatus>();
    if (uniqueIds.length === 0) return map;

    const rows = await sql`
        select actor_id as "actorId", target_id as "targetId"
        from user_profile_actions
        where action = 'BLOCK'
          and ((actor_id = ${viewerId} and target_id = any(${uniqueIds}))
            or (actor_id = any(${uniqueIds}) and target_id = ${viewerId}))
    `;
    for (const row of rows as unknown as { actorId: number; targetId: number }[]) {
        const otherId = row.actorId === viewerId ? row.targetId : row.actorId;
        map.set(otherId, formatBlockStatus(row, viewerId));
    }
    return map;
}

export async function getBlockStatusBetween(
    viewerId: number,
    otherUserId: number
): Promise<BlockStatus> {
    const [block] = await sql`
        select actor_id as "actorId", target_id as "targetId"
        from user_profile_actions
        where action = 'BLOCK'
          and ((actor_id = ${viewerId} and target_id = ${otherUserId})
            or (actor_id = ${otherUserId} and target_id = ${viewerId}))
        limit 1
    `;
    return formatBlockStatus(
        (block as { actorId: number; targetId: number }) || null,
        viewerId
    );
}

export class HttpError extends Error {
    status: number;
    code?: string;
    constructor(status: number, message: string, code?: string) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

export async function assertChatNotBlocked(
    senderId: number,
    receiverId: number
): Promise<void> {
    const [block] = await sql`
        select actor_id as "actorId", target_id as "targetId"
        from user_profile_actions
        where action = 'BLOCK'
          and ((actor_id = ${senderId} and target_id = ${receiverId})
            or (actor_id = ${receiverId} and target_id = ${senderId}))
        limit 1
    `;
    if (!block) return;
    const b = block as { actorId: number };
    throw new HttpError(
        403,
        b.actorId === senderId
            ? "このユーザーをブロックしています。メッセージを送信するにはブロックを解除してください。"
            : "相手にブロックされました。メッセージを送信できません。",
        "CHAT_BLOCKED"
    );
}

// ---------------- Profile formatting ----------------

function getProficiencyPercent(lang: { type?: string | null; language: string; level?: string | null }): number {
    if (isNativeLanguageEntry(lang)) return 95;
    const level = (lang.level || "").toUpperCase();
    if (level === "N1") return 95;
    if (level === "N2") return 85;
    if (level === "N3") return 60;
    if (level === "N4" || level === "N5") return 40;
    return 50;
}

function isNativeLanguageEntry(lang: { type?: string | null; language: string }): boolean {
    if (lang.type === "native") return true;
    if (lang.type === "learning") return false;
    return lang.language === "日本" || lang.language === "ベトナム";
}

function formatLanguageEntry(lang: { type?: string | null; language: string; level?: string | null }) {
    const isNative = isNativeLanguageEntry(lang);
    const levelText = isNative
        ? "ネイティブ"
        : lang.level
          ? `学習中 (${lang.level}相当)`
          : "学習中";
    return {
        name: lang.language,
        levelText,
        levelType: isNative ? "native" : "learning",
        jlptLevel: lang.level ?? null,
        type: lang.type ?? (isNative ? "native" : "learning"),
        level: lang.level ?? null,
        proficiency: getProficiencyPercent(lang),
    };
}

function getPurposeEmoji(purpose: string): string {
    const text = purpose.toLowerCase();
    if (text.includes("言語") || text.includes("学習")) return "🌐";
    if (text.includes("文化")) return "🏮";
    if (text.includes("友")) return "👋";
    if (text.includes("ビジネス")) return "💼";
    return "✨";
}

function getHobbyIcon(hobbyName: string): string {
    const map: Record<string, string> = {
        デジタルアート: "🎨",
        ベトナム料理: "🍜",
        バックパッカー: "✈️",
        語源学: "📖",
        アニメ: "🎬",
        料理: "🍳",
        プログラミング: "💻",
        歴史: "📜",
        写真: "📷",
    };
    return map[hobbyName] || "✨";
}

async function getMutualFriendsCount(viewerId: number, targetId: number): Promise<number> {
    const [row] = await sql`
        with shared as (
            select gm.group_id from group_members gm
            where gm.user_id = ${viewerId}
            intersect
            select gm.group_id from group_members gm
            where gm.user_id = ${targetId}
        )
        select count(distinct gm.user_id)::int as cnt
        from group_members gm
        where gm.group_id in (select group_id from shared)
          and gm.user_id not in (${viewerId}, ${targetId})
    `;
    return row ? Number(row.cnt) : 0;
}

async function getUpcomingEvent(userId: number) {
    const rows = await sql`
        select e.event_id as "id", e.title, e.event_time as "eventTime"
        from event_engagements ee
        join events e on e.event_id = ee.event_id
        where ee.user_id = ${userId} and e.event_time > now()
        order by e.event_time asc
        limit 1
    `;
    const event = rows[0] as { id: number; title: string; eventTime: string } | undefined;
    if (!event) return null;
    const eventDate = new Date(event.eventTime);
    return {
        id: event.id,
        title: event.title,
        dateLabel: `${eventDate.getMonth() + 1}/${eventDate.getDate()}`,
        timeLabel: eventDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
        statusLabel: "参加予定",
    };
}

async function getViewerInteraction(viewerId: number | null, targetId: number) {
    if (!viewerId || !targetId) {
        return { isLiked: false, hasPassed: false, isMutualMatch: false, chatSessionId: null };
    }
    const actions = await sql`
        select action from user_profile_actions
        where actor_id = ${viewerId} and target_id = ${targetId} and action in ('LIKE','PASS')
    `;
    const set = new Set((actions as unknown as { action: string }[]).map((a) => a.action));
    const isLiked = set.has("LIKE");
    const hasPassed = set.has("PASS");
    const [isMutualMatch, chatSessionId] = await Promise.all([
        isLiked ? hasMutualLike(viewerId, targetId) : Promise.resolve(false),
        findMatchSessionId(viewerId, targetId),
    ]);
    return { isLiked, hasPassed, isMutualMatch, chatSessionId };
}

/** Load a fully-formatted profile object for `targetId`, as seen by `viewerId`. */
export async function formatProfile(
    targetId: number,
    viewerId: number | null,
    viewType: "own" | "other"
): Promise<Row | null> {
    const [user] = await sql`
        select user_id as "id", email, first_name as "firstName", last_name as "lastName",
               date_of_birth as "dateOfBirth", location, bio, avatar_url as "avatarUrl",
               created_at as "createdAt", status
        from verified_users where user_id = ${targetId}
    `;
    if (!user) return null;

    const [hobbies, languages, purposes, photos, postImages, commentImages, kyc] =
        await Promise.all([
            sql`select hobby_name as "hobbyName" from user_hobbies where user_id = ${targetId}`,
            sql`select language, type, level from user_languages where user_id = ${targetId}`,
            sql`select purpose from user_purposes where user_id = ${targetId}`,
            sql`select id, url, "isMain" from user_photos where user_id = ${targetId}`,
            sql`select image from posts where author_id = ${targetId} and image is not null order by created_at desc limit 12`,
            sql`select p.image from comments c join posts p on p.post_id = c.post_id where c.author_id = ${targetId} and p.image is not null order by c.created_at desc limit 12`,
            sql`select 1 from kyc_requests where user_id = ${targetId} and status = 'APPROVED' limit 1`,
        ]);

    const [mutualFriendsCount, upcomingEvent, interaction] = await Promise.all([
        viewType === "other" && viewerId ? getMutualFriendsCount(viewerId, targetId) : Promise.resolve(0),
        viewType === "other" ? getUpcomingEvent(targetId) : Promise.resolve(null),
        viewType === "other" && viewerId
            ? getViewerInteraction(viewerId, targetId)
            : Promise.resolve({ isLiked: false, hasPassed: false, isMutualMatch: false, chatSessionId: null }),
    ]);

    const gallery: string[] = [];
    if (user.avatarUrl) gallery.push(user.avatarUrl as string);
    for (const p of photos as unknown as { url: string }[]) {
        if (p.url && !gallery.includes(p.url)) gallery.push(p.url);
    }
    for (const p of postImages as unknown as { image: string }[]) {
        if (p.image && !gallery.includes(p.image)) gallery.push(p.image);
    }
    for (const c of commentImages as unknown as { image: string }[]) {
        if (c.image && !gallery.includes(c.image)) gallery.push(c.image);
    }
    if (gallery.length === 0) gallery.push("/assets/images/avatars/avatar.jpg");

    const purposeLabels: string[] = [];
    const seen = new Set<string>();
    for (const entry of purposes as unknown as { purpose: string }[]) {
        for (const label of splitPurposeValues(entry.purpose)) {
            if (seen.has(label)) continue;
            seen.add(label);
            purposeLabels.push(label);
        }
    }

    return {
        id: user.id,
        name: getDisplayName(user as { firstName?: string | null; lastName?: string | null }),
        firstName: user.firstName,
        lastName: user.lastName,
        age: calculateAge(user.dateOfBirth as string | null),
        location: user.location || "—",
        bio: user.bio || "",
        avatarUrl: user.avatarUrl || gallery[0],
        gallery,
        isVerified: (kyc as unknown[]).length > 0,
        isOnline: false,
        mutualFriendsCount,
        purposes: purposeLabels.map((label) => ({ label, emoji: getPurposeEmoji(label) })),
        languages: (languages as unknown as { language: string; type: string | null; level: string | null }[]).map(formatLanguageEntry),
        interests: (hobbies as unknown as { hobbyName: string }[]).map((h) => ({
            name: h.hobbyName,
            icon: getHobbyIcon(h.hobbyName),
        })),
        upcomingEvent,
        viewType,
        isLiked: interaction.isLiked,
        hasPassed: interaction.hasPassed,
        isMutualMatch: interaction.isMutualMatch,
        chatSessionId: interaction.chatSessionId,
    };
}
