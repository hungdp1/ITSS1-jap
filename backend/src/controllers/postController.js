const prisma = require("../prismaClient");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

const POST_AUTHOR_SELECT = {
    id: true,
    firstName: true,
    lastName: true,
    avatarUrl: true,
};

async function assertGroupMember(groupId, userId) {
    const membership = await prisma.groupMember.findUnique({
        where: {
            userId_groupId: { userId, groupId },
        },
        select: { id: true },
    });

    if (!membership) {
        const err = new Error("Bạn cần tham gia nhóm để thực hiện hành động này");
        err.statusCode = 403;
        throw err;
    }
}

async function assertPostGroupMember(postId, userId) {
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, authorId: true, groupId: true },
    });

    if (!post) {
        const err = new Error("Post không tồn tại");
        err.statusCode = 404;
        throw err;
    }

    if (post.groupId != null) {
        await assertGroupMember(post.groupId, userId);
    }

    return post;
}

exports.createPost = async (req, res) => {
    try {
        const { content, groupId } = req.body;

        let image = null;

        const groupIdNum = Number(groupId);
        if (isNaN(groupIdNum)) {
            return res.status(400).json({ error: "groupId không hợp lệ" });
        }

        await assertGroupMember(groupIdNum, req.user.id);

        const room = `group_${groupIdNum}`;

        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer);
            image = result.secure_url;
        }



        const post = await prisma.post.create({
            data: {
                content,
                image,

                group: {
                    connect: { groupId: groupIdNum },
                },

                author: {
                    connect: { id: req.user.id },
                },
            },

            include: {
                author: { select: POST_AUTHOR_SELECT },
                group: { select: { groupId: true, name: true } },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                    },
                },
            },
        });
        const members = await prisma.groupMember.findMany({
            where: {
                groupId: groupIdNum,
                userId: { not: req.user.id },
            },
            select: { userId: true },
        });

        if (members.length > 0) {

            await prisma.notification.createMany({
                data: members.map(member => ({
                    userId: member.userId,

                    type: "NEW_POST",

                    message:
                        `${req.user.firstName} vừa đăng bài mới trong nhóm`,

                    relatedUserId: req.user.id,
                })),
            });

            members.forEach(member => {
                global.io
                    ?.to(`user_${member.userId}`)
                    .emit("newNotification", {
                        type: "NEW_POST",

                        message:
                            `${req.user.firstName} vừa đăng bài mới trong nhóm`,

                        relatedUserId: req.user.id,
                    });
            });
        }

        global.io.to(room).emit("newPost", post);

        res.json(post);

    } catch (error) {
        console.error("CREATE POST ERROR:", error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
};

/**
 * @param {number} groupIdNum
 * @param {number} userId
 * @param {number} pageNum
 * @param {number} limitNum
 */
async function loadGroupPosts(groupIdNum, userId, pageNum, limitNum) {
    const where = { groupId: groupIdNum };

    /** @type {any[]} */
    const [posts, total] = await Promise.all([
        prisma.post.findMany({
            where,
            take: limitNum,
            skip: (pageNum - 1) * limitNum,
            orderBy: { createdAt: "desc" },
            include: {
                author: { select: POST_AUTHOR_SELECT },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                    },
                },
            },
        }),
        prisma.post.count({ where }),
    ]);

    const likedPostIds =
        posts.length === 0
            ? []
            : await prisma.postLike.findMany({
                  where: {
                      userId,
                      postId: { in: posts.map((p) => p.id) },
                  },
                  select: { postId: true },
              });

    const likedSet = new Set(likedPostIds.map((l) => l.postId));

    const data = posts.map((p) => ({
        ...p,
        isLiked: likedSet.has(p.id),
    }));

    return { data, hasMore: pageNum * limitNum < total };
}

exports.loadGroupPosts = loadGroupPosts;

