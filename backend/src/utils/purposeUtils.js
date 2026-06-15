function splitPurposeValues(purpose) {
    if (!purpose || typeof purpose !== "string") return [];
    return purpose
        .split(/[,、]/)
        .map((s) => s.trim())
        .filter(Boolean);
}

module.exports = { splitPurposeValues };
