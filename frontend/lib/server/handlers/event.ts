import "server-only";
import { sql } from "@/lib/server/db";
import { createNotification, normalizeSearchQuery, type HandlerResult, type Row } from "./_shared";

const ADMIN_JSON = sql`json_build_object('id', a.user_id, 'firstName', a.first_name,
    'lastName', a.last_name, 'avatarUrl', a.avatar_url)`;

function engagementsPreview(alias = "e") {
    return sql`
        coalesce((select json_agg(json_build_object('userId', sub.user_id, 'engagementType', sub.engagement_type,
            'user', json_build_object('id', su.user_id, 'avatarUrl', su.avatar_url)))
            from (select ee.user_id, ee.engagement_type from event_engagements ee
                  where ee.event_id = ${sql(alias)}.event_id and ee.engagement_type = 'joined' limit 4) sub
            join verified_users su on su.user_id = sub.user_id), '[]'::json)
    `;
}

const EVENT_COLS = sql`
    e.event_id as "id", e.title, e.description, e.event_time as "eventTime", e.format,
    e.address, e.url_link as "urlLink", e.image_url as "imageUrl", e.created_at as "createdAt",
    e.admin_id as "adminId", e.status
`;

export async function getEvents(userId: number, query: URLSearchParams): Promise<HandlerResult> {
    const page = Math.max(parseInt(query.get("page") || "1"), 1);
    const limit = Math.max(parseInt(query.get("limit") || "10"), 1);
    const format = query.get("format");
    const search = normalizeSearchQuery(query.get("search"));
    const status = query.get("status");
    const fromDate = query.get("fromDate");
    const toDate = query.get("toDate");
    const joinedOnly = query.get("joinedOnly") === "true";

    let where = sql`where e.status = ${status || "APPROVED"}`;
    if (format && format !== "all") where = sql`${where} and e.format = ${format}`;
    if (search) where = sql`${where} and (e.title ilike ${"%" + search + "%"} or e.description ilike ${"%" + search + "%"})`;
    if (joinedOnly) {
        where = sql`${where} and exists (select 1 from event_engagements ee where ee.event_id = e.event_id and ee.user_id = ${userId} and ee.engagement_type = 'joined')`;
    }
    if (fromDate) where = sql`${where} and e.event_time >= ${new Date(fromDate)}`;
    if (toDate) where = sql`${where} and e.event_time <= ${new Date(toDate)}`;
    if (!fromDate && !toDate && !joinedOnly) where = sql`${where} and e.event_time >= now()`;

    const [events, [count]] = await Promise.all([
        sql`
            select ${EVENT_COLS}, ${ADMIN_JSON} as admin, ${engagementsPreview("e")} as engagements,
                   (select count(*)::int from event_engagements ee where ee.event_id = e.event_id and ee.engagement_type = 'joined') as "participantCount",
                   exists(select 1 from event_engagements ee where ee.event_id = e.event_id and ee.user_id = ${userId} and ee.engagement_type = 'joined') as "isJoined"
            from events e join verified_users a on a.user_id = e.admin_id
            ${where}
            order by e.event_time asc
            offset ${(page - 1) * limit} limit ${limit}
        `,
        sql`select count(*)::int as cnt from events e ${where}`,
    ]);

    const data = (events as Row[]).map((ev) => ({
        ...ev,
        _count: { engagements: Number(ev.participantCount) },
        urlLink: ev.format === "online" && !ev.isJoined ? null : ev.urlLink,
    }));
    const total = Number(count.cnt);
    return {
        status: 200,
        data: { data, total, page, totalPages: Math.ceil(total / limit), hasMore: page * limit < total },
    };
}

export async function getPublicEvents(query: URLSearchParams): Promise<HandlerResult> {
    const page = Math.max(parseInt(query.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(query.get("limit") || "4", 10), 1), 10);
    const [events, [count]] = await Promise.all([
        sql`
            select e.event_id as "id", e.title, e.description, e.event_time as "eventTime", e.format,
                   e.address, e.image_url as "imageUrl", e.created_at as "createdAt",
                   ${engagementsPreview("e")} as engagements,
                   (select count(*)::int from event_engagements ee where ee.event_id = e.event_id and ee.engagement_type = 'joined') as "participantCount"
            from events e
            where e.status = 'APPROVED' and e.event_time >= now()
            order by e.event_time asc
            offset ${(page - 1) * limit} limit ${limit}
        `,
        sql`select count(*)::int as cnt from events where status = 'APPROVED' and event_time >= now()`,
    ]);
    const data = (events as Row[]).map((ev) => ({
        ...ev,
        address: ev.format === "offline" ? ev.address : null,
        urlLink: null,
    }));
    const total = Number(count.cnt);
    return {
        status: 200,
        data: { data, total, page, totalPages: Math.ceil(total / limit), hasMore: page * limit < total },
    };
}

