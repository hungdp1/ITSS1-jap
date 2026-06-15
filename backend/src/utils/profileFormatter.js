const prisma = require("../prismaClient");
const { KycStatus, UserStatus } = require("@prisma/client");
const { splitPurposeValues } = require("./purposeUtils");

function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age -= 1;
    }
    return age;
}

function getDisplayName(user) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return name || "ユーザー";
}

function isNativeLanguageEntry(lang) {
    if (lang.type === "native") return true;
    if (lang.type === "learning") return false;
    // Legacy signup: nationality stored as language without type
    return lang.language === "日本" || lang.language === "ベトナム";
}

function formatLanguageEntry(lang) {
    const isNative = isNativeLanguageEntry(lang);
    const levelText = isNative
        ? "ネイティブ"
        : lang.level
          ? `学習中 (${lang.level}相当)`
          : "学習中";

    return {
        name: lang.language,
        levelText,
        levelType: isNative ? "native" : "learning",
        jlptLevel: lang.level ?? null,
        type: lang.type ?? (isNative ? "native" : "learning"),
        level: lang.level ?? null,
        proficiency: getProficiencyPercent(lang),
    };
}

function getProficiencyPercent(lang) {
    if (isNativeLanguageEntry(lang)) return 95;
    const level = (lang.level || "").toUpperCase();
    if (level === "N1") return 95;
    if (level === "N2") return 85;
    if (level === "N3") return 60;
    if (level === "N4" || level === "N5") return 40;
    return 50;
}

function getPurposeEmoji(purpose) {
    const text = purpose.toLowerCase();
    if (text.includes("言語") || text.includes("学習")) return "🌐";
    if (text.includes("文化")) return "🏮";
    if (text.includes("友")) return "👋";
    if (text.includes("ビジネス")) return "💼";
    return "✨";
}

function buildGallery(user) {
    const photos = [];
    if (user.avatarUrl) photos.push(user.avatarUrl);
    for (const photo of user.userPhotos || []) {
        if (photo.url && !photos.includes(photo.url)) {
            photos.push(photo.url);
        }
    }
    for (const post of user.posts || []) {
        if (post.image && !photos.includes(post.image)) {
            photos.push(post.image);
        }
    }
    for (const comment of user.comments || []) {
        const image = comment.post?.image;
        if (image && !photos.includes(image)) {
            photos.push(image);
        }
    }
    return photos.length > 0 ? photos : ["/assets/images/avatars/avatar.jpg"];
}

async function getIsVerified(userId) {
    const approved = await prisma.kycRequest.findFirst({
        where: { userId, status: KycStatus.APPROVED },
    });
    return !!approved;
}

async function getMutualFriendsCount(viewerId, targetId) {
    const [viewerGroups, targetGroups] = await Promise.all([
        prisma.groupMember.findMany({
            where: { userId: viewerId },
            select: { groupId: true },
        }),
        prisma.groupMember.findMany({
            where: { userId: targetId },
            select: { groupId: true },
        }),
    ]);

    const viewerGroupIds = viewerGroups.map((g) => g.groupId);
    const targetGroupIds = new Set(targetGroups.map((g) => g.groupId));

    if (viewerGroupIds.length === 0 || targetGroupIds.size === 0) return 0;

    const sharedGroupIds = viewerGroupIds.filter((id) => targetGroupIds.has(id));
    if (sharedGroupIds.length === 0) return 0;

    const candidates = await prisma.groupMember.findMany({
        where: {
            groupId: { in: sharedGroupIds },
            userId: { notIn: [viewerId, targetId] },
        },
        select: { userId: true },
        distinct: ["userId"],
    });

    return candidates.length;
}

