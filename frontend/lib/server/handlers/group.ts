import "server-only";
import { sql } from "@/lib/server/db";
import { normalizeSearchQuery, type HandlerResult, type Row } from "./_shared";
import { loadGroupPosts } from "./post";

const DEFAULT_LANGUAGE_LEVELS = ["N1", "N2", "N3", "N4", "N5"];

const GROUP_COLS = sql`
    g.group_id as "groupId", g.name, g.description, g.group_avatar as "groupAvatar",
    g.group_cover as "groupCover", g.member_count as "memberCount",
    coalesce((select json_agg(json_build_object('groupId', t.group_id, 'name', t.name))
        from group_hobby_tags t where t.group_id = g.group_id), '[]'::json) as "hobbyTags",
    coalesce((select json_agg(json_build_object('groupId', t.group_id, 'name', t.name))
        from group_language_tags t where t.group_id = g.group_id), '[]'::json) as "languageTags"
`;

function sortJlptLevels(tags: string[]): string[] {
    const orderSet = new Set(DEFAULT_LANGUAGE_LEVELS);
    const inOrder = DEFAULT_LANGUAGE_LEVELS.filter((l) => tags.includes(l));
    const rest = tags.filter((t) => !orderSet.has(t)).sort((a, b) => a.localeCompare(b, "ja"));
    return [...inOrder, ...rest];
}

// Filter options (hobby/language tags) change very rarely, but the 3 DISTINCT
// queries run on every community-home call against a DB in another region.
// Cache them in-process with a short TTL to cut ~3 round-trips off each load.
let filterOptionsCache: { value: Awaited<ReturnType<typeof loadGroupFilterOptionsUncached>>; expires: number } | null = null;
const FILTER_OPTIONS_TTL_MS = 5 * 60_000;

async function loadGroupFilterOptions() {
    const now = Date.now();
    if (filterOptionsCache && filterOptionsCache.expires > now) {
        return filterOptionsCache.value;
    }
    const value = await loadGroupFilterOptionsUncached();
    filterOptionsCache = { value, expires: now + FILTER_OPTIONS_TTL_MS };
    return value;
}

async function loadGroupFilterOptionsUncached() {
    const [hobbyTags, languageTags, userHobbies] = await Promise.all([
        sql`select distinct name from group_hobby_tags order by name asc`,
        sql`select distinct name from group_language_tags order by name asc`,
        sql`select distinct uh.hobby_name as name from user_hobbies uh
            join verified_users u on u.user_id = uh.user_id where u.status = 'VERIFIED'`,
    ]);
    const hobbySet = new Set<string>([
        ...(hobbyTags as unknown as { name: string }[]).map((r) => r.name),
        ...(userHobbies as unknown as { name: string }[]).map((r) => r.name),
    ]);
    const languageSet = new Set<string>([
        ...DEFAULT_LANGUAGE_LEVELS,
        ...(languageTags as unknown as { name: string }[]).map((r) => r.name),
    ]);
    return {
        hobbyTags: [...hobbySet].sort((a, b) => a.localeCompare(b, "ja")),
        languageTags: sortJlptLevels([...languageSet]),
    };
}

function withCount(group: Row): Row {
    const membersCount = Number(group.membersCount ?? group.memberCount ?? 0);
    const postsCount = Number(group.postsCount ?? 0);
    const out = { ...group, _count: { members: membersCount, posts: postsCount } };
    delete (out as Record<string, unknown>).membersCount;
    delete (out as Record<string, unknown>).postsCount;
    return out;
}

export async function getGroupFilterOptions(): Promise<HandlerResult> {
    return { status: 200, data: await loadGroupFilterOptions() };
}