exports.getPosts = async (req, res) => {
    try {
        const pageNum = parseInt(req.query.page || "1", 10);
        const limitNum = parseInt(req.query.limit || "5", 10);
        const groupIdNum = parseInt(req.query.groupId, 10);

        if (isNaN(groupIdNum)) {
            return res.status(400).json({ error: "Thiếu groupId" });
        }

        const payload = await loadGroupPosts(groupIdNum, req.user.id, pageNum, limitNum);
        res.json(payload);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.likePost = async (req, res) => {
    try {
        const postId = Number(req.body.postId);

        await assertPostGroupMember(postId, req.user.id);

        const like = await prisma.postLike.upsert({
            where: {
                userId_postId: {
                    userId: req.user.id,
                    postId,
                },
            },
            create: {
                userId: req.user.id,
                postId,
            },
            update: {},
        });

        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { authorId: true },
        });

        if (post && post.authorId !== req.user.id) {
            const notification =
                await prisma.notification.create({
                    data: {
                        userId: post.authorId,

                        type: "POST_LIKE",

                        message:
                            `${req.user.firstName} đã thích bài viết của bạn`,

                        relatedUserId: req.user.id,
                    },
                });

            global.io
                ?.to(`user_${post.authorId}`)
                .emit("newNotification", notification);
        }

        const totalLikes = await prisma.postLike.count({
            where: { postId },
        });

        global.io.to(`post_${postId}`).emit("likeUpdated", {
            postId,
            totalLikes,
            userId: req.user.id,
        });

        res.json(like);
    } catch (error) {
        console.error("LIKE ERROR:", error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
};

exports.commentPost = async (req, res) => {
    try {
        const postId = Number(req.body.postId);
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({
                error: "Content không được để trống"
            });
        }

        const post = await assertPostGroupMember(postId, req.user.id);

        const comment = await prisma.comment.create({
            data: {
                content,

                post: {
                    connect: { id: postId },
                },

                author: {
                    connect: { id: req.user.id },
                },
            },

            include: {
                author: { select: POST_AUTHOR_SELECT },
            },
        });

        if (post.authorId !== req.user.id) {
            const notification = await prisma.notification.create({
                    data: {
                        userId: post.authorId,

                        type: "POST_COMMENT",

                        message:
                            `${req.user.firstName} đã bình luận bài viết của bạn`,

                        relatedUserId: req.user.id,
                    },
                });

            global.io
                ?.to(`user_${post.authorId}`)
                .emit("newNotification", notification);
        }

        const totalComments = await prisma.comment.count({
            where: { postId },
        });

        global.io.to(`post_${postId}`).emit("commentAdded", {
            postId,
            comment,
            totalComments,
        });

        res.json(comment);

    } catch (error) {
        console.error("COMMENT ERROR:", error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
};

exports.unlikePost = async (req, res) => {
    try {
        const postId = Number(req.body.postId);

        await assertPostGroupMember(postId, req.user.id);

        await prisma.postLike.deleteMany({
            where: {
                userId: req.user.id,
                postId,
            },
        });

        const totalLikes = await prisma.postLike.count({
            where: { postId },
        });

        global.io.to(`post_${postId}`).emit("likeUpdated", {
            postId,
            totalLikes,
            userId: req.user.id,
        });

        res.json({ message: "Unliked" });

    } catch (error) {
        console.error("UNLIKE ERROR:", error);
        res.status(error.statusCode || 500).json({ error: error.message });
    }
};

exports.getCommentsByPost = async (req, res) => {
    try {
        const { postId } = req.params;

        const page = parseInt(req.query.page || "1", 10);
        const limit = parseInt(req.query.limit || "10", 10);

        const skip = (page - 1) * limit;

        const postIdNum = Number(postId);

        const [comments, total] = await Promise.all([
            prisma.comment.findMany({
                where: { postId: postIdNum },
                orderBy: { createdAt: "asc" },
                skip,
                take: limit,
                include: {
                    author: { select: POST_AUTHOR_SELECT },
                },
            }),
            prisma.comment.count({
                where: { postId: postIdNum },
            }),
        ]);

        res.json({
            data: comments,
            pagination: {
                page,
                limit,
                total,
                hasMore: page * limit < total,
            },
        });

    } catch (error) {
        console.error("GET COMMENTS ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};