async function getUpcomingEvent(userId) {
    const engagements = await prisma.eventEngagement.findMany({
        where: { userId },
        include: { event: true },
        take: 20,
    });

    const now = new Date();
    const upcoming = engagements
        .map((e) => e.event)
        .filter((event) => event && new Date(event.eventTime) > now && event.status !== "cancelled")
        .sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime));

    const event = upcoming[0];
    if (!event) return null;

    const eventDate = new Date(event.eventTime);

    return {
        id: event.id,
        title: event.title,
        dateLabel: `${eventDate.getMonth() + 1}/${eventDate.getDate()}`,
        timeLabel: eventDate.toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
        }),
        statusLabel: "参加予定",
    };
}

const { findMatchSessionId, hasMutualLike } = require("./matchSessionHelper");

async function getViewerInteraction(viewerId, targetId) {
    if (!viewerId || !targetId) {
        return {
            isLiked: false,
            hasPassed: false,
            isMutualMatch: false,
            chatSessionId: null,
        };
    }

    const actions = await prisma.userProfileAction.findMany({
        where: {
            actorId: viewerId,
            targetId,
            action: { in: ["LIKE", "PASS"] },
        },
        select: { action: true },
    });

    const actionSet = new Set(actions.map((a) => a.action));
    const isLiked = actionSet.has("LIKE");
    const hasPassed = actionSet.has("PASS");

    const [isMutualMatch, chatSessionId] = await Promise.all([
        isLiked ? hasMutualLike(viewerId, targetId) : Promise.resolve(false),
        findMatchSessionId(viewerId, targetId),
    ]);

    return {
        isLiked,
        hasPassed,
        isMutualMatch,
        chatSessionId,
    };
}

async function formatProfile(user, options = {}) {
    const { viewerId = null, viewType = "own" } = options;

    const [isVerified, mutualFriendsCount, upcomingEvent, interaction] =
        await Promise.all([
            getIsVerified(user.id),
            viewType === "other" && viewerId
                ? getMutualFriendsCount(viewerId, user.id)
                : Promise.resolve(0),
            viewType === "other"
                ? getUpcomingEvent(user.id)
                : Promise.resolve(null),
            viewType === "other" && viewerId
                ? getViewerInteraction(viewerId, user.id)
                : Promise.resolve({
                      isLiked: false,
                      hasPassed: false,
                      isMutualMatch: false,
                      chatSessionId: null,
                  }),
        ]);

    const purposeLabels = [];
    const seenPurposeLabels = new Set();
    for (const entry of user.purposes || []) {
        for (const label of splitPurposeValues(entry.purpose)) {
            if (seenPurposeLabels.has(label)) continue;
            seenPurposeLabels.add(label);
            purposeLabels.push(label);
        }
    }
    const purposes = purposeLabels.map((label) => ({
        label,
        emoji: getPurposeEmoji(label),
    }));

    const languages = (user.languages || []).map(formatLanguageEntry);

    const interests = (user.hobbies || []).map((h) => ({
        name: h.hobbyName,
        icon: getHobbyIcon(h.hobbyName),
    }));

    const gallery = buildGallery(user);

    return {
        id: user.id,
        name: getDisplayName(user),
        firstName: user.firstName,
        lastName: user.lastName,
        age: calculateAge(user.dateOfBirth),
        location: user.location || "—",
        bio: user.bio || "",
        avatarUrl: user.avatarUrl || gallery[0],
        gallery,
        isVerified,
        isOnline: false,
        mutualFriendsCount,
        purposes,
        languages,
        interests,
        upcomingEvent,
        viewType,
        isLiked: interaction.isLiked,
        hasPassed: interaction.hasPassed,
        isMutualMatch: interaction.isMutualMatch,
        chatSessionId: interaction.chatSessionId,
    };
}

function getHobbyIcon(hobbyName) {
    const map = {
        デジタルアート: "🎨",
        ベトナム料理: "🍜",
        バックパッカー: "✈️",
        語源学: "📖",
        アニメ: "🎬",
        料理: "🍳",
        プログラミング: "💻",
        歴史: "📜",
        写真: "📷",
    };
    return map[hobbyName] || "✨";
}

module.exports = {
    calculateAge,
    formatProfile,
    getDisplayName,
};
