require("dotenv").config();

const DEEPL_TRANSLATE_URL_DEFAULT = "https://api-free.deepl.com/v2/translate";

/** App locale codes → DeepL target_lang (ISO 639-1, uppercase). */
const TARGET_LANG_MAP = {
    en: "EN",
    vi: "VI",
    ja: "JA",
    ko: "KO",
    "zh-CN": "ZH",
};

function getDeepLTranslateUrl() {
    const custom = process.env.DEEPL_API_URL?.trim();
    return (custom || DEEPL_TRANSLATE_URL_DEFAULT).replace(/\/$/, "");
}

function toDeepLTargetLang(target) {
    const normalized = String(target || "en").trim();
    return TARGET_LANG_MAP[normalized] || normalized.toUpperCase().replace("_", "-");
}

exports.translateText = async (text, target = "en") => {
    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey?.trim()) {
        console.error("[translateText] DEEPL_API_KEY is not set");
        return null;
    }

    const trimmed = text?.trim();
    if (!trimmed) return null;

    const targetLang = toDeepLTargetLang(target);

    try {
        const res = await fetch(getDeepLTranslateUrl(), {
            method: "POST",
            headers: {
                Authorization: `DeepL-Auth-Key ${apiKey.trim()}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text: [trimmed],
                target_lang: targetLang,
            }),
        });

        if (!res.ok) {
            const body = await res.text().catch(() => "");
            console.error("[translateText] DeepL API error", res.status, body);
            return null;
        }

        const data = await res.json();
        const translated = data?.translations?.[0]?.text;
        return typeof translated === "string" ? translated : null;
    } catch (err) {
        console.error("[translateText]", err);
        return null;
    }
};
