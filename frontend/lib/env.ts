/** Client-safe API / socket URL helpers (no server-only imports). */

export function getApiBaseUrl(): string {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
    if (!raw) {
        if (typeof window !== "undefined") {
            return `${window.location.origin}/api`;
        }
        // Fallback for SSR/build-time
        return "http://127.0.0.1:5001/api";
    }
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
        return raw.replace(/\/$/, "");
    }
    return `https://${raw.replace(/\/$/, "")}`;
}

/** Socket.IO server origin (strips /api from API base URL). */
export function getSocketBaseUrl(): string {
    const fromEnv = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
    if (fromEnv) {
        if (fromEnv.startsWith("http://") || fromEnv.startsWith("https://")) {
            return fromEnv.replace(/\/$/, "");
        }
        return `https://${fromEnv.replace(/\/$/, "")}`;
    }

    if (typeof window !== "undefined") {
        return window.location.origin;
    }

    try {
        return getApiBaseUrl().replace(/\/api$/, "");
    } catch {
        return "http://127.0.0.1:5001";
    }
}
