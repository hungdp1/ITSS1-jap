const router = require("express").Router();

const auth = require("../middleware/auth");

const {
    getGroups,
    getGroupFilterOptions,
    joinGroup,
    leaveGroup,
    myGroups,
    suggestedGroups,
    communityHome,
    groupCard,
    groupPage,
} = require("../controllers/groupController");

/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: Get all groups (with search & filters)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search group by name
 *       - in: query
 *         name: filterHobby
 *         schema:
 *           type: string
 *           example: "true"
 *       - in: query
 *         name: filterLevel
 *         schema:
 *           type: string
 *           example: "true"
 *     responses:
 *       200:
 *         description: List of groups
 *       401:
 *         description: Unauthorized
 */
router.get("/filter-options", getGroupFilterOptions);

router.get("/", auth, getGroups);

/**
 * @swagger
 * /api/groups/join:
 *   post:
 *     summary: Join a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *             properties:
 *               groupId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Joined group successfully
 *       400:
 *         description: Already joined group
 */
router.post("/join", auth, joinGroup);

/**
 * @swagger
 * /api/groups/leave:
 *   post:
 *     summary: Leave a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *             properties:
 *               groupId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Left group successfully
 */
router.post("/leave", auth, leaveGroup);

/**
 * @swagger
 * /api/groups/my-groups:
 *   get:
 *     summary: Get groups that user joined
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user groups
 */
router.get("/my-groups", auth, myGroups);

router.get("/community-home", auth, communityHome);

/**
 * @swagger
 * /api/groups/suggested:
 *   get:
 *     summary: Get recommended groups for user
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Suggested groups list with score
 */
router.get("/suggested", auth, suggestedGroups);

/**
 * @swagger
 * /api/groups/card/{groupId}:
 *   get:
 *     summary: Get group preview card
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Group ID
 *     responses:
 *       200:
 *         description: Group card data
 *       404:
 *         description: Group not found
 */
router.get("/card/:groupId", auth, groupCard);

router.get("/detail/:groupId", auth, groupPage);

module.exports = router;