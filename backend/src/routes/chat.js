const router = require("express").Router();

const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/upload");

const {
    getChats,
    getInbox,
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
} = require("../controllers/chatController");

router.get("/inbox", authMiddleware, getInbox);

router.get(
    "/",
    authMiddleware,
    getChats
);

router.get(
    "/:sessionId/messages",
    authMiddleware,
    getMessages
);

router.post(
    "/:sessionId/messages",
    authMiddleware,
    upload.single("attachment"),
    sendMessage
);

router.patch(
    "/:sessionId/messages/:messageId",
    authMiddleware,
    editMessage
);

router.delete(
    "/:sessionId/messages/:messageId",
    authMiddleware,
    deleteMessage
);
module.exports = router;