const prisma = require("../prismaClient");
const { isUserOnline } = require("../socket");
const uploadToCloudinary = require("../utils/uploadToCloudinary");
const { scheduleMessageTranslation } = require("../utils/messageTranslation");
const { loadBlockStatusMap, assertChatNotBlocked } = require("../utils/chatBlockHelper");

const CHAT_SESSION_LIMIT = 80;

/**
 * Latest message per session (one indexed query).
 * @param {number[]} sessionIds
 */
async function loadLastMessagesBySession(sessionIds) {
    if (sessionIds.length === 0) return new Map();

    const rows = await prisma.message.findMany({
        where: {
            sessionId: { in: sessionIds },
            deletedAt: null,
        },
        orderBy: { sendAt: "desc" },
        distinct: ["sessionId"],
        select: {
            id: true,
            sessionId: true,
            senderId: true,
            content: true,
            sendAt: true,
            messageType: true,
            attachmentUrl: true,
            isSeen: true,
            translatedText: true,
            editedAt: true,
            sender: {
                select: { id: true, firstName: true },
            },
        },
    });

    return new Map(
        rows.map((row) => [
            row.sessionId,
            {
                id: row.id,
                sessionId: row.sessionId,
                senderId: row.senderId,
                content: row.content,
                sendAt: row.sendAt,
                messageType: row.messageType,
                attachmentUrl: row.attachmentUrl,
                isSeen: row.isSeen,
                translatedText: row.translatedText,
                editedAt: row.editedAt,
                sender: row.sender,
            },
        ])
    );
}

/**
 * @param {number} userId
 */
async function loadChatsForUser(userId) {
    const participantRows = await prisma.matchParticipant.findMany({
        where: { userId },
        select: {
            sessionId: true,
            session: {
                select: {
                    id: true,
                    createdAt: true,
                    participants: {
                        select: {
                            userId: true,
                            user: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    avatarUrl: true,
                                    status: true,
                                },
                            },
                        },
                    },
                },
            },
        },
        take: CHAT_SESSION_LIMIT,
        orderBy: { session: { createdAt: "desc" } },
    });

    if (participantRows.length === 0) return [];

    const sessionIds = participantRows.map((row) => row.sessionId);

    const [lastMessageBySession, unreadCounts] = await Promise.all([
        loadLastMessagesBySession(sessionIds),
        prisma.message.groupBy({
            by: ["sessionId"],
            where: {
                sessionId: { in: sessionIds },
                senderId: { not: userId },
                isSeen: false,
                deletedAt: null,
            },
            _count: { _all: true },
        }),
    ]);

    const unreadMap = Object.fromEntries(
        unreadCounts.map((row) => [row.sessionId, row._count._all])
    );

    const chats = participantRows.map((row) => {
        const session = row.session;
        const targetUser = session.participants.find((p) => p.userId !== userId);
        return {
            id: session.id,
            createdAt: session.createdAt,
            targetUser: targetUser?.user
                ? {
                      ...targetUser.user,
                      isOnline: isUserOnline(targetUser.user.id),
                  }
                : null,
            lastMessage: lastMessageBySession.get(session.id) ?? null,
            unreadCount: unreadMap[session.id] || 0,
        };
    });

    chats.sort((a, b) => {
        const aTime = a.lastMessage?.sendAt ?? a.createdAt;
        const bTime = b.lastMessage?.sendAt ?? b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    const targetUserIds = chats
        .map((chat) => chat.targetUser?.id)
        .filter((id) => typeof id === "number");

    const blockStatusMap = await loadBlockStatusMap(userId, targetUserIds);

    return chats.map((chat) => ({
        ...chat,
        blockStatus:
            blockStatusMap.get(chat.targetUser?.id ?? -1) ?? {
                blockedByMe: false,
                blockedByThem: false,
            },
    }));
}

/**
 * @param {number} userId
 * @param {number} sessionId
 * @param {number} page
 * @param {number} limit
 */
function markSessionMessagesSeen(userId, sessionId) {
    void prisma.message
        .updateMany({
            where: {
                sessionId,
                senderId: { not: userId },
                isSeen: false,
                deletedAt: null,
            },
            data: { isSeen: true },
        })
        .then(() => {
            global.io?.to(`session_${sessionId}`).emit("seenMessage", {
                sessionId,
                userId,
            });
        })
        .catch((err) => {
            console.error("[markSessionMessagesSeen]", err);
        });
}

async function loadMessagesForSession(userId, sessionId, page, limit) {
    const participant = await prisma.matchParticipant.findFirst({
        where: { sessionId, userId },
        select: { sessionId: true },
    });
    if (!participant) return null;

    /** @type {any[]} */
    const messages = await prisma.message.findMany({
        where: {
            sessionId,
            deletedAt: null,
        },
        include: {
            sender: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                },
            },
        },
        orderBy: { sendAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
    });

    if (page === 1) {
        markSessionMessagesSeen(userId, sessionId);
    }

    return messages.reverse();
}

