const router = require("express").Router();

const authMiddleware = require("../middleware/auth");

const {
    getProfile,
    getUserProfile,
    updateBasicProfile,
    updateHobbies,
    updatePurposes,
    updateLanguages,
    updateMainPhoto,
    addPhoto,
    deletePhoto,
    getNotifications
} = require("../controllers/profileController");

/**
 * @swagger
 * tags:
 *   - name: Profile
 *     description: API quản lý hồ sơ người dùng
 *   - name: Matching
 *     description: API tìm kiếm người dùng
 *   - name: Events
 *     description: API quản lý sự kiện
 */

/**
 * =========================
 * PROFILE ROUTES
 * =========================
 */

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Lấy thông tin profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get("/", authMiddleware, getProfile);

/**
 * @swagger
 * /profile/basic:
 *   put:
 *     summary: Cập nhật thông tin cơ bản
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               bio:
 *                 type: string
 *               location:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put("/basic", authMiddleware, updateBasicProfile);

/**
 * @swagger
 * /profile/languages:
 *   put:
 *     summary: Cập nhật ngôn ngữ
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Thành công
 */
router.put("/languages", authMiddleware, updateLanguages);

/**
 * @swagger
 * /profile/hobbies:
 *   put:
 *     summary: Cập nhật sở thích
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hobbies:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Thành công
 */
router.put("/hobbies", authMiddleware, updateHobbies);

/**
 * @swagger
 * /profile/purposes:
 *   put:
 *     summary: Cập nhật mục đích giao lưu
 *     tags: [Profile]
 */
router.put("/purposes", authMiddleware, updatePurposes);

/**
 * @swagger
 * /profile/photo/main:
 *   put:
 *     summary: Đổi ảnh đại diện chính
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.put("/photo/main", authMiddleware, updateMainPhoto);

/**
 * @swagger
 * /profile/photo:
 *   post:
 *     summary: Upload ảnh mới
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Upload thành công
 */
router.post("/photo", authMiddleware, addPhoto);

/**
 * @swagger
 * /profile/photo/{id}:
 *   delete:
 *     summary: Xóa ảnh
 *     tags: [Profile]
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
 *         description: Xóa thành công
 */
router.delete("/photo/:id", authMiddleware, deletePhoto);

/**
 * @swagger
 * /profile/notifications:
 *   get:
 *     summary: Lấy danh sách thông báo
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get("/notifications", authMiddleware, getNotifications);

/**
 * @swagger
 * /profile/{userId}:
 *   get:
 *     summary: Lấy profile người dùng (bản thân hoặc đối phương)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get("/:userId", authMiddleware, getUserProfile);

module.exports = router;