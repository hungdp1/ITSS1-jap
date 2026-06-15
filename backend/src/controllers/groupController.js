const prisma = require("../prismaClient");
const { UserStatus } = require("@prisma/client");
const { cachedQuery, setPublicCacheHeaders } = require("../utils/queryCache");
const { normalizeSearchQuery } = require("../utils/searchUtils");

const DEFAULT_LANGUAGE_LEVELS = ["N1", "N2", "N3", "N4", "N5"];

const GROUP_FILTER_OPTIONS_CACHE_KEY = "groups:filter-options";
const GROUP_FILTER_OPTIONS_TTL_MS = 5 * 60 * 1000;

function sortJlptLevels(tags) {
    const orderSet = new Set(DEFAULT_LANGUAGE_LEVELS);
    const inOrder = DEFAULT_LANGUAGE_LEVELS.filter((level) => tags.includes(level));
    const rest = tags.filter((tag) => !orderSet.has(tag)).sort((a, b) => a.localeCompare(b, "ja"));
    return [...inOrder, ...rest];
}

async function loadGroupFilterOptionsPayload() {
    return cachedQuery(
        GROUP_FILTER_OPTIONS_CACHE_KEY,
        GROUP_FILTER_OPTIONS_TTL_MS,
        async () => {
            const verifiedUserFilter = {
                user: { status: UserStatus.VERIFIED },
            };

            const [hobbyRows, languageRows, userHobbyRows] = await Promise.all([
                prisma.groupHobbyTag.findMany({
                    select: { name: true },
                    distinct: ["name"],
                    orderBy: { name: "asc" },
                }),
                prisma.groupLanguageTag.findMany({
                    select: { name: true },
                    distinct: ["name"],
                    orderBy: { name: "asc" },
                }),
                prisma.userHobby.findMany({
                    where: verifiedUserFilter,
                    select: { hobbyName: true },
                    distinct: ["hobbyName"],
                    orderBy: { hobbyName: "asc" },
                }),
            ]);

            const hobbySet = new Set([
                ...hobbyRows.map((row) => row.name),
                ...userHobbyRows.map((row) => row.hobbyName),
            ]);

            const languageSet = new Set([
                ...DEFAULT_LANGUAGE_LEVELS,
                ...languageRows.map((row) => row.name),
            ]);

            return {
                hobbyTags: [...hobbySet].sort((a, b) => a.localeCompare(b, "ja")),
                languageTags: sortJlptLevels([...languageSet]),
            };
        },
    );
}

