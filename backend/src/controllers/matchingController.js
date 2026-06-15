const prisma = require("../prismaClient");
const { UserStatus } = require("@prisma/client");
const { cachedQuery, setPublicCacheHeaders } = require("../utils/queryCache");
const { splitPurposeValues } = require("../utils/purposeUtils");
const { normalizeSearchQuery } = require("../utils/searchUtils");
const { hasMutualLike } = require("../utils/matchSessionHelper");

const USER_LIST_SELECT = {
    id: true,
    firstName: true,
    lastName: true,
    location: true,
    avatarUrl: true,
    hobbies: { select: { hobbyName: true } },
    languages: { select: { language: true, type: true, level: true } },
    purposes: { select: { purpose: true } },
};

const FILTER_OPTIONS_CACHE_KEY = "matching:filter-options";
const FILTER_OPTIONS_TTL_MS = 5 * 60 * 1000;

const NATIONALITY_LANGUAGE_VALUES = {
    日本: ["日本", "日本語"],
    ベトナム: ["ベトナム", "ベトナム語"],
};

function relationExactMatch(value) {
    return value.trim();
}

function buildProfileExclusionFilter(userId) {
    return {
        NOT: {
            OR: [
                {
                    profileActionsReceived: {
                        some: {
                            actorId: userId,
                            action: { in: ["PASS", "BLOCK"] },
                        },
                    },
                },
                {
                    profileActionsSent: {
                        some: {
                            targetId: userId,
                            action: "BLOCK",
                        },
                    },
                },
            ],
        },
    };
}

async function loadFilterOptionsPayload() {
    return cachedQuery(FILTER_OPTIONS_CACHE_KEY, FILTER_OPTIONS_TTL_MS, async () => {
        const verifiedUserFilter = {
            user: { status: UserStatus.VERIFIED },
        };

        const [purposeRows, hobbyRows] = await Promise.all([
            prisma.userPurpose.findMany({
                where: verifiedUserFilter,
                select: { purpose: true },
            }),
            prisma.userHobby.findMany({
                where: verifiedUserFilter,
                select: { hobbyName: true },
                distinct: ["hobbyName"],
                orderBy: { hobbyName: "asc" },
            }),
        ]);

        const purposeSet = new Set();

        for (const row of purposeRows) {
            for (const value of splitPurposeValues(row.purpose)) {
                purposeSet.add(value);
            }
        }

        return {
            purposes: [...purposeSet].sort((a, b) => a.localeCompare(b, "ja")),
            hobbies: hobbyRows
                .map((row) => row.hobbyName)
                .sort((a, b) => a.localeCompare(b, "ja")),
        };
    });
}

/**
 * @param {number} userId
 * @param {Record<string, string | undefined>} query
 */
