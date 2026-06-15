const prisma = require("../prismaClient");
const { UserStatus } = require("@prisma/client");
const { getDisplayName } = require("../utils/profileFormatter");
const { getOrCreateMatchSession, findMatchSessionId } = require("../utils/matchSessionHelper");
const { formatBlockStatus } = require("../utils/chatBlockHelper");
const { createUserNotification } = require("../utils/notificationHelper");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

async function assertTargetUser(targetUserId, actorId) {
    if (!targetUserId || Number.isNaN(targetUserId)) {
        const err = new Error("Invalid target user");
        err.status = 400;
        throw err;
    }

    if (targetUserId === actorId) {
        const err = new Error("Cannot perform this action on yourself");
        err.status = 400;
        throw err;
    }

    const target = await prisma.verifiedUser.findUnique({
        where: { id: targetUserId, status: UserStatus.VERIFIED },
        select: { id: true, firstName: true, lastName: true },
    });

    if (!target) {
        const err = new Error("User not found");
        err.status = 404;
        throw err;
    }

    return target;
}

async function upsertAction(actorId, targetId, action) {
    return prisma.userProfileAction.upsert({
        where: {
            actorId_targetId_action: {
                actorId,
                targetId,
                action,
            },
        },
        create: { actorId, targetId, action },
        update: { createdAt: new Date() },
    });
}

async function checkMutualLike(actorId, targetUserId) {
    return prisma.userProfileAction.findUnique({
        where: {
            actorId_targetId_action: {
                actorId: targetUserId,
                targetId: actorId,
                action: "LIKE",
            },
        },
    });
}

async function handleMutualMatch(actorId, targetUserId) {
    const actor = await prisma.verifiedUser.findUnique({
        where: { id: actorId },
        select: { firstName: true, lastName: true },
    });
    const target = await prisma.verifiedUser.findUnique({
        where: { id: targetUserId },
        select: { firstName: true, lastName: true },
    });

    const actorName = getDisplayName(actor || {});
    const targetName = getDisplayName(target || {});
    const session = await getOrCreateMatchSession(actorId, targetUserId);

    const matchMessageForActor = `${targetName}さんとマッチングが成立しました！`;
    const matchMessageForTarget = `${actorName}さんとマッチングが成立しました！`;

    await Promise.all([
        createUserNotification({
            userId: actorId,
            type: "MATCH",
            message: matchMessageForActor,
            relatedUserId: targetUserId,
            sessionId: session.id,
        }),
        createUserNotification({
            userId: targetUserId,
            type: "MATCH",
            message: matchMessageForTarget,
            relatedUserId: actorId,
            sessionId: session.id,
        }),
    ]);

    return session;
}

exports.passUser = async (req, res) => {
    try {
        const actorId = req.user.id;
        const targetUserId = Number(req.body.targetUserId);
        await assertTargetUser(targetUserId, actorId);
        await upsertAction(actorId, targetUserId, "PASS");
        return res.json({ message: "Passed", targetUserId });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ error: err.message });
    }
};

exports.likeUser = async (req, res) => {
    try {
        const actorId = req.user.id;
        const targetUserId = Number(req.body.targetUserId);
        await assertTargetUser(targetUserId, actorId);

        const existing = await prisma.userProfileAction.findUnique({
            where: {
                actorId_targetId_action: {
                    actorId,
                    targetId: targetUserId,
                    action: "LIKE",
                },
            },
        });

        await upsertAction(actorId, targetUserId, "LIKE");

        let matched = false;
        let sessionId = null;

        if (!existing) {
            const actor = await prisma.verifiedUser.findUnique({
                where: { id: actorId },
                select: { firstName: true, lastName: true },
            });
            const actorName = getDisplayName(actor || {});

            await createUserNotification({
                userId: targetUserId,
                type: "PROFILE_LIKE",
                message: `${actorName}さんがあなたのプロフィールにいいねしました`,
                relatedUserId: actorId,
            });

            const reciprocal = await checkMutualLike(actorId, targetUserId);
            if (reciprocal) {
                const session = await handleMutualMatch(actorId, targetUserId);
                matched = true;
                sessionId = session.id;
            }
        } else {
            const reciprocal = await checkMutualLike(actorId, targetUserId);
            if (reciprocal) {
                const session = await getOrCreateMatchSession(actorId, targetUserId);
                matched = true;
                sessionId = session.id;
            }
        }

        return res.json({
            message: matched ? "Matched" : "Liked",
            targetUserId,
            alreadyLiked: !!existing,
            matched,
            sessionId,
        });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ error: err.message });
    }
};

