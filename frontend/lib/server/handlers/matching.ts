import "server-only";
import { sql } from "@/lib/server/db";
import { broadcastMany } from "@/lib/server/realtime";
import {
    normalizeSearchQuery,
    splitPurposeValues,
    getDisplayName,
    createNotification,
    getOrCreateMatchSession,
    findMatchSessionId,
    hasMutualLike,
    formatBlockStatus,
    HttpError,
    type HandlerResult,
    type Row,
} from "./_shared";

const PAGE_SIZE = 12;
const NATIONALITY_LANGUAGE_VALUES: Record<string, string[]> = {
    日本: ["日本", "日本語"],
    ベトナム: ["ベトナム", "ベトナム語"],
};

async function loadFilterOptions() {
    const [purposeRows, hobbyRows] = await Promise.all([
        sql`select distinct up.purpose from user_purposes up
            join verified_users u on u.user_id = up.user_id where u.status = 'VERIFIED'`,
        sql`select distinct uh.hobby_name as "hobbyName" from user_hobbies uh
            join verified_users u on u.user_id = uh.user_id where u.status = 'VERIFIED'
            order by uh.hobby_name asc`,
    ]);
    const purposeSet = new Set<string>();
    for (const row of purposeRows as unknown as { purpose: string }[]) {
        for (const value of splitPurposeValues(row.purpose)) purposeSet.add(value);
    }
    return {
        purposes: [...purposeSet].sort((a, b) => a.localeCompare(b, "ja")),
        hobbies: (hobbyRows as unknown as { hobbyName: string }[])
            .map((r) => r.hobbyName)
            .sort((a, b) => a.localeCompare(b, "ja")),
    };
}

async function searchUsers(userId: number, query: URLSearchParams) {
    const page = Math.max(parseInt(query.get("page") || "1", 10), 1);
    const offset = (page - 1) * PAGE_SIZE;
    const search = normalizeSearchQuery(query.get("search"));
    const hobby = query.get("hobby")?.trim();
    const language = query.get("language")?.trim();
    const purpose = query.get("purpose")?.trim();
    const jlptLevel = query.get("jlptLevel")?.trim();

    let where = sql`where u.status = 'VERIFIED' and u.user_id <> ${userId}
        and not exists (
            select 1 from user_profile_actions a
            where (a.actor_id = ${userId} and a.target_id = u.user_id and a.action in ('PASS','BLOCK'))
               or (a.actor_id = u.user_id and a.target_id = ${userId} and a.action = 'BLOCK')
        )`;

    if (search) {
        where = sql`${where} and (u.first_name ilike ${"%" + search + "%"} or u.last_name ilike ${"%" + search + "%"})`;
    }
    if (hobby) {
        where = sql`${where} and exists (select 1 from user_hobbies h where h.user_id = u.user_id and h.hobby_name = ${hobby})`;
    }
    if (language) {
        const values = NATIONALITY_LANGUAGE_VALUES[language];
        if (values) {
            where = sql`${where} and exists (select 1 from user_languages l where l.user_id = u.user_id and l.type = 'native' and l.language = any(${values}))`;
        } else {
            where = sql`${where} and exists (select 1 from user_languages l where l.user_id = u.user_id and l.type = 'native' and l.language = ${language})`;
        }
    }
    if (purpose) {
        where = sql`${where} and exists (select 1 from user_purposes p where p.user_id = u.user_id and p.purpose = ${purpose})`;
    }
    if (jlptLevel) {
        const levels = jlptLevel.split(",").map((s) => s.trim()).filter(Boolean);
        where = sql`${where} and exists (select 1 from user_languages l where l.user_id = u.user_id and l.level = any(${levels}))`;
    }

    const users = await sql`
        select u.user_id as "id", u.first_name as "firstName", u.last_name as "lastName",
               u.location, u.avatar_url as "avatarUrl"
        from verified_users u
        ${where}
        order by u.user_id asc
        offset ${offset} limit ${PAGE_SIZE + 1}
    `;

    const hasMoreRaw = users.length > PAGE_SIZE;
    if (hasMoreRaw) users.pop();

    const ids = users.map((u) => Number(u.id));
    const [hobbies, languages, purposes] = ids.length
        ? await Promise.all([
              sql`select user_id as "userId", hobby_name as "hobbyName" from user_hobbies where user_id = any(${ids})`,
              sql`select user_id as "userId", language, type, level from user_languages where user_id = any(${ids})`,
              sql`select user_id as "userId", purpose from user_purposes where user_id = any(${ids})`,
          ])
        : [[], [], []];

    const byUser = (rows: Row[]) => {
        const m = new Map<number, Row[]>();
        for (const r of rows) {
            const k = Number(r.userId);
            if (!m.has(k)) m.set(k, []);
            m.get(k)!.push(r);
        }
        return m;
    };
    const hMap = byUser(hobbies as Row[]);
    const lMap = byUser(languages as Row[]);
    const pMap = byUser(purposes as Row[]);

    const data = users.map((u) => {
        const id = Number(u.id);
        const uh = (hMap.get(id) ?? []).map((r) => ({ hobbyName: r.hobbyName }));
        const ul = (lMap.get(id) ?? []).map((r) => ({ language: r.language, type: r.type, level: r.level }));
        const up = (pMap.get(id) ?? []).map((r) => ({ purpose: r.purpose }));
        return {
            ...u,
            hobbies: uh,
            languages: ul,
            purposes: up,
            score: (uh.length ? 2 : 0) + (ul.length ? 2 : 0) + (up.length ? 1 : 0),
        };
    });

    let total: number | undefined;
    if (page === 1) {
        if (!hasMoreRaw) total = data.length;
        else {
            const [c] = await sql`select count(*)::int as cnt from verified_users u ${where}`;
            total = Number(c.cnt);
        }
    }

    const hasMore =
        page > 1 ? hasMoreRaw : hasMoreRaw || (total != null && page * PAGE_SIZE < total);
    return { data, total, hasMore };
}

