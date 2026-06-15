import "server-only";
import { sql } from "@/lib/server/db";
import { createNotification, getDisplayName, HttpError, type HandlerResult, type Row } from "./_shared";

const AUTHOR_JSON = sql`json_build_object('id', u.user_id, 'firstName', u.first_name,
    'lastName', u.last_name, 'avatarUrl', u.avatar_url)`;

async function assertGroupMember(groupId: number, userId: number) {
    const [m] = await sql`select 1 from group_members where user_id = ${userId} and group_id = ${groupId}`;
    if (!m) throw new HttpError(403, "Bạn cần tham gia nhóm để thực hiện hành động này");
}

async function assertPostGroupMember(postId: number, userId: number): Promise<Row> {
    const [post] = await sql`
        select post_id as "id", author_id as "authorId", group_id as "groupId" from posts where post_id = ${postId}
    `;
    if (!post) throw new HttpError(404, "Post không tồn tại");
    if (post.groupId != null) await assertGroupMember(Number(post.groupId), userId);
    return post;
}

export async function loadGroupPosts(
    groupId: number,
    userId: number,
    page: number,
    limit: number
): Promise<{ data: Row[]; hasMore: boolean }> {
    const [posts, [count]] = await Promise.all([
        sql`
            select p.post_id as "id", p.content, p.created_at as "createdAt", p.group_id as "groupId",
                   p.author_id as "authorId", p.image,
                   ${AUTHOR_JSON} as author,
                   (select count(*)::int from post_likes pl where pl.post_id = p.post_id) as "likeCount",
                   (select count(*)::int from comments c where c.post_id = p.post_id) as "commentCount",
                   exists(select 1 from post_likes pl where pl.post_id = p.post_id and pl.user_id = ${userId}) as "isLiked"
            from posts p join verified_users u on u.user_id = p.author_id
            where p.group_id = ${groupId}
            order by p.created_at desc
            offset ${(page - 1) * limit} limit ${limit}
        `,
        sql`select count(*)::int as cnt from posts where group_id = ${groupId}`,
    ]);
    const data = (posts as Row[]).map((p) => ({
        ...p,
        _count: { likes: Number(p.likeCount), comments: Number(p.commentCount) },
    }));
    return { data, hasMore: page * limit < Number(count.cnt) };
}

function wrap(fn: () => Promise<HandlerResult>): Promise<HandlerResult> {
    return fn().catch((err) => {
        if (err instanceof HttpError) return { status: err.status, data: { error: err.message } };
        throw err;
    });
}

export async function getPosts(userId: number, query: URLSearchParams): Promise<HandlerResult> {
    const page = parseInt(query.get("page") || "1", 10);
    const limit = parseInt(query.get("limit") || "5", 10);
    const groupId = parseInt(query.get("groupId") || "", 10);
    if (Number.isNaN(groupId)) return { status: 400, data: { error: "Thiếu groupId" } };
    return { status: 200, data: await loadGroupPosts(groupId, userId, page, limit) };
}

export async function createPost(
    userId: number,
    body: { content?: string; groupId?: number | string },
    imageUrl?: string | null
): Promise<HandlerResult> {
    return wrap(async () => {
        const groupId = Number(body.groupId);
        if (Number.isNaN(groupId)) return { status: 400, data: { error: "groupId không hợp lệ" } };
        await assertGroupMember(groupId, userId);

        const [created] = await sql`
            insert into posts (content, image, group_id, author_id)
            values (${body.content ?? ""}, ${imageUrl ?? null}, ${groupId}, ${userId})
            returning post_id as "id"
        `;
        const [post] = await sql`
            select p.post_id as "id", p.content, p.created_at as "createdAt", p.group_id as "groupId",
                   p.author_id as "authorId", p.image, ${AUTHOR_JSON} as author,
                   json_build_object('groupId', g.group_id, 'name', g.name) as "group"
            from posts p join verified_users u on u.user_id = p.author_id
            join groups g on g.group_id = p.group_id
            where p.post_id = ${Number(created.id)}
        `;

        const [me] = await sql`select first_name as "firstName" from verified_users where user_id = ${userId}`;
        const name = getDisplayName(me as { firstName?: string | null });
        const members = await sql`
            select user_id as "userId" from group_members where group_id = ${groupId} and user_id <> ${userId}
        `;
        for (const m of members as Row[]) {
            await createNotification({
                userId: Number(m.userId),
                type: "NEW_POST",
                message: `${name} vừa đăng bài mới trong nhóm`,
                relatedUserId: userId,
            });
        }

        return { status: 200, data: { ...post, _count: { likes: 0, comments: 0 }, isLiked: false } };
    });
}

