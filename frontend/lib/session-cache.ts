type CacheEntry<T> = {
    value: T;
    at: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export function readSessionCache<T>(key: string, ttlMs: number): T | null {
    const entry = store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.at > ttlMs) {
        store.delete(key);
        return null;
    }
    return entry.value;
}

export function writeSessionCache<T>(key: string, value: T): void {
    store.set(key, { value, at: Date.now() });
}

export function invalidateSessionCache(key: string): void {
    store.delete(key);
}
