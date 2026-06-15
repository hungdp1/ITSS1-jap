const prisma = require("../prismaClient");

/**
 * @param {{ actorId: number, targetId: number } | null} block
 * @param {number} viewerId
 */
function formatBlockStatus(block, viewerId) {
    if (!block) {
        return { blockedByMe: false, blockedByThem: false };
    }

    return {
        blockedByMe: block.actorId === viewerId,
        blockedByThem: block.targetId === viewerId,
    };
}

/**
 * @param {number} viewerId
 * @param {number} otherUserId
 */
async function getBlockStatusBetween(viewerId, otherUserId) {
    const block = await prisma.userProfileAction.findFirst({
        where: {
            action: "BLOCK",
            OR: [
                { actorId: viewerId, targetId: otherUserId },
                { actorId: otherUserId, targetId: viewerId },
            ],
        },
        select: { actorId: true, targetId: true },
    });

    return formatBlockStatus(block, viewerId);
}

/**
 * @param {number} viewerId
 * @param {number[]} targetUserIds
 */
async function loadBlockStatusMap(viewerId, targetUserIds) {
    const uniqueIds = [...new Set(targetUserIds.filter(Boolean))];
    if (uniqueIds.length === 0) return new Map();

    const rows = await prisma.userProfileAction.findMany({
        where: {
            action: "BLOCK",
            OR: [
                { actorId: viewerId, targetId: { in: uniqueIds } },
                { actorId: { in: uniqueIds }, targetId: viewerId },
            ],
        },
        select: { actorId: true, targetId: true },
    });

    const map = new Map();
    for (const row of rows) {
        const otherId = row.actorId === viewerId ? row.targetId : row.actorId;
        map.set(otherId, formatBlockStatus(row, viewerId));
    }
    return map;
}

/**
 * Chặn gửi tin khi có block giữa hai người (cả người block và người bị block).
 * @param {number} senderId
 * @param {number} receiverId
 */
async function assertChatNotBlocked(senderId, receiverId) {
    const block = await prisma.userProfileAction.findFirst({
        where: {
            action: "BLOCK",
            OR: [
                { actorId: senderId, targetId: receiverId },
                { actorId: receiverId, targetId: senderId },
            ],
        },
        select: { actorId: true, targetId: true },
    });

    if (!block) return null;

    const err = new Error(
        block.actorId === senderId
            ? "このユーザーをブロックしています。メッセージを送信するにはブロックを解除してください。"
            : "相手にブロックされました。メッセージを送信できません。"
    );
    err.status = 403;
    err.code = "CHAT_BLOCKED";
    throw err;
}

module.exports = {
    formatBlockStatus,
    getBlockStatusBetween,
    loadBlockStatusMap,
    assertChatNotBlocked,
};
