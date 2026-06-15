const PLACEHOLDER_HOSTS = new Set(["example.com", "www.example.com"]);

export function resolveImageUrl(url?: string | null, fallback = "/assets/images/avatars/avatar.jpg") {
    const version = "?v=5";
    let resolvedUrl = url;

    if (!resolvedUrl?.trim()) {
        resolvedUrl = fallback;
    } else {
        try {
            const parsed = new URL(resolvedUrl, "http://localhost");
            if (PLACEHOLDER_HOSTS.has(parsed.hostname)) {
                resolvedUrl = fallback;
            }
        } catch {
            resolvedUrl = fallback;
        }
    }

    if (resolvedUrl.startsWith("/assets/images/avatars/")) {
        return resolvedUrl + version;
    }

    return resolvedUrl;
}
