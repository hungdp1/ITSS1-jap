/**
 * In-process TTL cache for read-heavy, low-churn queries (e.g. filter options).
 */

const store = new Map();

/**
 * @template T
 * @param {string} key
 * @param {number} ttlMs
 * @param {() => Promise<T>} fetcher
 * @returns {Promise<T>}
 */
async function cachedQuery(key, ttlMs, fetcher) {
    const entry = store.get(key);
    const now = Date.now();
    if (entry && now - entry.at < ttlMs) {
        return entry.value;
    }

    const value = await fetcher();
    store.set(key, { value, at: now });
    return value;
}

/**
 * @param {import("express").Response} res
 * @param {number} [maxAgeSeconds=300]
 */
function setPublicCacheHeaders(res, maxAgeSeconds = 300) {
    res.setHeader("Cache-Control", `public, max-age=${maxAgeSeconds}`);
}

/**
 * @param {string} [keyOrPrefix] Omit to clear all entries; pass exact key or prefix ending with ":"
 */
function invalidateCache(keyOrPrefix) {
    if (!keyOrPrefix) {
        store.clear();
        return;
    }

    if (!keyOrPrefix.endsWith(":")) {
        store.delete(keyOrPrefix);
        return;
    }

    for (const key of store.keys()) {
        if (key.startsWith(keyOrPrefix)) {
            store.delete(key);
        }
    }
}

module.exports = {
    cachedQuery,
    setPublicCacheHeaders,
    invalidateCache,
};
