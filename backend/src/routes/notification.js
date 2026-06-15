const router = require("express").Router();

const authMiddleware = require("../middleware/auth");

const {
    getNotifications,
    markAllRead,
    deleteAllNotifications,
    markOneRead,
    deleteOneNotification,
} = require("../controllers/notificationController");

router.get("/", authMiddleware, getNotifications);

router.patch("/read-all", authMiddleware, markAllRead);

router.delete("/", authMiddleware, deleteAllNotifications);

router.patch("/:id/read", authMiddleware, markOneRead);

router.delete("/:id", authMiddleware, deleteOneNotification);

module.exports = router;