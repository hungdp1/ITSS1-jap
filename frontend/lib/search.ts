export const SEARCH_DEBOUNCE_MS = 500;
export const MIN_SEARCH_LENGTH = 2;

/** Returns a trimmed query suitable for API search, or undefined if too short. */
export function normalizeSearchQuery(query: string | undefined | null): string | undefined {
    const trimmed = query?.trim();
    if (!trimmed || trimmed.length < MIN_SEARCH_LENGTH) return undefined;
    return trimmed;
}