exports.loadMessagesForSession = loadMessagesForSession;

exports.getChats = async (req, res) => {
    try {
        const formatted = await loadChatsForUser(req.user.id);
        return res.json(formatted);
    } catch (err) {
        console.error("[getChats]", err);
        return res.status(500).json({ error: "Lấy danh sách chat thất bại" });
    }
};

exports.getInbox = async (req, res) => {
    try {
        const userId = req.user.id;
        const preferredSessionId = req.query.sessionId
            ? Number(req.query.sessionId)
            : null;
        const includeMessages = req.query.includeMessages !== "false";
        const messageLimit = Math.min(
            Math.max(Number(req.query.messagesLimit || 50), 1),
            100
        );

        if (!includeMessages) {
            const chats = await loadChatsForUser(userId);
            const activeSessionId =
                preferredSessionId && chats.some((c) => c.id === preferredSessionId)
                    ? preferredSessionId
                    : chats[0]?.id ?? null;
            return res.json({ chats, messages: [], activeSessionId });
        }

        if (preferredSessionId) {
            const [chats, loaded] = await Promise.all([
                loadChatsForUser(userId),
                loadMessagesForSession(userId, preferredSessionId, 1, messageLimit),
            ]);

            let activeSessionId =
                chats.some((c) => c.id === preferredSessionId)
                    ? preferredSessionId
                    : chats[0]?.id ?? null;

            let messages = loaded ?? [];

            if (
                messages.length === 0 &&
                activeSessionId &&
                activeSessionId !== preferredSessionId
            ) {
                const fallback = await loadMessagesForSession(
                    userId,
                    activeSessionId,
                    1,
                    messageLimit
                );
                if (fallback) messages = fallback;
            } else if (!chats.some((c) => c.id === preferredSessionId)) {
                activeSessionId = chats[0]?.id ?? null;
                if (activeSessionId && messages.length === 0) {
                    const fallback = await loadMessagesForSession(
                        userId,
                        activeSessionId,
                        1,
                        messageLimit
                    );
                    if (fallback) messages = fallback;
                }
            }

            return res.json({ chats, messages, activeSessionId });
        }

        const chats = await loadChatsForUser(userId);
        const activeSessionId = chats[0]?.id ?? null;

        let messages = [];
        if (activeSessionId) {
            const loaded = await loadMessagesForSession(
                userId,
                activeSessionId,
                1,
                messageLimit
            );
            if (loaded) messages = loaded;
        }

        return res.json({ chats, messages, activeSessionId });
    } catch (err) {
        console.error("[getInbox]", err);
        return res.status(500).json({ error: "Lấy hộp thư chat thất bại" });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const sessionId = Number(req.params.sessionId);
        const page = Math.max(Number(req.query.page || 1), 1);
        const limit = Math.max(Number(req.query.limit || 20), 1);

        const messages = await loadMessagesForSession(userId, sessionId, page, limit);
        if (messages === null) {
            return res.status(403).json({ error: "Access denied" });
        }

        return res.json(messages);
    } catch (err) {
        console.error("[getMessages]", err);
        return res.status(500).json({ error: "Lấy tin nhắn thất bại" });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const sessionId = Number(req.params.sessionId);
        const senderId  = req.user.id;

        const {
            content: rawContent,
            messageType: requestedType = "TEXT",
            attachmentUrl: bodyAttachmentUrl,
        } = req.body;

        let content = typeof rawContent === "string" ? rawContent.trim() : "";
        let attachmentUrl = bodyAttachmentUrl || null;
        let messageType = requestedType;

        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, "chat");
            attachmentUrl = result.secure_url;
            messageType = req.file.mimetype.startsWith("image/") ? "IMAGE" : "FILE";
        }

        if (!content && !attachmentUrl) {
            return res.status(400).json({
                error: "Tin nhắn không được trống",
            });
        }

        const participant = await prisma.matchParticipant.findFirst({
            where: { sessionId, userId: senderId },
            select: { sessionId: true },
        });

        if (!participant) {
            return res.status(403).json({
                error: "Access denied",
            });
        }

        const receiver = await prisma.matchParticipant.findFirst({
            where: {
                sessionId,
                userId: { not: senderId },
            },
            select: { userId: true },
        });

        if (receiver) {
            try {
                await assertChatNotBlocked(senderId, receiver.userId);
            } catch (blockErr) {
                return res.status(blockErr.status || 403).json({
                    error: blockErr.message,
                    code: blockErr.code || "CHAT_BLOCKED",
                });
            }
        }

        const message = await prisma.message.create({
            data: {
                sessionId,
                senderId,
                content: content || null,
                translatedText: null,
                messageType,
                attachmentUrl,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        global.io
            ?.to(`session_${sessionId}`)
            .emit("newMessage", message);

        res.status(201).json(message);

        void (async () => {
            try {
                if (receiver) {
                    const notification =
                        await prisma.notification.create({
                            data: {
                                userId: receiver.userId,
                                type: "NEW_MESSAGE",
                                message: content
                                    ? `${req.user.firstName}: ${content}`
                                    : `${req.user.firstName} đã gửi một tệp`,
                                relatedUserId: senderId,
                                sessionId,
                            },
                        });

                    global.io
                        ?.to(`user_${receiver.userId}`)
                        .emit("newNotification", notification);
                }

                if (content) {
                    scheduleMessageTranslation(
                        message.id,
                        sessionId,
                        content
                    );
                }
            } catch (err) {
                console.error("[background]", err);
            }
        })();

    } catch (err) {
        console.error("[sendMessage]", err);

        return res.status(500).json({
            error: "Gửi tin nhắn thất bại",
        });
    }
};

exports.editMessage = async (req, res) => {
    try {
        const sessionId = Number(req.params.sessionId);
        const messageId = Number(req.params.messageId);

        /** @type {any} */
        const message = await prisma.message.findUnique({ where: { id: messageId } });
        const userId    = req.user.id;
        const { content } = req.body;

        if (!content?.trim()) {
            return res.status(400).json({ error: "Nội dung không được trống" });
        }

        if (message.sessionId !== sessionId) {
            return res.status(403).json({
                error: "Message không thuộc session này"
            });
        }

        if (!message) return res.status(404).json({ error: "Tin nhắn không tồn tại" });
        if (message.senderId !== userId) return res.status(403).json({ error: "Không có quyền sửa tin nhắn này" });
        if (message.deletedAt) return res.status(400).json({ error: "Không thể sửa tin nhắn đã xoá" });
        if (message.messageType !== "TEXT") return res.status(400).json({ error: "Chỉ có thể sửa tin nhắn text" });

        /** @type {any} */
        const updated = await prisma.message.update({
            where: { id: messageId },
            data: { content: content.trim(), translatedText: null, editedAt: new Date() },
            include: {
                sender: {
                    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
            },
        });

        global.io?.to(`session_${sessionId}`).emit("messageEdited", updated);

        scheduleMessageTranslation(messageId, sessionId, content.trim());

        return res.json(updated);
    } catch (err) {
        console.error("[editMessage]", err);
        return res.status(500).json({ error: "Chỉnh sửa tin nhắn thất bại" });
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const sessionId = Number(req.params.sessionId);
        const messageId = Number(req.params.messageId);
        /** @type {any} */
        const message = await prisma.message.findUnique({ where: { id: messageId } });
        const userId    = req.user.id;

        if (message.sessionId !== sessionId) {
            return res.status(403).json({
                error: "Message không thuộc session này"
            });
        }

        if (!message) return res.status(404).json({ error: "Tin nhắn không tồn tại" });
        if (message.senderId !== userId) return res.status(403).json({ error: "Không có quyền xoá tin nhắn này" });
        if (message.deletedAt) return res.status(400).json({ error: "Tin nhắn đã bị xoá" });

        await prisma.message.update({
            where: { id: messageId },
            data: { deletedAt: new Date(), content: null },
        });

        global.io?.to(`session_${sessionId}`).emit("messageDeleted", { messageId });

        return res.json({ message: "Đã xoá tin nhắn" });
    } catch (err) {
        console.error("[deleteMessage]", err);
        return res.status(500).json({ error: "Xoá tin nhắn thất bại" });
    }
};