export async function getFilterOptionsHandler(): Promise<HandlerResult> {
    return { status: 200, data: await loadFilterOptions() };
}

export async function searchUsersHandler(userId: number, query: URLSearchParams): Promise<HandlerResult> {
    return { status: 200, data: await searchUsers(userId, query) };
}

export async function matchingHome(userId: number, query: URLSearchParams): Promise<HandlerResult> {
    const q = new URLSearchParams(query);
    q.set("page", "1");
    const [filterOptions, search] = await Promise.all([loadFilterOptions(), searchUsers(userId, q)]);
    return { status: 200, data: { filterOptions, search } };
}

async function assertTargetUser(targetUserId: number, actorId: number) {
    if (!targetUserId || Number.isNaN(targetUserId)) throw new HttpError(400, "Invalid target user");
    if (targetUserId === actorId) throw new HttpError(400, "Cannot perform this action on yourself");
    const [t] = await sql`select user_id from verified_users where user_id = ${targetUserId} and status = 'VERIFIED'`;
    if (!t) throw new HttpError(404, "User not found");
}

async function upsertAction(actorId: number, targetId: number, action: string) {
    await sql`
        insert into user_profile_actions (actor_id, target_id, action)
        values (${actorId}, ${targetId}, ${action})
        on conflict (actor_id, target_id, action) do update set created_at = now()
    `;
}

async function actorName(actorId: number): Promise<string> {
    const [a] = await sql`select first_name as "firstName", last_name as "lastName" from verified_users where user_id = ${actorId}`;
    return getDisplayName((a as { firstName?: string | null; lastName?: string | null }) || {});
}

function wrap(fn: () => Promise<HandlerResult>): Promise<HandlerResult> {
    return fn().catch((err) => {
        if (err instanceof HttpError) return { status: err.status, data: { error: err.message } };
        throw err;
    });
}

export async function passUser(actorId: number, body: { targetUserId?: number }): Promise<HandlerResult> {
    return wrap(async () => {
        const targetUserId = Number(body.targetUserId);
        await assertTargetUser(targetUserId, actorId);
        await upsertAction(actorId, targetUserId, "PASS");
        return { status: 200, data: { message: "Passed", targetUserId } };
    });
}

export async function likeUser(actorId: number, body: { targetUserId?: number }): Promise<HandlerResult> {
    return wrap(async () => {
        const targetUserId = Number(body.targetUserId);
        await assertTargetUser(targetUserId, actorId);

        const [existing] = await sql`
            select 1 from user_profile_actions
            where actor_id = ${actorId} and target_id = ${targetUserId} and action = 'LIKE'
        `;
        await upsertAction(actorId, targetUserId, "LIKE");

        let matched = false;
        let sessionId: number | null = null;

        const reciprocal = await sql`
            select 1 from user_profile_actions
            where actor_id = ${targetUserId} and target_id = ${actorId} and action = 'LIKE'
        `;

        if (!existing) {
            const name = await actorName(actorId);
            await createNotification({
                userId: targetUserId,
                type: "PROFILE_LIKE",
                message: `${name}さんがあなたのプロフィールにいいねしました`,
                relatedUserId: actorId,
            });
        }

        if (reciprocal.length > 0) {
            const session = await getOrCreateMatchSession(actorId, targetUserId);
            sessionId = session.id;
            matched = true;
            if (!existing) {
                const [actor, target] = await Promise.all([actorName(actorId), actorName(targetUserId)]);
                await Promise.all([
                    createNotification({
                        userId: actorId,
                        type: "MATCH",
                        message: `${target}さんとマッチングが成立しました！`,
                        relatedUserId: targetUserId,
                        sessionId: session.id,
                    }),
                    createNotification({
                        userId: targetUserId,
                        type: "MATCH",
                        message: `${actor}さんとマッチングが成立しました！`,
                        relatedUserId: actorId,
                        sessionId: session.id,
                    }),
                ]);
            }
        }

        return {
            status: 200,
            data: {
                message: matched ? "Matched" : "Liked",
                targetUserId,
                alreadyLiked: Boolean(existing),
                matched,
                sessionId,
            },
        };
    });
}

