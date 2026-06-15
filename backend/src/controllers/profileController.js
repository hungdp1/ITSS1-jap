const prisma = require("../prismaClient");
const { invalidateCache } = require("../utils/queryCache");
const { UserStatus } = require("@prisma/client");
const { formatProfile } = require("../utils/profileFormatter");

const profileInclude = {
    hobbies: true,
    languages: true,
    purposes: true,
    userPhotos: true,
    posts: {
        where: { image: { not: null } },
        select: { image: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 12,
    },
    comments: {
        select: {
            post: {
                select: { image: true, createdAt: true },
            },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
    },
};

exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.verifiedUser.findUnique({
            where: { id: userId },
            include: profileInclude,
        });
        if (!user) return res.status(404).json({ message: "User not found" });

        const profile = await formatProfile(user, {
            viewerId: userId,
            viewType: "own",
        });

        res.json(profile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const targetId = Number(req.params.userId);
        const viewerId = Number(req.user.id);

        if (!targetId || Number.isNaN(targetId)) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        if (targetId === viewerId) {
            const user = await prisma.verifiedUser.findUnique({
                where: { id: viewerId },
                include: profileInclude,
            });
            if (!user) return res.status(404).json({ message: "User not found" });
            const profile = await formatProfile(user, {
                viewerId,
                viewType: "own",
            });
            return res.json(profile);
        }

        const blocked = await prisma.userProfileAction.findFirst({
            where: {
                OR: [
                    { actorId: viewerId, targetId, action: "BLOCK" },
                    { actorId: targetId, targetId: viewerId, action: "BLOCK" },
                ],
            },
        });

        if (blocked) {
            return res.status(403).json({ message: "このユーザーのプロフィールは表示できません。" });
        }

        const user = await prisma.verifiedUser.findUnique({
            where: { id: targetId, status: UserStatus.VERIFIED },
            include: profileInclude,
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const profile = await formatProfile(user, {
            viewerId,
            viewType: "other",
        });

        res.json(profile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateBasicProfile = async (req, res) => {
    try {
        const { firstName, lastName, location, bio, dateOfBirth } = req.body;
        if (firstName && firstName.length > 20)
            return res.status(400).json({ error: "Tên tối đa 20 ký tự" });
        const updated = await prisma.verifiedUser.update({
            where: { id: req.user.id },
            data: { firstName, lastName, location, bio, dateOfBirth },
        });
        const { password: _, ...safeUser } = updated;
        res.json(safeUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updatePurposes = async (req, res) => {
    try {
        const { purposes } = req.body;
        if (!Array.isArray(purposes))
            return res.status(400).json({ error: "purposes phải là array" });
        if (purposes.length > 10)
            return res.status(400).json({ error: "Tối đa 10 mục đích" });
        await prisma.userPurpose.deleteMany({ where: { userId: req.user.id } });
        if (purposes.length > 0) {
            await prisma.userPurpose.createMany({
                data: purposes.map((p) => ({
                    userId: req.user.id,
                    purpose: p,
                })),
            });
        }
        invalidateCache("matching:filter-options");
        res.json({ message: "Purposes updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateHobbies = async (req, res) => {
    try {
        const { hobbies } = req.body;
        if (!Array.isArray(hobbies))
            return res.status(400).json({ error: "hobbies phải là array" });
        if (hobbies.length > 10)
            return res.status(400).json({ error: "Tối đa 10 sở thích" }); // spec mục 16
        await prisma.userHobby.deleteMany({ where: { userId: req.user.id } });
        await prisma.userHobby.createMany({
            data: hobbies.map((h) => ({ userId: req.user.id, hobbyName: h })),
        });
        invalidateCache("matching:filter-options");
        invalidateCache("groups:filter-options");
        res.json({ message: "Hobbies updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateLanguages = async (req, res) => {
    try {
        const { languages } = req.body;
        if (!Array.isArray(languages))
            return res.status(400).json({ error: "languages phải là array" });
        await prisma.userLanguage.deleteMany({ where: { userId: req.user.id } });
        await prisma.userLanguage.createMany({
            data: languages.map((l) => ({
                userId: req.user.id,
                language: l.language,
                level: l.level ?? null,
                type: l.type ?? null,
            })),
        });
        res.json({ message: "Languages updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateMainPhoto = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: "url là bắt buộc" });
        const user = await prisma.verifiedUser.update({
            where: { id: req.user.id },
            data: { avatarUrl: url },
        });
        const { password: _, ...safeUser } = user;
        res.json(safeUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addPhoto = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: "url là bắt buộc" });
        const count = await prisma.userPhoto.count({ where: { userId: req.user.id } });
        if (count >= 4) return res.status(400).json({ message: "Max 4 photos" });
        const photo = await prisma.userPhoto.create({
            data: { url, userId: req.user.id },
        });
        res.json(photo);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deletePhoto = async (req, res) => {
    try {
        /** @type {any} */
        const photo = await prisma.userPhoto.findUnique({
            where: { id: Number(req.params.id) },
        });
        if (!photo || photo.userId !== req.user.id)
            return res.status(403).json({ error: "Forbidden" });
        await prisma.userPhoto.delete({ where: { id: photo.id } });
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const list = await prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
