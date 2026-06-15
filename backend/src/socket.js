const { Server } = require("socket.io");
const prisma = require("./prismaClient");

const onlineUsers = new Map();

function addOnlineUser(userId, socketId) {
    if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socketId);
}

function removeOnlineUser(userId, socketId) {
    if (!onlineUsers.has(userId)) return false;
    const sockets = onlineUsers.get(userId);
    sockets.delete(socketId);
    if (sockets.size === 0) {
        onlineUsers.delete(userId);
        return true;
    }
    return false;
}

function isUserOnline(userId) {
    return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
}

async function getUserSessionIds(userId) {
    const rows = await prisma.matchParticipant.findMany({
        where: { userId },
        select: { sessionId: true },
    });
    return rows.map((r) => r.sessionId);
}

function emitOnlineStatusToSessions(io, sessionIds, payload) {
    for (const sessionId of sessionIds) {
        io.to(`session_${sessionId}`).emit("onlineStatus", payload);
    }
}

function initSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
            methods: ["GET", "POST"],
        },
    });

    global.io = io;

    const socketUserMap = new Map();
    const socketSessionMap = new Map();

    io.on("connection", (socket) => {
        socket.on("userOnline", async (userId) => {
            const uid = Number(userId);
            if (!uid) return;

            socketUserMap.set(socket.id, uid);
            addOnlineUser(uid, socket.id);
            socket.join(`user_${uid}`);

            const sessionIds = await getUserSessionIds(uid);
            socketSessionMap.set(socket.id, sessionIds);
            for (const sessionId of sessionIds) {
                socket.join(`session_${sessionId}`);
            }

            emitOnlineStatusToSessions(io, sessionIds, { userId: uid, online: true });
        });

        socket.on("disconnect", async () => {
            const userId = socketUserMap.get(socket.id);
            if (userId) {
                const isFullyOffline = removeOnlineUser(userId, socket.id);
                const sessionIds = socketSessionMap.get(socket.id) || [];
                socketUserMap.delete(socket.id);
                socketSessionMap.delete(socket.id);

                if (isFullyOffline) {
                    emitOnlineStatusToSessions(io, sessionIds, { userId, online: false });
                }
            }
        });

        socket.on("joinSession", (sessionId) => {
            socket.join(`session_${sessionId}`);
        });

        socket.on("leaveSession", (sessionId) => {
            socket.leave(`session_${sessionId}`);
        });

        socket.on("typingSession", ({ sessionId, user }) => {
            socket.to(`session_${sessionId}`).emit("typingSession", { user });
        });

        socket.on("stopTypingSession", ({ sessionId, user }) => {
            socket.to(`session_${sessionId}`).emit("stopTypingSession", { user });
        });

        socket.on("seenMessage", ({ sessionId, userId }) => {
            socket.to(`session_${sessionId}`).emit("seenMessage", { sessionId, userId });
        });

        socket.on("editMessage", ({ sessionId, messageId, newContent }) => {
            socket.to(`session_${sessionId}`).emit("messageEdited", {
                messageId,
                newContent,
                editedAt: new Date(),
            });
        });

        socket.on("deleteMessage", ({ sessionId, messageId }) => {
            socket.to(`session_${sessionId}`).emit("messageDeleted", { messageId });
        });

        socket.on("joinGroupRoom", (groupId) => {
            socket.join(`group_${groupId}`);
        });

        socket.on("leaveGroupRoom", (groupId) => {
            socket.leave(`group_${groupId}`);
        });

        socket.on("typing", ({ groupId, user }) => {
            socket.to(`group_${groupId}`).emit("typing", { user });
        });

        socket.on("stopTyping", ({ groupId, user }) => {
            socket.to(`group_${groupId}`).emit("stopTyping", { user });
        });
    });

    return io;
}

module.exports = { initSocket, isUserOnline };
