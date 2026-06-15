import "server-only";
import { sql } from "@/lib/server/db";
import { signToken, hashPassword, comparePassword } from "@/lib/server/auth";
import { splitPurposeValues, type HandlerResult } from "./_shared";

const DEFAULT_AVATAR_URL = "/assets/images/avatars/avatar.jpg";

const USER_PUBLIC = sql`
    user_id as "id", email, first_name as "firstName", last_name as "lastName",
    date_of_birth as "dateOfBirth", location, bio, avatar_url as "avatarUrl",
    created_at as "createdAt", status
`;

export async function login(body: { email?: string; password?: string }): Promise<HandlerResult> {
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    if (!email || !password) {
        return { status: 400, data: { error: "Email and password required" } };
    }

    const [user] = await sql`
        select user_id as "id", email, password, first_name as "firstName",
               last_name as "lastName", avatar_url as "avatarUrl", status
        from verified_users where email = ${email}
    `;
    if (!user) return { status: 400, data: { error: "User not found" } };
    if (user.status !== "VERIFIED") {
        return { status: 403, data: { error: "Account not verified" } };
    }

    const valid = await comparePassword(password, user.password as string);
    if (!valid) return { status: 400, data: { error: "Wrong password" } };

    const purposes = await sql`select purpose from user_purposes where user_id = ${user.id}`;
    const token = signToken({ id: Number(user.id) });
    const { password: _pw, ...safeUser } = user as Record<string, unknown>;
    return { status: 200, data: { token, user: { ...safeUser, purposes } } };
}

export async function register(
    body: { email?: string; password?: string; language?: string; purpose?: string },
    avatarUrl?: string | null
): Promise<HandlerResult> {
    const { email: rawEmail, password, language, purpose } = body;
    if (!rawEmail || !password || !language || !purpose) {
        return { status: 400, data: { error: "Email, password, language, purpose required" } };
    }
    const email = rawEmail.trim().toLowerCase();

    const [existed] = await sql`select user_id from verified_users where email = ${email}`;
    if (existed) return { status: 400, data: { error: "Email already exists" } };

    const finalAvatar = avatarUrl || DEFAULT_AVATAR_URL;
    const hashed = await hashPassword(password.trim());

    const [user] = await sql`
        insert into verified_users (email, password, avatar_url, status)
        values (${email}, ${hashed}, ${finalAvatar}, 'VERIFIED')
        returning user_id as "id"
    `;
    const userId = Number(user.id);

    const learningLanguage = language === "日本" ? "ベトナム" : "日本";
    await sql`
        insert into user_languages (language, type, user_id) values
        (${language}, 'native', ${userId}),
        (${learningLanguage}, 'learning', ${userId})
    `;

    const purposeList = splitPurposeValues(purpose);
    if (purposeList.length === 0) {
        return { status: 400, data: { error: "Purpose required" } };
    }
    for (const p of purposeList) {
        await sql`insert into user_purposes (purpose, user_id) values (${p}, ${userId})`;
    }

    await sql`
        insert into kyc_requests (document_image_url, status, user_id)
        values (${finalAvatar}, 'APPROVED', ${userId})
    `;

    return { status: 200, data: { message: "Đăng ký thành công" } };
}

export async function me(userId: number): Promise<HandlerResult> {
    const [user] = await sql`select ${USER_PUBLIC} from verified_users where user_id = ${userId}`;
    if (!user) return { status: 404, data: { error: "User not found" } };

    const [languages, hobbies, purposes, kycRequests] = await Promise.all([
        sql`select id, language, type, level from user_languages where user_id = ${userId}`,
        sql`select id, hobby_name as "hobbyName" from user_hobbies where user_id = ${userId}`,
        sql`select id, purpose from user_purposes where user_id = ${userId}`,
        sql`select request_id as "id", status from kyc_requests where user_id = ${userId}`,
    ]);

    return {
        status: 200,
        data: { user: { ...user, languages, hobbies, purposes, kycRequests } },
    };
}