export async function likePost(userId: number, body: { postId?: number }): Promise<HandlerResult> {
    return wrap(async () => {
        const postId = Number(body.postId);
        const post = await assertPostGroupMember(postId, userId);
        await sql`
            insert into post_likes (user_id, post_id) values (${userId}, ${postId})
            on conflict (user_id, post_id) do nothing
        `;
        if (Number(post.authorId) !== userId) {
            const [me] = await sql`select first_name as "firstName" from verified_users where user_id = ${userId}`;
            await createNotification({
                userId: Number(post.authorId),
                type: "POST_LIKE",
                message: `${getDisplayName(me as { firstName?: string | null })} đã thích bài viết của bạn`,
                relatedUserId: userId,
            });
        }
        const [c] = await sql`select count(*)::int as cnt from post_likes where post_id = ${postId}`;
        return { status: 200, data: { postId, totalLikes: Number(c.cnt) } };
    });
}

export async function unlikePost(userId: number, body: { postId?: number }): Promise<HandlerResult> {
    return wrap(async () => {
        const postId = Number(body.postId);
        await assertPostGroupMember(postId, userId);
        await sql`delete from post_likes where user_id = ${userId} and post_id = ${postId}`;
        return { status: 200, data: { message: "Unliked" } };
    });
}

export async function commentPost(
    userId: number,
    body: { postId?: number; content?: string }
): Promise<HandlerResult> {
    return wrap(async () => {
        const postId = Number(body.postId);
        if (!body.content) return { status: 400, data: { error: "Content không được để trống" } };
        const post = await assertPostGroupMember(postId, userId);
        const [created] = await sql`
            insert into comments (content, post_id, author_id)
            values (${body.content}, ${postId}, ${userId})
            returning comment_id as "id"
        `;
        const [comment] = await sql`
            select c.comment_id as "id", c.content, c.created_at as "createdAt",
                   c.post_id as "postId", c.author_id as "authorId", ${AUTHOR_JSON} as author
            from comments c join verified_users u on u.user_id = c.author_id
            where c.comment_id = ${Number(created.id)}
        `;
        if (Number(post.authorId) !== userId) {
            const [me] = await sql`select first_name as "firstName" from verified_users where user_id = ${userId}`;
            await createNotification({
                userId: Number(post.authorId),
                type: "POST_COMMENT",
                message: `${getDisplayName(me as { firstName?: string | null })} đã bình luận bài viết của bạn`,
                relatedUserId: userId,
            });
        }
        return { status: 200, data: comment };
    });
}

export async function getCommentsByPost(
    postId: number,
    query: URLSearchParams
): Promise<HandlerResult> {
    const page = parseInt(query.get("page") || "1", 10);
    const limit = parseInt(query.get("limit") || "10", 10);
    const [comments, [count]] = await Promise.all([
        sql`
            select c.comment_id as "id", c.content, c.created_at as "createdAt",
                   c.post_id as "postId", c.author_id as "authorId", ${AUTHOR_JSON} as author
            from comments c join verified_users u on u.user_id = c.author_id
            where c.post_id = ${postId}
            order by c.created_at asc
            offset ${(page - 1) * limit} limit ${limit}
        `,
        sql`select count(*)::int as cnt from comments where post_id = ${postId}`,
    ]);
    const total = Number(count.cnt);
    return {
        status: 200,
        data: { data: comments, pagination: { page, limit, total, hasMore: page * limit < total } },
    };
}