export async function blockUser(actorId: number, body: { targetUserId?: number }): Promise<HandlerResult> {
    return wrap(async () => {
        const targetUserId = Number(body.targetUserId);
        await assertTargetUser(targetUserId, actorId);
        await upsertAction(actorId, targetUserId, "BLOCK");

        const sessionId = await findMatchSessionId(actorId, targetUserId);
        const payload = { sessionId, blockedByUserId: actorId, blockedTargetUserId: targetUserId };
        await broadcastMany([`user:${targetUserId}`, `user:${actorId}`], "chat_blocked", payload);
        if (sessionId) await broadcastMany([`session:${sessionId}`], "chat_blocked", payload);

        return {
            status: 200,
            data: {
                message: "Blocked",
                targetUserId,
                sessionId,
                blockStatus: formatBlockStatus({ actorId, targetId: targetUserId }, actorId),
            },
        };
    });
}

export async function unblockUser(actorId: number, body: { targetUserId?: number }): Promise<HandlerResult> {
    return wrap(async () => {
        const targetUserId = Number(body.targetUserId);
        await assertTargetUser(targetUserId, actorId);
        await sql`
            delete from user_profile_actions
            where actor_id = ${actorId} and target_id = ${targetUserId} and action = 'BLOCK'
        `;
        const sessionId = await findMatchSessionId(actorId, targetUserId);
        const payload = { sessionId, unblockedByUserId: actorId, unblockedTargetUserId: targetUserId };
        await broadcastMany([`user:${targetUserId}`, `user:${actorId}`], "chat_unblocked", payload);
        if (sessionId) await broadcastMany([`session:${sessionId}`], "chat_unblocked", payload);

        return {
            status: 200,
            data: {
                message: "Unblocked",
                targetUserId,
                sessionId,
                blockStatus: { blockedByMe: false, blockedByThem: false },
            },
        };
    });
}

export async function createMatchSession(userId: number, body: { targetUserId?: number }): Promise<HandlerResult> {
    return wrap(async () => {
        const targetUserId = Number(body.targetUserId);
        if (!targetUserId) return { status: 400, data: { error: "targetUserIdが必要です。" } };
        if (userId === targetUserId)
            return { status: 400, data: { error: "自分自身とはチャットを開始できません。" } };

        const existingId = await findMatchSessionId(userId, targetUserId);
        if (existingId) {
            return {
                status: 200,
                data: { id: existingId, participants: [{ userId }, { userId: targetUserId }] },
            };
        }

        if (!(await hasMutualLike(userId, targetUserId))) {
            return {
                status: 403,
                data: {
                    error: "お互いにいいねしてマッチングが成立するまで、チャットを開始できません。",
                    code: "MUTUAL_MATCH_REQUIRED",
                },
            };
        }

        const session = await getOrCreateMatchSession(userId, targetUserId);
        const [meName, targetName] = await Promise.all([actorName(userId), actorName(targetUserId)]);
        await Promise.all([
            createNotification({
                userId: targetUserId,
                type: "MATCH_SUCCESS",
                message: `${meName}さんとマッチングしました。`,
                relatedUserId: userId,
                sessionId: session.id,
            }),
            createNotification({
                userId,
                type: "MATCH_SUCCESS",
                message: `${targetName}さんとマッチングしました。`,
                relatedUserId: targetUserId,
                sessionId: session.id,
            }),
        ]);
        return { status: 201, data: session };
    });
}

export async function reportUser(
    actorId: number,
    body: { targetUserId?: number; reason?: string },
    evidenceUrl?: string | null
): Promise<HandlerResult> {
    return wrap(async () => {
        const targetUserId = Number(body.targetUserId);
        const reason = (body.reason || "").trim();
        if (!reason) return { status: 400, data: { error: "理由を入力してください" } };
        await assertTargetUser(targetUserId, actorId);

        const [c] = await sql`
            insert into report_cases (reason, evidence_url, status)
            values (${reason}, ${evidenceUrl ?? null}, 'APPROVED')
            returning case_id as "id"
        `;
        await sql`
            insert into report_parties (user_id, case_id, party_role) values
            (${actorId}, ${Number(c.id)}, 'REPORTER'),
            (${targetUserId}, ${Number(c.id)}, 'REPORTED')
        `;
        return { status: 201, data: { message: "Report submitted", caseId: Number(c.id) } };
    });
}
