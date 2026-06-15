const router = require("express").Router();

const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

const {
    createPost,
    getPosts,
    likePost,
    unlikePost,
    commentPost,
    getCommentsByPost
} = require("../controllers/postController");

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get posts by group
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 5
 *     responses:
 *       200:
 *         description: List posts
 *       400:
 *         description: Missing groupId
 */
router.get("/", auth, getPosts);

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create a post in group
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - groupId
 *             properties:
 *               content:
 *                 type: string
 *                 example: Hello group!
 *               groupId:
 *                 type: integer
 *                 example: 1
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Optional image
 *     responses:
 *       200:
 *         description: Post created successfully
 */
router.post("/", auth, upload.single("image"), createPost);

/**
 * @swagger
 * /api/posts/like:
 *   post:
 *     summary: Like a post (idempotent)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postId
 *             properties:
 *               postId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Liked successfully
 */
router.post("/like", auth, likePost);

/**
 * @swagger
 * /api/posts/unlike:
 *   post:
 *     summary: Unlike a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postId
 *             properties:
 *               postId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Unliked successfully
 */
router.post("/unlike", auth, unlikePost);

/**
 * @swagger
 * /api/posts/comment:
 *   post:
 *     summary: Comment on a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postId
 *               - content
 *             properties:
 *               postId:
 *                 type: integer
 *                 example: 1
 *               content:
 *                 type: string
 *                 example: Nice post!
 *     responses:
 *       200:
 *         description: Comment created successfully
 *       400:
 *         description: Content required
 *       404:
 *         description: Post not found
 */
router.post("/comment", auth, commentPost);

/**
 * @swagger
 * /api/posts/{postId}/comments:
 *   get:
 *     summary: Get comments of a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: List comments
 */
router.get("/:postId/comments", auth, getCommentsByPost);

module.exports = router;