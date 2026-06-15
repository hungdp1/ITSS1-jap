import "server-only";

/**
 * Keyless translation. Primary: Google's public `gtx` endpoint (no API key).
 * Fallback: MyMemory. Returns the translated string, or null on failure.
 *
 * App locale codes -> translation source/target (ISO 639-1).
 */
const LANG_MAP: Record<string, string> = {
    en: "en",
    vi: "vi",
    ja: "ja",
    ko: "ko",
    "zh-CN": "zh-CN",
};

function normalizeLang(code: string): string {
    return LANG_MAP[code] || code;
}

async function translateGoogle(text: string, target: string): Promise<string | null> {
    const url =
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" +
        encodeURIComponent(target) +
        "&dt=t&q=" +
        encodeURIComponent(text);
    const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    // Shape: [[["translated","source",...], ...], ...]
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
    const out = data[0]
        .map((seg: unknown) => (Array.isArray(seg) ? seg[0] : ""))
        .join("");
    return typeof out === "string" && out.trim() ? out : null;
}

async function translateMyMemory(text: string, target: string): Promise<string | null> {
    const url =
        "https://api.mymemory.translated.net/get?q=" +
        encodeURIComponent(text) +
        "&langpair=" +
        encodeURIComponent(`autodetect|${target}`);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const out = data?.responseData?.translatedText;
    return typeof out === "string" && out.trim() ? out : null;
}

export async function translateText(
    text: string,
    target = "ja"
): Promise<string | null> {
    const trimmed = text?.trim();
    if (!trimmed) return null;
    const tl = normalizeLang(target);
    try {
        const g = await translateGoogle(trimmed, tl);
        if (g) return g;
    } catch {
        /* fall through */
    }
    try {
        return await translateMyMemory(trimmed, tl);
    } catch {
        return null;
    }
}

/** Rough heuristic: does the text contain Japanese kana/kanji? */
export function looksJapanese(text: string): boolean {
    return /[぀-ヿ㐀-鿿]/.test(text);
}
