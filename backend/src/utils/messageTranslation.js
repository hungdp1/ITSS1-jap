const prisma = require("../prismaClient");
const { translateText } = require("./translate");

const SUPPORTED_LANGUAGES = ["en", "vi", "ja", "ko", "zh-CN"];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.translateMessage = async (content, langs = SUPPORTED_LANGUAGES) => {
    const translations = {};

    for (const lang of langs) {
        translations[lang] = await translateText(content, lang);
        await delay(500);
    }

    return translations;
};

exports.scheduleMessageTranslation = (messageId, sessionId, content) => {
    if (!content?.trim()) return;

    setImmediate(async () => {
        try {
            const ja = await translateText(content.trim(), "ja");
            if (!ja) return;

            const translatedText = { ja };

            await prisma.message.update({
                where: { id: messageId },
                data: { translatedText },
            });

            global.io?.to(`session_${sessionId}`).emit("messageTranslated", {
                messageId,
                translatedText,
            });
        } catch (err) {
            console.error("[scheduleMessageTranslation]", err);
        }
    });
};