export async function getGroups(userId: number, query: URLSearchParams): Promise<HandlerResult> {
    const page = Math.max(parseInt(query.get("page") || "1"), 1);
    const limit = Math.min(Math.max(parseInt(query.get("limit") || "10"), 1), 100);
    const search = normalizeSearchQuery(query.get("search"));
    const filterHobby = query.get("filterHobby") === "true";
    const filterLanguage = query.get("filterLanguage") === "true";
    const hobbyTag = query.get("hobbyTag");
    const languageTag = query.get("languageTag");

    const [myHobbiesRows, myLanguagesRows] = await Promise.all([
        sql`select hobby_name as name from user_hobbies where user_id = ${userId}`,
        sql`select language as name from user_languages where user_id = ${userId}`,
    ]);
    const myHobbies = (myHobbiesRows as unknown as { name: string }[]).map((r) => r.name);
    const myLanguages = (myLanguagesRows as unknown as { name: string }[]).map((r) => r.name);

    let where = sql`where true`;
    if (search) {
        where = sql`${where} and (g.name ilike ${"%" + search + "%"} or g.description ilike ${"%" + search + "%"})`;
    }
    if (filterHobby && myHobbies.length) {
        where = sql`${where} and exists (select 1 from group_hobby_tags t where t.group_id = g.group_id and t.name = any(${myHobbies}))`;
    }
    if (filterLanguage && myLanguages.length) {
        where = sql`${where} and exists (select 1 from group_language_tags t where t.group_id = g.group_id and t.name = any(${myLanguages}))`;
    }
    if (hobbyTag) {
        where = sql`${where} and exists (select 1 from group_hobby_tags t where t.group_id = g.group_id and t.name = ${hobbyTag})`;
    }
    if (languageTag) {
        where = sql`${where} and exists (select 1 from group_language_tags t where t.group_id = g.group_id and t.name = ${languageTag})`;
    }

    const [groups, [count]] = await Promise.all([
        sql`
            select ${GROUP_COLS},
                   (select count(*)::int from group_members gm where gm.group_id = g.group_id) as "membersCount",
                   (select count(*)::int from posts p where p.group_id = g.group_id) as "postsCount"
            from groups g ${where}
            order by g.member_count desc
            offset ${(page - 1) * limit} limit ${limit}
        `,
        sql`select count(*)::int as cnt from groups g ${where}`,
    ]);
    const total = Number(count.cnt);
    return {
        status: 200,
        data: { data: (groups as Row[]).map(withCount), total, hasMore: page * limit < total },
    };
}

export async function joinGroup(userId: number, body: { groupId?: number }): Promise<HandlerResult> {
    const groupId = Number(body.groupId);
    const [existed] = await sql`select 1 from group_members where user_id = ${userId} and group_id = ${groupId}`;
    if (existed) return { status: 400, data: { error: "Already joined group" } };
    await sql.begin(async (tx) => {
        await tx`insert into group_members (user_id, group_id) values (${userId}, ${groupId})`;
        await tx`update groups set member_count = member_count + 1 where group_id = ${groupId}`;
    });
    return { status: 200, data: { message: "Joined group" } };
}

export async function leaveGroup(userId: number, body: { groupId?: number }): Promise<HandlerResult> {
    const groupId = Number(body.groupId);
    const [existed] = await sql`select 1 from group_members where user_id = ${userId} and group_id = ${groupId}`;
    if (!existed) return { status: 400, data: { error: "Not in group" } };
    await sql.begin(async (tx) => {
        await tx`delete from group_members where user_id = ${userId} and group_id = ${groupId}`;
        await tx`update groups set member_count = greatest(member_count - 1, 0) where group_id = ${groupId}`;
    });
    return { status: 200, data: { message: "Left group" } };
}

export async function myGroups(userId: number): Promise<HandlerResult> {
    const rows = await sql`
        select g.group_id as "groupId", g.name, g.description, g.group_avatar as "groupAvatar",
               g.group_cover as "groupCover", g.member_count as "memberCount"
        from group_members gm join groups g on g.group_id = gm.group_id
        where gm.user_id = ${userId}
        order by gm.joined_at desc
    `;
    return { status: 200, data: rows };
}

