const router = require("express").Router();

const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/upload");

const {
    searchUsers,
    matchingHome,
    getFilterOptions,
    createMatchSession,
} = require("../controllers/matchingController");
const {
    passUser,
    likeUser,
    blockUser,
    unblockUser,
    reportUser,
} = require("../controllers/profileInteractionController");

/**
 * @swagger
 * /matching/search:
 *   get:
 *     summary: Tìm kiếm user matching
 *     tags: [Matching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get("/filter-options", getFilterOptions);

router.get("/home", authMiddleware, matchingHome);

router.get("/search", authMiddleware, searchUsers);

router.post("/session", authMiddleware, createMatchSession);
router.post("/pass", authMiddleware, passUser);
router.post("/like", authMiddleware, likeUser);
router.post("/block", authMiddleware, blockUser);
router.post("/unblock", authMiddleware, unblockUser);
router.post("/report", authMiddleware, upload.single("evidence"), reportUser);

module.exports = router;