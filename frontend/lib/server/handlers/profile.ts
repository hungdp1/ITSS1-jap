import "server-only";
import { sql } from "@/lib/server/db";
import { formatProfile, type HandlerResult } from "./_shared";

export async function getProfile(userId: number): Promise<HandlerResult> {
    const profile = await formatProfile(userId, userId, "own");
    if (!profile) return { status: 404, data: { message: "User not found" } };
    return { status: 200, data: profile };
}

export async function getUserProfile(viewerId: number, targetId: number): Promise<HandlerResult> {
    if (!targetId || Number.isNaN(targetId)) {
        return { status: 400, data: { error: "Invalid user id" } };
    }
    if (targetId === viewerId) {
        const profile = await formatProfile(viewerId, viewerId, "own");
        if (!profile) return { status: 404, data: { message: "User not found" } };
        return { status: 200, data: profile };
    }

    const [blocked] = await sql`
        select 1 from user_profile_actions
        where action = 'BLOCK'
          and ((actor_id = ${viewerId} and target_id = ${targetId})
            or (actor_id = ${targetId} and target_id = ${viewerId}))
        limit 1
    `;
    if (blocked) {
        return { status: 403, data: { message: "このユーザーのプロフィールは表示できません。" } };
    }

    const [exists] = await sql`select 1 from verified_users where user_id = ${targetId} and status = 'VERIFIED'`;
    if (!exists) return { status: 404, data: { message: "User not found" } };

    const profile = await formatProfile(targetId, viewerId, "other");
    return { status: 200, data: profile };
}

export async function updateBasicProfile(
    userId: number,
    body: { firstName?: string; lastName?: string; location?: string; bio?: string; dateOfBirth?: string }
): Promise<HandlerResult> {
    const { firstName, lastName, location, bio, dateOfBirth } = body;
    if (firstName && firstName.length > 20) {
        return { status: 400, data: { error: "Tên tối đa 20 ký tự" } };
    }
    const [updated] = await sql`
        update verified_users set
            first_name = ${firstName ?? null},
            last_name = ${lastName ?? null},
            location = ${location ?? null},
            bio = ${bio ?? null},
            date_of_birth = ${dateOfBirth ? new Date(dateOfBirth) : null}
        where user_id = ${userId}
        returning user_id as "id", email, first_name as "firstName", last_name as "lastName",
                  location, bio, date_of_birth as "dateOfBirth", avatar_url as "avatarUrl", status
    `;
    return { status: 200, data: updated };
}

export async function updatePurposes(userId: number, body: { purposes?: string[] }): Promise<HandlerResult> {
    const { purposes } = body;
    if (!Array.isArray(purposes)) return { status: 400, data: { error: "purposes phải là array" } };
    if (purposes.length > 10) return { status: 400, data: { error: "Tối đa 10 mục đích" } };
    await sql`delete from user_purposes where user_id = ${userId}`;
    for (const p of purposes) {
        await sql`insert into user_purposes (purpose, user_id) values (${p}, ${userId})`;
    }
    return { status: 200, data: { message: "Purposes updated" } };
}

export async function updateHobbies(userId: number, body: { hobbies?: string[] }): Promise<HandlerResult> {
    const { hobbies } = body;
    if (!Array.isArray(hobbies)) return { status: 400, data: { error: "hobbies phải là array" } };
    if (hobbies.length > 10) return { status: 400, data: { error: "Tối đa 10 sở thích" } };
    await sql`delete from user_hobbies where user_id = ${userId}`;
    for (const h of hobbies) {
        await sql`insert into user_hobbies (hobby_name, user_id) values (${h}, ${userId})`;
    }
    return { status: 200, data: { message: "Hobbies updated" } };
}

export async function updateLanguages(
    userId: number,
    body: { languages?: { language: string; level?: string | null; type?: string | null }[] }
): Promise<HandlerResult> {
    const { languages } = body;
    if (!Array.isArray(languages)) return { status: 400, data: { error: "languages phải là array" } };
    await sql`delete from user_languages where user_id = ${userId}`;
    for (const l of languages) {
        await sql`
            insert into user_languages (language, level, type, user_id)
            values (${l.language}, ${l.level ?? null}, ${l.type ?? null}, ${userId})
        `;
    }
    return { status: 200, data: { message: "Languages updated" } };
}

export async function updateMainPhoto(userId: number, body: { url?: string }): Promise<HandlerResult> {
    if (!body.url) return { status: 400, data: { error: "url là bắt buộc" } };
    const [user] = await sql`
        update verified_users set avatar_url = ${body.url} where user_id = ${userId}
        returning user_id as "id", email, first_name as "firstName", last_name as "lastName",
                  avatar_url as "avatarUrl", status
    `;
    return { status: 200, data: user };
}

export async function addPhoto(userId: number, body: { url?: string }): Promise<HandlerResult> {
    if (!body.url) return { status: 400, data: { error: "url là bắt buộc" } };
    const [c] = await sql`select count(*)::int as cnt from user_photos where user_id = ${userId}`;
    if (Number(c.cnt) >= 4) return { status: 400, data: { message: "Max 4 photos" } };
    const [photo] = await sql`
        insert into user_photos (url, user_id) values (${body.url}, ${userId})
        returning id, url, "isMain", user_id as "userId"
    `;
    return { status: 200, data: photo };
}

export async function deletePhoto(userId: number, photoId: number): Promise<HandlerResult> {
    const [photo] = await sql`select id, user_id as "userId" from user_photos where id = ${photoId}`;
    if (!photo || Number(photo.userId) !== userId) {
        return { status: 403, data: { error: "Forbidden" } };
    }
    await sql`delete from user_photos where id = ${photoId}`;
    return { status: 200, data: { message: "Deleted" } };
}
