export const MESSAGE_TRANSLATION_LANGS = ["en", "vi", "ja", "ko", "zh-CN"] as const;

export type MessageTranslationLang = (typeof MESSAGE_TRANSLATION_LANGS)[number];

export type MessageTranslations = Partial<Record<MessageTranslationLang, string | null>>;

export function resolveTranslatedText(
    translatedText: string | MessageTranslations | null | undefined,
    preferredLang: MessageTranslationLang = "ja"
): string | null {
    if (!translatedText) return null;
    if (typeof translatedText === "string") return translatedText;

    const direct = translatedText[preferredLang];
    if (typeof direct === "string" && direct.trim()) return direct;

    for (const lang of MESSAGE_TRANSLATION_LANGS) {
        const value = translatedText[lang];
        if (typeof value === "string" && value.trim()) return value;
    }

    return null;
}
