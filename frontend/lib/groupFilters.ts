/** JLPT levels used for community group level filter (always available in UI). */
export const GROUP_LANGUAGE_LEVEL_OPTIONS = ["N1", "N2", "N3", "N4", "N5"] as const;

export function mergeUniqueSorted(...lists: string[][]): string[] {
    return [...new Set(lists.flat())].sort((a, b) => a.localeCompare(b, "ja"));
}

export function sortJlptLevels(tags: string[]): string[] {
    const order = new Set<string>(GROUP_LANGUAGE_LEVEL_OPTIONS);
    const inOrder = GROUP_LANGUAGE_LEVEL_OPTIONS.filter((level) => tags.includes(level));
    const rest = tags.filter((tag) => !order.has(tag)).sort((a, b) => a.localeCompare(b, "ja"));
    return [...inOrder, ...rest];
}