async function searchUsersForUser(userId, query) {
    const page = Math.max(parseInt(query.page || "1", 10), 1);
    const limit = 12;
    const skip = (page - 1) * limit;

    const { search, hobby, language, purpose, jlptLevel } = query;

    const conditions = [
        { status: UserStatus.VERIFIED },
        { id: { not: userId } },
        buildProfileExclusionFilter(userId),
    ];

    const normalizedSearch = normalizeSearchQuery(search);

    if (normalizedSearch) {
        const s = normalizedSearch;

        conditions.push({
            OR: [
                { firstName: { contains: s, mode: "insensitive" } },
                { lastName: { contains: s, mode: "insensitive" } },
            ],
        });
    }

    if (hobby?.trim()) {
        conditions.push({
            hobbies: {
                some: {
                    hobbyName: relationExactMatch(hobby),
                },
            },
        });
    }

    if (language?.trim()) {
        const trimmed = language.trim();
        const nationalityValues = NATIONALITY_LANGUAGE_VALUES[trimmed];

        conditions.push({
            languages: {
                some: nationalityValues
                    ? {
                        type: "native",
                        language: { in: nationalityValues },
                    }
                    : {
                        type: "native",
                        language: relationExactMatch(trimmed),
                    },
            },
        });
    }

    if (purpose?.trim()) {
        conditions.push({
            purposes: {
                some: {
                    purpose: relationExactMatch(purpose),
                },
            },
        });
    }

    if (jlptLevel?.trim()) {
        const levels = jlptLevel
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        conditions.push({
            languages: {
                some: {
                    level: { in: levels },
                },
            },
        });
    }

    const where = { AND: conditions };

    const users = await prisma.verifiedUser.findMany({
        where,
        select: USER_LIST_SELECT,
        skip,
        take: limit + 1,
        orderBy: { id: "asc" },
    });

    const hasMore = users.length > limit;

    if (hasMore) {
        users.pop();
    }

    let total;

    if (page > 1) {
        total = undefined;
    } else if (!hasMore) {
        total = users.length;
    } else {
        total = await prisma.verifiedUser.count({ where });
    }

    const data = users.map((user) => ({
        ...user,
        score:
            (user.hobbies.length ? 2 : 0) +
            (user.languages.length ? 2 : 0) +
            (user.purposes.length ? 1 : 0),
    }));

    return {
        data,
        total,
        hasMore: page > 1 ? hasMore : hasMore || (total != null && page * limit < total),
    };
}

exports.searchUsers = async (req, res) => {
    try {
        const payload = await searchUsersForUser(req.user.id, req.query);
        res.json(payload);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.matchingHome = async (req, res) => {
    try {
        const [filterOptions, search] = await Promise.all([
            loadFilterOptionsPayload(),
            searchUsersForUser(req.user.id, { ...req.query, page: "1" }),
        ]);

        res.json({ filterOptions, search });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getFilterOptions = async (req, res) => {
    try {
        const payload = await loadFilterOptionsPayload();
        setPublicCacheHeaders(res);
        res.json(payload);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createMatchSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { targetUserId } = req.body;

        if (!targetUserId) {
            return res.status(400).json({
                error: "targetUserIdが必要です。",
            });
        }

        if (userId === targetUserId) {
            return res.status(400).json({
                error: "自分自身とはチャットを開始できません。",
            });
        }

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
            return res.json(existing);
        }

        const mutual = await hasMutualLike(userId, targetUserId);

        if (!mutual) {
            return res.status(403).json({
                error: "お互いにいいねしてマッチングが成立するまで、チャットを開始できません。",
                code: "MUTUAL_MATCH_REQUIRED",
            });
        }

        const session = await prisma.matchSession.create({
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

        const targetUser = await prisma.verifiedUser.findUnique({
            where: { id: targetUserId },
            select: {
                firstName: true,
                lastName: true,
            },
        });

        const currentUser = await prisma.verifiedUser.findUnique({
            where: { id: userId },
            select: {
                firstName: true,
                lastName: true,
            },
        });

        const currentUserName = [currentUser?.firstName, currentUser?.lastName]
            .filter(Boolean)
            .join(" ") || "ユーザー";

        const targetUserName = [targetUser?.firstName, targetUser?.lastName]
            .filter(Boolean)
            .join(" ") || "ユーザー";

        const targetNotification = await prisma.notification.create({
            data: {
                userId: targetUserId,
                type: "MATCH_SUCCESS",
                message: `${currentUserName}さんとマッチングしました。`,
                relatedUserId: userId,
                sessionId: session.id,
            },
        });

        global.io?.to(`user_${targetUserId}`).emit("newNotification", targetNotification);

        const myNotification = await prisma.notification.create({
            data: {
                userId,
                type: "MATCH_SUCCESS",
                message: `${targetUserName}さんとマッチングしました。`,
                relatedUserId: targetUserId,
                sessionId: session.id,
            },
        });

        global.io?.to(`user_${userId}`).emit("newNotification", myNotification);

        return res.status(201).json(session);
    } catch (err) {
        console.error("[createMatchSession]", err);
        return res.status(500).json({ error: err.message });
    }
};