exports.blockUser = async (req, res) => {
    try {
        const actorId = req.user.id;
        const targetUserId = Number(req.body.targetUserId);
        await assertTargetUser(targetUserId, actorId);
        await upsertAction(actorId, targetUserId, "BLOCK");

        const sessionId = await findMatchSessionId(actorId, targetUserId);
        const blockStatusForActor = formatBlockStatus(
            { actorId, targetId: targetUserId },
            actorId
        );
        const blockStatusForTarget = formatBlockStatus(
            { actorId, targetId: targetUserId },
            targetUserId
        );

        const payload = {
            sessionId,
            blockedByUserId: actorId,
            blockedTargetUserId: targetUserId,
        };

        global.io?.to(`user_${targetUserId}`).emit("chatBlocked", payload);
        global.io?.to(`user_${actorId}`).emit("chatBlocked", payload);
        if (sessionId) {
            global.io?.to(`session_${sessionId}`).emit("chatBlocked", payload);
        }

        return res.json({
            message: "Blocked",
            targetUserId,
            sessionId,
            blockStatus: blockStatusForActor,
        });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ error: err.message });
    }
};

exports.unblockUser = async (req, res) => {
    try {
        const actorId = req.user.id;
        const targetUserId = Number(req.body.targetUserId);
        await assertTargetUser(targetUserId, actorId);

        await prisma.userProfileAction.deleteMany({
            where: {
                actorId,
                targetId: targetUserId,
                action: "BLOCK",
            },
        });

        const sessionId = await findMatchSessionId(actorId, targetUserId);
        const clearedStatus = { blockedByMe: false, blockedByThem: false };
        const payload = {
            sessionId,
            unblockedByUserId: actorId,
            unblockedTargetUserId: targetUserId,
        };

        global.io?.to(`user_${targetUserId}`).emit("chatUnblocked", payload);
        global.io?.to(`user_${actorId}`).emit("chatUnblocked", payload);
        if (sessionId) {
            global.io?.to(`session_${sessionId}`).emit("chatUnblocked", payload);
        }

        return res.json({
            message: "Unblocked",
            targetUserId,
            sessionId,
            blockStatus: clearedStatus,
        });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ error: err.message });
    }
};

exports.reportUser = async (req, res) => {
    try {
        const actorId = req.user.id;
        const targetUserId = Number(req.body.targetUserId);
        const reason = (req.body.reason || "").trim();

        if (!reason) {
            return res.status(400).json({ error: "理由を入力してください" });
        }

        await assertTargetUser(targetUserId, actorId);

        let evidenceUrl = null;
        if (req.file) {
            const uploaded = await uploadToCloudinary(req.file.buffer, "reports");
            evidenceUrl = uploaded.secure_url;
        }

        const reportCase = await prisma.reportCase.create({
            data: {
                reason,
                evidenceUrl,
                status: "APPROVED",
                parties: {
                    create: [
                        { userId: actorId, partyRole: "REPORTER" },
                        { userId: targetUserId, partyRole: "REPORTED" },
                    ],
                },
            },
        });

        return res.status(201).json({
            message: "Report submitted",
            caseId: reportCase.id,
        });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ error: err.message });
    }
};
