const router = require("express").Router();

const authMiddleware = require("../middleware/auth");

const {
    createEvent,
    getEvents,
    getPublicEvents,
    getEventDetail,
    updateEvent,
    deleteEvent,
    engageEvent,
    reviewEvent,
    cancelEngagement,
    getMyEvents,
} = require("../controllers/eventController");

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Tạo sự kiện
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *               eventTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.post("/", authMiddleware, createEvent);

/**
 * @swagger
 * /events:
 *   get:
 *     summary: Lấy danh sách sự kiện
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get("/", authMiddleware ,getEvents);

/**
 * @swagger
 * /events/{id}:
 *   put:
 *     summary: Cập nhật sự kiện
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thành công
 */
router.put("/:id", authMiddleware ,updateEvent);

/**
 * @swagger
 * /events/{id}:
 *   delete:
 *     summary: Xóa sự kiện
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thành công
 */
router.delete("/:id", authMiddleware ,deleteEvent);

/**
 * @swagger
 * /events/{id}/engage:
 *   post:
 *     summary: Tham gia sự kiện
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thành công
 */
router.post("/:id/engage", authMiddleware ,engageEvent);

router.patch("/:id/review", authMiddleware, reviewEvent);

router.get("/my/list", authMiddleware, getMyEvents);

router.get("/public", getPublicEvents);

router.delete("/:id/engage", authMiddleware, cancelEngagement);


/**
 * @swagger
 * /events/{id}:
 *   get:
 *     summary: Chi tiết sự kiện
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get("/:id", authMiddleware ,getEventDetail);

module.exports = router;