exports.getGroupFilterOptions = async (req, res) => {
    try {
        const payload = await loadGroupFilterOptionsPayload();

        setPublicCacheHeaders(res);
        res.json(payload);
    } catch (error) {
        console.error("GET GROUP FILTER OPTIONS ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.getGroups = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page || "1"), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || "10"), 1), 100);
        const { filterHobby, filterLanguage, search, hobbyTag, languageTag } = req.query;

        /** @type {any} */
        const currentUser = await prisma.verifiedUser.findUnique({
            where: { id: req.user.id },
            include: { hobbies: true, languages: true },
        });

        if (!currentUser) return res.status(404).json({ error: "User not found" });

        const myHobbies = currentUser.hobbies.map(h => h.hobbyName);
        const myLanguages = currentUser.languages.map(l => l.language);

        const where = {};

        const normalizedSearch = normalizeSearchQuery(search);
        if (normalizedSearch) {
            where.OR = [
                { name: { contains: normalizedSearch, mode: "insensitive" } },
                { description: { contains: normalizedSearch, mode: "insensitive" } },
            ];
        }
        if (filterHobby === "true") {
            where.hobbyTags = { some: { name: { in: myHobbies } } };
        }
        if (filterLanguage === "true") {
            where.languageTags = { some: { name: { in: myLanguages } } };
        }
        if (hobbyTag) {
            where.hobbyTags = { some: { name: hobbyTag } };
        }
        if (languageTag) {
            where.languageTags = { some: { name: languageTag } };
        }

        /** @type {any[]} */
        const [groups, total] = await Promise.all([
            prisma.group.findMany({
                where,
                include: {
                    hobbyTags: true,
                    languageTags: true,
                    _count: { select: { members: true, posts: true } },
                },
                orderBy: { memberCount: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.group.count({ where }),
        ]);

        res.json({ data: groups, total, hasMore: page * limit < total });

    } catch (error) {
        console.error("GET GROUPS ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.joinGroup = async (req, res) => {
    try {
        const groupId = Number(req.body.groupId);

        const existed = await prisma.groupMember.findUnique({
            where: {
                userId_groupId: {
                    userId: req.user.id,
                    groupId,
                },
            },
        });

        if (existed) {
            return res.status(400).json({
                error: "Already joined group",
            });
        }

        await prisma.$transaction([
            prisma.groupMember.create({
                data: {
                    userId: req.user.id,
                    groupId,
                },
            }),

            prisma.group.update({
                where: {
                    groupId,
                },
                data: {
                    memberCount: {
                        increment: 1,
                    },
                },
            }),
        ]);

        global.io.to(`group_${groupId}`).emit("groupJoined", {
            groupId,
            userId: req.user.id,
        });

        global.io.emit("refreshSuggestedGroups");
        global.io.emit("refreshMyGroups", {
            userId: req.user.id,
        });

        res.json({
            message: "Joined group",
        });

    } catch (error) {
        console.error("JOIN GROUP ERROR:", error);

        res.status(500).json({
            error: error.message,
        });
    }
};

exports.leaveGroup = async (req, res) => {
    try {
        const groupId = Number(req.body.groupId);

        const existed = await prisma.groupMember.findUnique({
            where: {
                userId_groupId: {
                    userId: req.user.id,
                    groupId,
                },
            },
        });

        if (!existed) {
            return res.status(400).json({
                error: "Not in group",
            });
        }

        await prisma.$transaction([
            prisma.groupMember.delete({
                where: {
                    userId_groupId: {
                        userId: req.user.id,
                        groupId,
                    },
                },
            }),

            prisma.group.update({
                where: {
                    groupId,
                },
                data: {
                    memberCount: {
                        decrement: 1,
                    },
                },
            }),
        ]);

        global.io.emit("groupLeft", {
            groupId,
            userId: req.user.id,
        });

        global.io.emit("refreshSuggestedGroups");

        global.io.emit("refreshMyGroups", {
            userId: req.user.id,
        });

        res.json({
            message: "Left group",
        });

    } catch (error) {
        console.error("LEAVE GROUP ERROR:", error);

        res.status(500).json({
            error: error.message,
        });
    }
};

exports.myGroups = async (req, res) => {
    try {
        /** @type {any[]} */
        const memberships = await prisma.groupMember.findMany({
            where: {
                userId: req.user.id,
            },
            select: {
                group: {
                    select: {
                        groupId: true,
                        name: true,
                        description: true,
                        groupAvatar: true,
                        groupCover: true,
                        memberCount: true,
                    },
                },
            },
            orderBy: { joinedAt: "desc" },
        });

        res.json(memberships.map((m) => m.group));
    } catch (error) {
        console.error("MY GROUPS ERROR:", error);

        res.status(500).json({
            error: error.message,
        });
    }
};

const SUGGESTED_CANDIDATE_LIMIT = 40;
const SUGGESTED_RESULT_LIMIT = 24;

/**
 * @param {any} user
 * @param {Set<number>} joinedIdSet
 */
async function buildSuggestedGroups(user, joinedIdSet) {
    const myHobbies = user.hobbies.map((h) => h.hobbyName.toLowerCase());
    const myLanguages = user.languages.map((l) => l.language.toLowerCase());

    /** @type {any[]} */
    const groups = await prisma.group.findMany({
        take: SUGGESTED_CANDIDATE_LIMIT,
        orderBy: { memberCount: "desc" },
        select: {
            groupId: true,
            name: true,
            description: true,
            groupAvatar: true,
            groupCover: true,
            memberCount: true,
            hobbyTags: { select: { name: true } },
            languageTags: { select: { name: true } },
            members: {
                take: 2,
                orderBy: { joinedAt: "desc" },
                select: {
                    user: { select: { avatarUrl: true } },
                },
            },
        },
    });

    const suggested = groups
        .map((group) => {
            let score = 0;

            group.hobbyTags.forEach((tag) => {
                if (myHobbies.includes(tag.name.toLowerCase())) {
                    score += 3;
                }
            });

            group.languageTags.forEach((tag) => {
                if (myLanguages.includes(tag.name.toLowerCase())) {
                    score += 2;
                }
            });

            score += group.memberCount * 0.1;

            if (joinedIdSet.has(group.groupId)) {
                score += 1;
            }

            return {
                ...group,
                memberCount: group.memberCount,
                _count: { members: group.memberCount },
                recommendScore: score,
                isJoined: joinedIdSet.has(group.groupId),
            };
        })
        .sort((a, b) => b.recommendScore - a.recommendScore)
        .slice(0, SUGGESTED_RESULT_LIMIT);

    return suggested;
}

exports.suggestedGroups = async (req, res) => {
    try {
        /** @type {any} */
        const [user, joinedGroups] = await Promise.all([
            prisma.verifiedUser.findUnique({
                where: { id: req.user.id },
                include: { hobbies: true, languages: true },
            }),
            prisma.groupMember.findMany({
                where: { userId: req.user.id },
                select: { groupId: true },
            }),
        ]);

        if (!user) return res.status(404).json({ error: "User not found" });

        const joinedIdSet = new Set(joinedGroups.map((g) => g.groupId));
        const suggested = await buildSuggestedGroups(user, joinedIdSet);

        res.json(suggested);
    } catch (error) {
        console.error("SUGGEST GROUP ERROR:", error);

        res.status(500).json({
            error: error.message,
        });
    }
};

exports.communityHome = async (req, res) => {
    try {
        const userId = req.user.id;

        /** @type {any} */
        const [user, memberships, filterOptions] = await Promise.all([
            prisma.verifiedUser.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    hobbies: { select: { hobbyName: true } },
                    languages: { select: { language: true } },
                },
            }),
            prisma.groupMember.findMany({
                where: { userId },
                select: {
                    group: {
                        select: {
                            groupId: true,
                            name: true,
                            description: true,
                            groupAvatar: true,
                            groupCover: true,
                            memberCount: true,
                        },
                    },
                },
                orderBy: { joinedAt: "desc" },
            }),
            loadGroupFilterOptionsPayload(),
        ]);

        if (!user) return res.status(404).json({ error: "User not found" });

        const myGroups = memberships.map((m) => m.group);
        const joinedIdSet = new Set(myGroups.map((g) => g.groupId));
        const suggested = await buildSuggestedGroups(user, joinedIdSet);

        res.json({ myGroups, suggested, filterOptions });
    } catch (error) {
        console.error("COMMUNITY HOME ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.groupCard = async (req, res) => {
    try {
        const groupIdNum = Number(req.params.groupId);

        /** @type {any} */
        const [group, membership] = await Promise.all([
            prisma.group.findUnique({
                where: { groupId: groupIdNum },
                include: {
                    hobbyTags: true,
                    languageTags: true,
                    _count: { select: { posts: true } },
                },
            }),
            prisma.groupMember.findUnique({
                where: {
                    userId_groupId: {
                        userId: req.user.id,
                        groupId: groupIdNum,
                    },
                },
                select: { id: true },
            }),
        ]);

        if (!group) {
            return res.status(404).json({
                error: "Group not found",
            });
        }

        res.json({
            groupId: group.groupId,
            name: group.name,
            description: group.description,
            groupAvatar: group.groupAvatar,
            groupCover: group.groupCover,
            totalMembers: group.memberCount,
            totalPosts: group._count.posts,
            hobbyTags: group.hobbyTags,
            languageTags: group.languageTags,
            isJoined: !!membership,
        });
    } catch (error) {
        console.error("GROUP CARD ERROR:", error);
        res.status(500).json({
            error: error.message,
        });
    }
};

exports.groupPage = async (req, res) => {
    try {
        const { loadGroupPosts } = require("./postController");
        const groupIdNum = Number(req.params.groupId);
        const pageNum = Math.max(parseInt(req.query.page || "1", 10), 1);
        const limitNum = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);

        /** @type {any} */
        const [group, membership, postsPayload] = await Promise.all([
            prisma.group.findUnique({
                where: { groupId: groupIdNum },
                include: {
                    hobbyTags: true,
                    languageTags: true,
                    _count: { select: { posts: true } },
                },
            }),
            prisma.groupMember.findUnique({
                where: {
                    userId_groupId: {
                        userId: req.user.id,
                        groupId: groupIdNum,
                    },
                },
                select: { id: true },
            }),
            loadGroupPosts(groupIdNum, req.user.id, pageNum, limitNum),
        ]);

        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        res.json({
            group: {
                groupId: group.groupId,
                name: group.name,
                description: group.description,
                groupAvatar: group.groupAvatar,
                groupCover: group.groupCover,
                totalMembers: group.memberCount,
                totalPosts: group._count.posts,
                hobbyTags: group.hobbyTags,
                languageTags: group.languageTags,
                isJoined: !!membership,
            },
            posts: postsPayload,
        });
    } catch (error) {
        console.error("GROUP PAGE ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};