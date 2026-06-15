const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const uploadMiddleware = require("../middleware/upload");

const authController = require("../controllers/authController");

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register new user (KYC flow)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - language
 *               - purpose
 *               - cccd
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@gmail.com
 *               password:
 *                 type: string
 *                 example: 123456
 *               language:
 *                 type: string
 *                 example: English
 *               purpose:
 *                 type: string
 *                 example: Study abroad
 *               cccd:
 *                 type: string
 *                 format: binary
 *                 description: Upload CCCD image
 *     responses:
 *       200:
 *         description: Register success
 *       400:
 *         description: Missing fields or invalid input
 *       500:
 *         description: Server error
 */
router.post(
    "/register",
    uploadMiddleware.single("cccd"),
    authController.register
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@gmail.com
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Login success (return token + user)
 *       400:
 *         description: Wrong credentials
 *       403:
 *         description: Account not verified
 */
router.post(
    "/login",
    authController.login
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user info
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get(
    "/me",
    authMiddleware,
    authController.me
);

module.exports = router;