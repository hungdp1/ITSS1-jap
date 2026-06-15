const prisma = require("../prismaClient");

async function createUserNotification({ userId, type, message, relatedUserId, sessionId }) {
    const notification = await prisma.notification.create({
        data: {
            userId,
            type,
            message,
            relatedUserId: relatedUserId ?? null,
            sessionId: sessionId ?? null,
        },
    });

    global.io?.to(`user_${userId}`).emit("newNotification", {
        id: notification.id,
        type: notification.type,
        message: notification.message,
        relatedUserId: notification.relatedUserId,
        sessionId: notification.sessionId,
        createdAt: notification.createdAt,
    });

    return notification;
}

module.exports = { createUserNotification };
