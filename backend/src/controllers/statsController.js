const prisma = require("../prismaClient");
const { UserStatus } = require("@prisma/client");
const { cachedQuery, setPublicCacheHeaders } = require("../utils/queryCache");

const PUBLIC_STATS_CACHE_KEY = "stats:public";
const PUBLIC_STATS_TTL_MS = 60 * 1000;

async function loadPublicStatsPayload() {
    const [activeUserCount, recentUsers] = await Promise.all([
        prisma.verifiedUser.count({
            where: { status: UserStatus.VERIFIED },
        }),
        prisma.verifiedUser.findMany({
            where: {
                status: UserStatus.VERIFIED,
                avatarUrl: { not: null },
            },
            select: { avatarUrl: true },
            orderBy: { createdAt: "desc" },
            take: 3,
        }),
    ]);

    return {
        activeUserCount,
        recentAvatars: recentUsers
            .map((user) => user.avatarUrl)
            .filter((url) => typeof url === "string" && url.trim()),
    };
}

exports.getPublicStats = async (req, res) => {
    try {
        const payload = await cachedQuery(
            PUBLIC_STATS_CACHE_KEY,
            PUBLIC_STATS_TTL_MS,
            loadPublicStatsPayload
        );

        setPublicCacheHeaders(res, 60);
        return res.json(payload);
    } catch (err) {
        console.error("[getPublicStats]", err);
        return res.status(500).json({ error: err.message });
    }
};