export async function getEventDetail(userId: number, eventId: number): Promise<HandlerResult> {
    const [event] = await sql`
        select ${EVENT_COLS}, ${ADMIN_JSON} as admin,
               exists(select 1 from event_engagements ee where ee.event_id = e.event_id and ee.user_id = ${userId} and ee.engagement_type = 'joined') as "isJoined"
        from events e join verified_users a on a.user_id = e.admin_id
        where e.event_id = ${eventId}
    `;
    if (!event) return { status: 404, data: { error: "Event not found" } };
    const engagements = await sql`
        select ee.user_id as "userId", ee.engagement_type as "engagementType",
               json_build_object('id', u.user_id, 'firstName', u.first_name, 'lastName', u.last_name, 'avatarUrl', u.avatar_url) as user
        from event_engagements ee join verified_users u on u.user_id = ee.user_id
        where ee.event_id = ${eventId}
    `;
    return {
        status: 200,
        data: {
            ...event,
            engagements,
            urlLink: event.format === "online" && !event.isJoined ? null : event.urlLink,
        },
    };
}

export async function createEvent(userId: number, body: Record<string, string>): Promise<HandlerResult> {
    const { title, description, eventTime, format, address, urlLink, imageUrl } = body;
    if (!title || !description || !eventTime || !format) {
        return { status: 400, data: { error: "Thiếu field bắt buộc (title, description, eventTime, format)" } };
    }
    const t = title.trim();
    if (t.length < 5 || t.length > 50) return { status: 400, data: { error: "Tên sự kiện phải từ 5–50 ký tự" } };
    if (description.trim().length < 10) return { status: 400, data: { error: "Mô tả phải có ít nhất 10 ký tự" } };
    if (!["online", "offline"].includes(format)) return { status: 400, data: { error: "Format không hợp lệ (chỉ chấp nhận: online, offline)" } };
    if (format === "online" && !urlLink) return { status: 400, data: { error: "URL họp là bắt buộc khi format là online" } };
    if (format === "offline" && !address) return { status: 400, data: { error: "Địa chỉ là bắt buộc khi format là offline" } };
    if (urlLink) {
        try { new URL(urlLink); } catch { return { status: 400, data: { error: "URL họp không hợp lệ" } }; }
    }
    const parsed = new Date(eventTime);
    if (isNaN(parsed.getTime())) return { status: 400, data: { error: "Thời gian không hợp lệ" } };
    if (parsed <= new Date()) return { status: 400, data: { error: "Không thể tạo sự kiện trong quá khứ" } };

    const [event] = await sql`
        insert into events (title, description, event_time, format, address, url_link, image_url, status, admin_id)
        values (${t}, ${description.trim()}, ${parsed}, ${format}, ${address?.trim() || null},
                ${urlLink?.trim() || null}, ${imageUrl?.trim() || null}, 'APPROVED', ${userId})
        returning ${EVENT_COLS}
    `;
    return { status: 201, data: event };
}

export async function engageEvent(userId: number, eventId: number): Promise<HandlerResult> {
    const [event] = await sql`select event_id as "id", status, event_time as "eventTime", admin_id as "adminId" from events where event_id = ${eventId}`;
    if (!event) return { status: 404, data: { error: "Event not found" } };
    if (event.status !== "APPROVED") return { status: 400, data: { error: "Sự kiện chưa được duyệt" } };
    if (new Date(event.eventTime as string) < new Date()) return { status: 400, data: { error: "Sự kiện đã kết thúc" } };

    const [existing] = await sql`select 1 from event_engagements where event_id = ${eventId} and user_id = ${userId}`;
    if (existing) return { status: 400, data: { error: "Bạn đã tham gia sự kiện này rồi" } };

    const [engagement] = await sql`
        insert into event_engagements (event_id, user_id, engagement_type)
        values (${eventId}, ${userId}, 'joined')
        returning event_id as "eventId", user_id as "userId", engagement_type as "engagementType", engaged_at as "engagedAt"
    `;
    return { status: 200, data: engagement };
}

export async function cancelEngagement(userId: number, eventId: number): Promise<HandlerResult> {
    const [event] = await sql`select event_time as "eventTime" from events where event_id = ${eventId}`;
    if (!event) return { status: 404, data: { error: "Event not found" } };
    if (new Date(event.eventTime as string) < new Date()) {
        return { status: 400, data: { error: "Sự kiện đã kết thúc, không thể huỷ tham gia" } };
    }
    const [existing] = await sql`select 1 from event_engagements where event_id = ${eventId} and user_id = ${userId}`;
    if (!existing) return { status: 400, data: { error: "Bạn chưa tham gia sự kiện này" } };
    await sql`delete from event_engagements where event_id = ${eventId} and user_id = ${userId}`;
    return { status: 200, data: { message: "Đã huỷ tham gia thành công" } };
}

