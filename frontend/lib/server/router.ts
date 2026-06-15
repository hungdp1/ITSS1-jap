import "server-only";
import { uploadBuffer } from "@/lib/server/storage";
import type { HandlerResult } from "./handlers/_shared";
import * as auth from "./handlers/auth";
import * as chat from "./handlers/chat";
import * as profile from "./handlers/profile";
import * as matching from "./handlers/matching";
import * as group from "./handlers/group";
import * as post from "./handlers/post";
import * as event from "./handlers/event";
import * as notification from "./handlers/notification";
import * as stats from "./handlers/stats";

export type UploadFile = { buffer: Buffer; mimetype: string };
export type ApiContext = {
    userId: number | null;
    body?: Record<string, unknown>;
    file?: UploadFile | null;
};

const UNAUTHENTICATED = 401;
function unauth(): HandlerResult {
    return { status: UNAUTHENTICATED, data: { error: "ログインしてください。" } };
}
function notFound(): HandlerResult {
    return { status: 404, data: { error: "Not found" } };
}

/**
 * In-process API: replaces the old Express backend. Dispatches a method + path
 * to a Supabase-backed handler. Used by lib/api.ts and the app/api proxy routes.
 */
export async function handleApi(
    method: string,
    fullPath: string,
    ctx: ApiContext
): Promise<HandlerResult> {
    const m = method.toUpperCase();
    const qIndex = fullPath.indexOf("?");
    const pathname = (qIndex >= 0 ? fullPath.slice(0, qIndex) : fullPath).replace(/\/+$/, "") || "/";
    const query = new URLSearchParams(qIndex >= 0 ? fullPath.slice(qIndex + 1) : "");
    const seg = pathname.split("/").filter(Boolean); // e.g. ["chats","12","messages"]
    const uid = ctx.userId;
    const body = (ctx.body ?? {}) as Record<string, never>;

    const requireAuth = (): number | null => uid;

    try {
        const root = seg[0];

        // ---------------- auth ----------------
        if (root === "auth") {
            if (m === "POST" && seg[1] === "login") return auth.login(ctx.body ?? {});
            if (m === "POST" && seg[1] === "register") {
                let avatarUrl: string | null = null;
                if (ctx.file) avatarUrl = await uploadBuffer(ctx.file.buffer, ctx.file.mimetype, "avatars");
                return auth.register(ctx.body ?? {}, avatarUrl);
            }
            if (m === "GET" && seg[1] === "me") {
                if (!uid) return unauth();
                return auth.me(uid);
            }
        }

        // ---------------- stats (public) ----------------
        if (root === "stats" && seg[1] === "public" && m === "GET") return stats.getPublicStats();

        // ---------------- chats ----------------
        if (root === "chats") {
            if (!uid) return unauth();
            if (m === "GET" && !seg[1]) return chat.getChats(uid);
            if (m === "GET" && seg[1] === "inbox") return chat.getInbox(uid, query);
            if (seg[2] === "messages" && !seg[3]) {
                const sid = Number(seg[1]);
                if (m === "GET") return chat.getMessages(uid, sid, query);
                if (m === "POST") {
                    let file: { buffer: Buffer; mimetype: string; uploadedUrl: string } | null = null;
                    if (ctx.file) {
                        const url = await uploadBuffer(ctx.file.buffer, ctx.file.mimetype, "chat");
                        file = { ...ctx.file, uploadedUrl: url };
                    }
                    return chat.sendMessage(uid, sid, ctx.body ?? {}, file);
                }
            }
            if (seg[2] === "messages" && seg[3]) {
                const sid = Number(seg[1]);
                const mid = Number(seg[3]);
                if (m === "PATCH") return chat.editMessage(uid, sid, mid, ctx.body ?? {});
                if (m === "DELETE") return chat.deleteMessage(uid, sid, mid);
            }
        }

        // ---------------- profiles ----------------
        if (root === "profiles") {
            if (!uid) return unauth();
            if (m === "GET" && !seg[1]) return profile.getProfile(uid);
            if (m === "PUT" && seg[1] === "basic") return profile.updateBasicProfile(uid, ctx.body ?? {});
            if (m === "PUT" && seg[1] === "languages") return profile.updateLanguages(uid, ctx.body ?? {});
            if (m === "PUT" && seg[1] === "hobbies") return profile.updateHobbies(uid, ctx.body ?? {});
            if (m === "PUT" && seg[1] === "purposes") return profile.updatePurposes(uid, ctx.body ?? {});
            if (m === "PUT" && seg[1] === "photo" && seg[2] === "main") return profile.updateMainPhoto(uid, ctx.body ?? {});
            if (m === "POST" && seg[1] === "photo") return profile.addPhoto(uid, ctx.body ?? {});
            if (m === "DELETE" && seg[1] === "photo" && seg[2]) return profile.deletePhoto(uid, Number(seg[2]));
            if (m === "GET" && seg[1] === "notifications") return notification.getNotifications(uid);
            if (m === "GET" && seg[1]) return profile.getUserProfile(uid, Number(seg[1]));
        }

        // ---------------- notifications ----------------
        if (root === "notifications") {
            if (!uid) return unauth();
            if (m === "GET" && !seg[1]) return notification.getNotifications(uid);
            if (m === "DELETE" && !seg[1]) return notification.deleteAllNotifications(uid);
            if (m === "PATCH" && seg[1] === "read-all") return notification.markAllRead(uid);
            if (m === "PATCH" && seg[2] === "read") return notification.markOneRead(uid, Number(seg[1]));
            if (m === "DELETE" && seg[1]) return notification.deleteOneNotification(uid, Number(seg[1]));
        }

        // ---------------- matchings ----------------
        if (root === "matchings") {
            if (m === "GET" && seg[1] === "filter-options") return matching.getFilterOptionsHandler();
            if (!uid) return unauth();
            if (m === "GET" && seg[1] === "home") return matching.matchingHome(uid, query);
            if (m === "GET" && seg[1] === "search") return matching.searchUsersHandler(uid, query);
            if (m === "POST" && seg[1] === "session") return matching.createMatchSession(uid, ctx.body ?? {});
            if (m === "POST" && seg[1] === "pass") return matching.passUser(uid, ctx.body ?? {});
            if (m === "POST" && seg[1] === "like") return matching.likeUser(uid, ctx.body ?? {});
            if (m === "POST" && seg[1] === "block") return matching.blockUser(uid, ctx.body ?? {});
            if (m === "POST" && seg[1] === "unblock") return matching.unblockUser(uid, ctx.body ?? {});
            if (m === "POST" && seg[1] === "report") {
                let evidenceUrl: string | null = null;
                if (ctx.file) evidenceUrl = await uploadBuffer(ctx.file.buffer, ctx.file.mimetype, "reports");
                return matching.reportUser(uid, ctx.body ?? {}, evidenceUrl);
            }
        }

        // ---------------- events ----------------
        if (root === "events") {
            if (m === "GET" && seg[1] === "public") return event.getPublicEvents(query);
            if (!uid) return unauth();
            if (m === "GET" && !seg[1]) return event.getEvents(uid, query);
            if (m === "POST" && !seg[1]) return event.createEvent(uid, ctx.body as Record<string, string>);
            if (m === "GET" && seg[1] === "my" && seg[2] === "list") return event.getMyEvents(uid, query);
            if (seg[1] && seg[2] === "engage") {
                const id = Number(seg[1]);
                if (m === "POST") return event.engageEvent(uid, id);
                if (m === "DELETE") return event.cancelEngagement(uid, id);
            }
            if (m === "PATCH" && seg[2] === "review") return event.reviewEvent(uid, Number(seg[1]), ctx.body ?? {});
            if (seg[1] && !seg[2]) {
                const id = Number(seg[1]);
                if (m === "GET") return event.getEventDetail(uid, id);
                if (m === "PUT") return event.updateEvent(uid, id, ctx.body as Record<string, string>);
                if (m === "DELETE") return event.deleteEvent(uid, id);
            }
        }

        // ---------------- posts ----------------
        if (root === "posts") {
            if (!uid) return unauth();
            if (m === "GET" && !seg[1]) return post.getPosts(uid, query);
            if (m === "POST" && !seg[1]) {
                let imageUrl: string | null = null;
                if (ctx.file) imageUrl = await uploadBuffer(ctx.file.buffer, ctx.file.mimetype, "posts");
                return post.createPost(uid, ctx.body ?? {}, imageUrl);
            }
            if (m === "POST" && seg[1] === "like") return post.likePost(uid, ctx.body ?? {});
            if (m === "POST" && seg[1] === "unlike") return post.unlikePost(uid, ctx.body ?? {});
            if (m === "POST" && seg[1] === "comment") return post.commentPost(uid, ctx.body ?? {});
            if (m === "GET" && seg[2] === "comments") return post.getCommentsByPost(Number(seg[1]), query);
        }

        // ---------------- groups ----------------
        if (root === "groups") {
            if (m === "GET" && seg[1] === "filter-options") return group.getGroupFilterOptions();
            if (!uid) return unauth();
            if (m === "GET" && !seg[1]) return group.getGroups(uid, query);
            if (m === "GET" && seg[1] === "community-home") return group.communityHome(uid);
            if (m === "GET" && seg[1] === "my-groups") return group.myGroups(uid);
            if (m === "GET" && seg[1] === "suggested") return group.suggestedGroups(uid);
            if (m === "GET" && seg[1] === "card") return group.groupCard(uid, Number(seg[2]));
            if (m === "GET" && seg[1] === "detail") return group.groupPage(uid, Number(seg[2]), query);
            if (m === "POST" && seg[1] === "join") return group.joinGroup(uid, ctx.body ?? {});
            if (m === "POST" && seg[1] === "leave") return group.leaveGroup(uid, ctx.body ?? {});
        }

        void body;
        void requireAuth;
        return notFound();
    } catch (err) {
        console.error(`[handleApi] ${m} ${pathname}`, err);
        return { status: 500, data: { error: "Internal Server Error" } };
    }
}
