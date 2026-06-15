const prisma = require("../prismaClient");

async function getOrCreateMatchSession(userId, targetUserId) {
    const existing = await prisma.matchSession.findFirst({
        where: {
            participants: {
                some: { userId },
            },
            AND: {
                participants: {
                    some: { userId: targetUserId },
                },
            },
        },
        include: {
            participants: true,
        },
    });

    if (existing && existing.participants.length === 2) {
        return existing;
    }

    return prisma.matchSession.create({
        data: {
            status: "ACTIVE",
            participants: {
                create: [{ userId }, { userId: targetUserId }],
            },
        },
        include: {
            participants: true,
        },
    });
}

async function findMatchSessionId(userId, targetUserId) {
    const session = await prisma.matchSession.findFirst({
        where: {
            participants: {
                some: { userId },
            },
            AND: {
                participants: {
                    some: { userId: targetUserId },
                },
            },
        },
        select: { id: true },
    });

    return session?.id ?? null;
}

async function hasMutualLike(userId, targetUserId) {
    const [myLike, theirLike] = await Promise.all([
        prisma.userProfileAction.findUnique({
            where: {
                actorId_targetId_action: {
                    actorId: userId,
                    targetId: targetUserId,
                    action: "LIKE",
                },
            },
            select: { actorId: true },
        }),
        prisma.userProfileAction.findUnique({
            where: {
                actorId_targetId_action: {
                    actorId: targetUserId,
                    targetId: userId,
                    action: "LIKE",
                },
            },
            select: { actorId: true },
        }),
    ]);

    return Boolean(myLike && theirLike);
}

module.exports = {
    getOrCreateMatchSession,
    findMatchSessionId,
    hasMutualLike,
};