async function buildSuggestedGroups(userId: number, joinedIds: Set<number>): Promise<Row[]> {
    const [hobbiesRows, languagesRows, groups] = await Promise.all([
        sql`select hobby_name as name from user_hobbies where user_id = ${userId}`,
        sql`select language as name from user_languages where user_id = ${userId}`,
        sql`
            select ${GROUP_COLS},
                   coalesce((select json_agg(json_build_object('user', json_build_object('avatarUrl', mu.avatar_url)))
                       from (select gm.user_id from group_members gm where gm.group_id = g.group_id
                             order by gm.joined_at desc limit 2) sub
                       join verified_users mu on mu.user_id = sub.user_id), '[]'::json) as members
            from groups g
            order by g.member_count desc
            limit 40
        `,
    ]);
    const myHobbies = (hobbiesRows as unknown as { name: string }[]).map((r) => r.name.toLowerCase());
    const myLanguages = (languagesRows as unknown as { name: string }[]).map((r) => r.name.toLowerCase());

    return (groups as Row[])
        .map((g) => {
            let score = 0;
            for (const t of (g.hobbyTags as { name: string }[]) ?? []) {
                if (myHobbies.includes(t.name.toLowerCase())) score += 3;
            }
            for (const t of (g.languageTags as { name: string }[]) ?? []) {
                if (myLanguages.includes(t.name.toLowerCase())) score += 2;
            }
            const memberCount = Number(g.memberCount);
            score += memberCount * 0.1;
            if (joinedIds.has(Number(g.groupId))) score += 1;
            return {
                ...g,
                _count: { members: memberCount },
                recommendScore: score,
                isJoined: joinedIds.has(Number(g.groupId)),
            };
        })
        .sort((a, b) => (b.recommendScore as number) - (a.recommendScore as number))
        .slice(0, 24);
}

export async function suggestedGroups(userId: number): Promise<HandlerResult> {
    const joined = await sql`select group_id as "groupId" from group_members where user_id = ${userId}`;
    const joinedIds = new Set((joined as Row[]).map((g) => Number(g.groupId)));
    return { status: 200, data: await buildSuggestedGroups(userId, joinedIds) };
}

export async function communityHome(userId: number): Promise<HandlerResult> {
    const [memberships, filterOptions] = await Promise.all([
        sql`
            select g.group_id as "groupId", g.name, g.description, g.group_avatar as "groupAvatar",
                   g.group_cover as "groupCover", g.member_count as "memberCount"
            from group_members gm join groups g on g.group_id = gm.group_id
            where gm.user_id = ${userId} order by gm.joined_at desc
        `,
        loadGroupFilterOptions(),
    ]);
    const myGroupsList = memberships as Row[];
    const joinedIds = new Set(myGroupsList.map((g) => Number(g.groupId)));
    const suggested = await buildSuggestedGroups(userId, joinedIds);
    return { status: 200, data: { myGroups: myGroupsList, suggested, filterOptions } };
}

async function loadGroupHeader(groupId: number, userId: number): Promise<Row | null> {
    const [group] = await sql`
        select ${GROUP_COLS},
               (select count(*)::int from posts p where p.group_id = g.group_id) as "postsCount"
        from groups g where g.group_id = ${groupId}
    `;
    if (!group) return null;
    const [membership] = await sql`select 1 from group_members where user_id = ${userId} and group_id = ${groupId}`;
    return {
        groupId: group.groupId,
        name: group.name,
        description: group.description,
        groupAvatar: group.groupAvatar,
        groupCover: group.groupCover,
        totalMembers: group.memberCount,
        totalPosts: Number(group.postsCount),
        hobbyTags: group.hobbyTags,
        languageTags: group.languageTags,
        isJoined: Boolean(membership),
    };
}

export async function groupCard(userId: number, groupId: number): Promise<HandlerResult> {
    const header = await loadGroupHeader(groupId, userId);
    if (!header) return { status: 404, data: { error: "Group not found" } };
    return { status: 200, data: header };
}

export async function groupPage(userId: number, groupId: number, query: URLSearchParams): Promise<HandlerResult> {
    const page = Math.max(parseInt(query.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(query.get("limit") || "10", 10), 1), 50);
    const [header, posts] = await Promise.all([
        loadGroupHeader(groupId, userId),
        loadGroupPosts(groupId, userId, page, limit),
    ]);
    if (!header) return { status: 404, data: { error: "Group not found" } };
    return { status: 200, data: { group: header, posts } };
}