export async function updateEvent(userId: number, eventId: number, body: Record<string, string>): Promise<HandlerResult> {
    const [existing] = await sql`select admin_id as "adminId", format, address, url_link as "urlLink" from events where event_id = ${eventId}`;
    if (!existing) return { status: 404, data: { error: "Event not found" } };
    if (Number(existing.adminId) !== userId) return { status: 403, data: { error: "Forbidden" } };

    const { title, description, eventTime, format, address, urlLink, imageUrl } = body;
    let parsed: Date | undefined;
    if (eventTime !== undefined) {
        parsed = new Date(eventTime);
        if (isNaN(parsed.getTime())) return { status: 400, data: { error: "Thời gian không hợp lệ" } };
        if (parsed <= new Date()) return { status: 400, data: { error: "Không thể đặt thời gian trong quá khứ" } };
    }
    if (title !== undefined && (title.trim().length < 5 || title.trim().length > 50)) {
        return { status: 400, data: { error: "Tên sự kiện phải từ 5–50 ký tự" } };
    }
    const resolvedFormat = format || existing.format;
    const resolvedAddress = address !== undefined ? address : existing.address;
    const resolvedUrlLink = urlLink !== undefined ? urlLink : existing.urlLink;
    if (resolvedFormat === "online" && !resolvedUrlLink) return { status: 400, data: { error: "URL họp là bắt buộc khi format là online" } };
    if (resolvedFormat === "offline" && !resolvedAddress) return { status: 400, data: { error: "Địa chỉ là bắt buộc khi format là offline" } };

    const [updated] = await sql`
        update events set
            title = ${title !== undefined ? title.trim() : sql`title`},
            description = ${description !== undefined ? (description ? description.trim() : null) : sql`description`},
            event_time = ${parsed !== undefined ? parsed : sql`event_time`},
            format = ${format !== undefined ? format : sql`format`},
            address = ${address !== undefined ? (address ? address.trim() : null) : sql`address`},
            url_link = ${urlLink !== undefined ? (urlLink ? urlLink.trim() : null) : sql`url_link`},
            image_url = ${imageUrl !== undefined ? (imageUrl ? imageUrl.trim() : null) : sql`image_url`},
            status = 'APPROVED'
        where event_id = ${eventId}
        returning ${EVENT_COLS}
    `;
    return { status: 200, data: updated };
}

export async function deleteEvent(userId: number, eventId: number): Promise<HandlerResult> {
    const [event] = await sql`select admin_id as "adminId" from events where event_id = ${eventId}`;
    if (!event) return { status: 404, data: { error: "Event not found" } };
    if (Number(event.adminId) !== userId) return { status: 403, data: { error: "Forbidden" } };
    await sql`delete from events where event_id = ${eventId}`;
    return { status: 200, data: { message: "Đã xoá sự kiện thành công" } };
}

export async function getMyEvents(userId: number, query: URLSearchParams): Promise<HandlerResult> {
    const page = Math.max(parseInt(query.get("page") || "1"), 1);
    const limit = Math.max(parseInt(query.get("limit") || "10"), 1);
    const status = query.get("status");
    let where = sql`where e.admin_id = ${userId}`;
    if (status) where = sql`${where} and e.status = ${status}`;
    const [events, [count]] = await Promise.all([
        sql`
            select ${EVENT_COLS},
                   coalesce((select json_agg(json_build_object('userId', ee.user_id, 'engagementType', ee.engagement_type))
                       from event_engagements ee where ee.event_id = e.event_id), '[]'::json) as engagements
            from events e ${where}
            order by e.created_at desc
            offset ${(page - 1) * limit} limit ${limit}
        `,
        sql`select count(*)::int as cnt from events e ${where}`,
    ]);
    const total = Number(count.cnt);
    return { status: 200, data: { data: events, total, page, totalPages: Math.ceil(total / limit), hasMore: page * limit < total } };
}

export async function reviewEvent(userId: number, eventId: number, body: { status?: string; rejectReason?: string }): Promise<HandlerResult> {
    const { status, rejectReason } = body;
    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
        return { status: 400, data: { error: "Status không hợp lệ (chỉ chấp nhận: APPROVED, REJECTED)" } };
    }
    if (status === "REJECTED" && !rejectReason?.trim()) {
        return { status: 400, data: { error: "Cần cung cấp lý do từ chối khi REJECTED" } };
    }
    const [event] = await sql`select title, status, admin_id as "adminId" from events where event_id = ${eventId}`;
    if (!event) return { status: 404, data: { error: "Event not found" } };
    if (event.status !== "PENDING") return { status: 400, data: { error: `Sự kiện đã được xử lý (status hiện tại: ${event.status})` } };

    const [updated] = await sql`
        update events set status = ${status}, admin_id = ${userId} where event_id = ${eventId} returning ${EVENT_COLS}
    `;
    const notifMessage = status === "APPROVED"
        ? `Sự kiện "${event.title}" của bạn đã được duyệt!`
        : `Sự kiện "${event.title}" bị từ chối. Lý do: ${rejectReason}`;
    await createNotification({
        userId: Number(event.adminId),
        type: status === "APPROVED" ? "EVENT_APPROVED" : "EVENT_REJECTED",
        message: notifMessage,
    });
    return { status: 200, data: { ...updated, ...(status === "REJECTED" && { rejectReason }) } };
}
