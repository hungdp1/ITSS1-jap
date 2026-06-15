const MIN_SEARCH_LENGTH = 2;

function normalizeSearchQuery(search) {
    const trimmed = typeof search === "string" ? search.trim() : "";
    if (!trimmed || trimmed.length < MIN_SEARCH_LENGTH) return undefined;
    return trimmed;
}

module.exports = { MIN_SEARCH_LENGTH, normalizeSearchQuery };
