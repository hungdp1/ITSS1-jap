const prisma = require("../prismaClient");
const { normalizeSearchQuery } = require("../utils/searchUtils");

exports.createEvent = async (req, res) => {
    try {
        const {
            title,
            description,
            eventTime,
            format,
            address,
            urlLink,
            imageUrl,
        } = req.body;

        if (!title || !description || !eventTime || !format) {
            return res.status(400).json({ error: "Thiếu field bắt buộc (title, description, eventTime, format)" });
        }

        const trimmedTitle = title.trim();
        if (trimmedTitle.length < 5 || trimmedTitle.length > 50) {
            return res.status(400).json({ error: "Tên sự kiện phải từ 5–50 ký tự" });
        }

        if (description.trim().length < 10) {
            return res.status(400).json({ error: "Mô tả phải có ít nhất 10 ký tự" });
        }

        if (!["online", "offline"].includes(format)) {
            return res.status(400).json({ error: "Format không hợp lệ (chỉ chấp nhận: online, offline)" });
        }

        if (format === "online" && !urlLink) {
            return res.status(400).json({ error: "URL họp là bắt buộc khi format là online" });
        }
        if (format === "offline" && !address) {
            return res.status(400).json({ error: "Địa chỉ là bắt buộc khi format là offline" });
        }

        if (urlLink) {
            try {
                new URL(urlLink);
            } catch {
                return res.status(400).json({ error: "URL họp không hợp lệ" });
            }
        }

        const parsedTime = new Date(eventTime);
        if (isNaN(parsedTime.getTime())) {
            return res.status(400).json({ error: "Thời gian không hợp lệ" });
        }
        if (parsedTime <= new Date()) {
            return res.status(400).json({ error: "Không thể tạo sự kiện trong quá khứ" });
        }

        const event = await prisma.event.create({
            data: {
                title: trimmedTitle,
                description: description.trim(),
                eventTime: parsedTime,
                format,
                address: address?.trim() || null,
                urlLink: urlLink?.trim() || null,
                imageUrl: imageUrl?.trim() || null,
                status: "APPROVED",
                adminId: req.user.id,
            },
        });
        global.io?.emit("newEventApproved", { eventId: event.id, title: event.title });

        return res.status(201).json(event);
    } catch (err) {
        console.error("[createEvent]", err);
        return res.status(500).json({ error: err.message });
    }
};

exports.getEventDetail = async (req, res) => {
    try {
        /** @type {any} */
        const event = await prisma.event.findUnique({
            where: { id: Number(req.params.id) },
            include: {
                engagements: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
                admin: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        if (!event) return res.status(404).json({ error: "Event not found" });

        const isParticipant = event.engagements.some(
            (e) => e.userId === req.user?.id && e.engagementType === "joined"
        );
        const response = {
            ...event,
            urlLink: (event.format === "online" && !isParticipant) ? null : event.urlLink,
        };

        return res.json(response);
    } catch (err) {
        console.error("[getEventDetail]", err);
        return res.status(500).json({ error: err.message });
    }
};

exports.updateEvent = async (req, res) => {
    try {
        const id = Number(req.params.id);

        const { title, description, eventTime, format, address, urlLink, imageUrl } = req.body;

        const existing = await prisma.event.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: "Event not found" });
        if (existing.adminId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

        let parsedTime;
        if (eventTime !== undefined) {
            parsedTime = new Date(eventTime);
            if (isNaN(parsedTime.getTime())) {
                return res.status(400).json({ error: "Thời gian không hợp lệ" });
            }
            if (parsedTime <= new Date()) {
                return res.status(400).json({ error: "Không thể đặt thời gian trong quá khứ" });
            }
        }

        if (title !== undefined) {
            const t = title.trim();
            if (t.length < 5 || t.length > 50) {
                return res.status(400).json({ error: "Tên sự kiện phải từ 5–50 ký tự" });
            }
        }

        const resolvedFormat = format || existing.format;
        const resolvedAddress = address !== undefined ? address : existing.address;
        const resolvedUrlLink = urlLink !== undefined ? urlLink : existing.urlLink;

        if (resolvedFormat === "online" && !resolvedUrlLink) {
            return res.status(400).json({ error: "URL họp là bắt buộc khi format là online" });
        }
        if (resolvedFormat === "offline" && !resolvedAddress) {
            return res.status(400).json({ error: "Địa chỉ là bắt buộc khi format là offline" });
        }

        const updatedEvent = await prisma.event.update({
            where: { id },
            data: {
                ...(title !== undefined && { title: title.trim() }),
                ...(description !== undefined && { description: description ? description.trim() : null}),
                ...(parsedTime !== undefined && { eventTime: parsedTime }),
                ...(format !== undefined && { format }),
                ...(address !== undefined && { address: address ? address.trim() : null}),
                ...(urlLink !== undefined && { urlLink: urlLink ? urlLink.trim() : null}),
                ...(imageUrl !== undefined && { imageUrl: imageUrl ? imageUrl.trim() : null}),
                status: "APPROVED",
            },
        });

        return res.json(updatedEvent);
    } catch (err) {
        console.error("[updateEvent]", err);
        return res.status(500).json({ error: err.message });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const event = await prisma.event.findUnique({ where: { id } });
        if (!event) return res.status(404).json({ error: "Event not found" });
        if (event.adminId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
        await prisma.event.delete({ where: { id } });
        return res.json({ message: "Đã xoá sự kiện thành công" });
    } catch (err) {
        console.error("[deleteEvent]", err);
        return res.status(500).json({ error: err.message });
    }
};

exports.getEvents = async (req, res) => {
    try {
        const page  = Math.max(parseInt(req.query.page  || "1"),  1);
        const limit = Math.max(parseInt(req.query.limit || "10"), 1);

        const { format, search: rawSearch, status, fromDate, toDate, joinedOnly } = req.query;
        const search = normalizeSearchQuery(rawSearch);
        const userId = req.user?.id;
        const isJoinedOnly = joinedOnly === "true";

        const where = {
            AND: [
                format && format !== "all"
                    ? { format }
                    : {},

                status
                    ? { status }
                    : { status: "APPROVED" },

                search
                    ? {
                          OR: [
                              { title: { contains: search, mode: "insensitive" } },
                              { description: { contains: search, mode: "insensitive" } },
                          ],
                      }
                    : {},

                isJoinedOnly && userId
                    ? { engagements: { some: { userId, engagementType: "joined" } } }
                    : {},

                fromDate || toDate
                    ? {
                        eventTime: {
                            ...(fromDate ? { gte: new Date(fromDate) } : {}),
                            ...(toDate   ? { lte: new Date(toDate)   } : {}),
                        },
                    }
                    : {},

                !fromDate && !toDate && !isJoinedOnly
                    ? { eventTime: { gte: new Date() } }
                    : {},
            ],
        };

        const [events, total] = await Promise.all([
            prisma.event.findMany({
                where,
                include: {
                    engagements: {
                        where: { engagementType: "joined" },
                        take: 4,
                        select: {
                            userId: true,
                            engagementType: true,
                            user: {
                                select: {
                                    id: true,
                                    avatarUrl: true,
                                },
                            },
                        },
                    },
                    admin: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            avatarUrl: true,
                        },
                    },
                    _count: {
                        select: {
                            engagements: {
                                where: { engagementType: "joined" },
                            },
                        },
                    },
                },
                orderBy: { eventTime: "asc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.event.count({ where }),
        ]);

        const eventIds = events.map((e) => e.id);
        const myJoined =
            userId && eventIds.length > 0
                ? await prisma.eventEngagement.findMany({
                      where: {
                          userId,
                          eventId: { in: eventIds },
                          engagementType: "joined",
                      },
                      select: { eventId: true },
                  })
                : [];
        const joinedSet = new Set(myJoined.map((row) => row.eventId));

        const formatted = events.map((event) => {
            const isParticipant = joinedSet.has(event.id);
            return {
                ...event,
                urlLink:
                    event.format === "online" && !isParticipant ? null : event.urlLink,
                participantCount: event._count.engagements,
            };
        });

        return res.json({
            data: formatted,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
        });
    } catch (err) {
        console.error("[getEvents]", err);
        return res.status(500).json({ error: err.message });
    }
};

exports.getPublicEvents = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page || "1", 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || "4", 10), 1), 10);

        const where = {
            status: "APPROVED",
            eventTime: { gte: new Date() },
        };

        const [events, total] = await Promise.all([
            prisma.event.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    eventTime: true,
                    format: true,
                    address: true,
                    imageUrl: true,
                    createdAt: true,
                    engagements: {
                        where: { engagementType: "joined" },
                        take: 4,
                        select: {
                            engagementType: true,
                            user: {
                                select: { avatarUrl: true },
                            },
                        },
                    },
                    _count: {
                        select: {
                            engagements: {
                                where: { engagementType: "joined" },
                            },
                        },
                    },
                },
                orderBy: { eventTime: "asc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.event.count({ where }),
        ]);

        const formatted = events.map((event) => ({
            id: event.id,
            title: event.title,
            description: event.description,
            eventTime: event.eventTime,
            format: event.format,
            address: event.format === "offline" ? event.address : null,
            imageUrl: event.imageUrl,
            createdAt: event.createdAt,
            urlLink: null,
            participantCount: event._count.engagements,
            engagements: event.engagements,
        }));

        return res.json({
            data: formatted,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
        });
    } catch (err) {
        console.error("[getPublicEvents]", err);
        return res.status(500).json({ error: err.message });
    }
};

exports.engageEvent = async (req, res) => {
    try {
        const eventId = Number(req.params.id);
        const userId  = req.user.id;

        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) return res.status(404).json({ error: "Event not found" });

        if (event.status !== "APPROVED") {
            return res.status(400).json({ error: "Sự kiện chưa được duyệt" });
        }
        if (new Date(event.eventTime) < new Date()) {
            return res.status(400).json({ error: "Sự kiện đã kết thúc" });
        }

        const existing = await prisma.eventEngagement.findUnique({
            where: { eventId_userId: { eventId, userId } },
        });
        if (existing) return res.status(400).json({ error: "Bạn đã tham gia sự kiện này rồi" });

        const engagement = await prisma.eventEngagement.create({
            data: { eventId, userId, engagementType: "joined" },
        });

        global.io?.to(`user_${event.adminId}`).emit("newEventParticipant", {
            eventId,
            userId,
        });

        return res.json(engagement);
    } catch (err) {
        console.error("[engageEvent]", err);
        return res.status(500).json({ error: err.message });
    }
};

exports.cancelEngagement = async (req, res) => {
    try {
        const eventId = Number(req.params.id);
        const userId  = req.user.id;

        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) return res.status(404).json({ error: "Event not found" });

        if (new Date(event.eventTime) < new Date()) {
            return res.status(400).json({ error: "Sự kiện đã kết thúc, không thể huỷ tham gia" });
        }

        const existing = await prisma.eventEngagement.findUnique({
            where: { eventId_userId: { eventId, userId } },
        });
        if (!existing) return res.status(400).json({ error: "Bạn chưa tham gia sự kiện này" });

        await prisma.eventEngagement.delete({
            where: { eventId_userId: { eventId, userId } },
        });

        return res.json({ message: "Đã huỷ tham gia thành công" });
    } catch (err) {
        console.error("[cancelEngagement]", err);
        return res.status(500).json({ error: err.message });
    }
};

exports.reviewEvent = async (req, res) => {
    try {
        const eventId = Number(req.params.id);
        const { status, rejectReason } = req.body;

        if (!["APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({ error: "Status không hợp lệ (chỉ chấp nhận: APPROVED, REJECTED)" });
        }

        if (status === "REJECTED" && !rejectReason?.trim()) {
            return res.status(400).json({ error: "Cần cung cấp lý do từ chối khi REJECTED" });
        }

        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) return res.status(404).json({ error: "Event not found" });

        if (event.status !== "PENDING") {
            return res.status(400).json({ error: `Sự kiện đã được xử lý (status hiện tại: ${event.status})` });
        }

        const updated = await prisma.event.update({
            where: { id: eventId },
            data: {
                status,
                adminId: req.user.id,
            },
        });

        const notifMessage = status === "APPROVED"
            ? `Sự kiện "${event.title}" của bạn đã được duyệt!`
            : `Sự kiện "${event.title}" bị từ chối. Lý do: ${rejectReason}`;

        await prisma.notification.create({
            data: {
                userId:  event.adminId,
                type:    status === "APPROVED" ? "EVENT_APPROVED" : "EVENT_REJECTED",
                message: notifMessage,
            },
        });

        global.io?.to(`user_${event.adminId}`).emit("newNotification", {
            type:    status === "APPROVED" ? "EVENT_APPROVED" : "EVENT_REJECTED",
            message: notifMessage,
        });

        return res.json({
            ...updated,
            ...(status === "REJECTED" && { rejectReason }),
        });
    } catch (err) {
        console.error("[reviewEvent]", err);
        return res.status(500).json({ error: err.message });
    }
};

exports.getMyEvents = async (req, res) => {
    try {
        const page  = Math.max(parseInt(req.query.page  || "1"),  1);
        const limit = Math.max(parseInt(req.query.limit || "10"), 1);
        const { status } = req.query;

        const where = {
            adminId: req.user.id,
            ...(status ? { status } : {}),
        };

        const [events, total] = await Promise.all([
            prisma.event.findMany({
                where,
                include: {
                    engagements: { select: { userId: true, engagementType: true } },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.event.count({ where }),
        ]);

        return res.json({
            data: events,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
        });
    } catch (err) {
        console.error("[getMyEvents]", err);
        return res.status(500).json({ error: err.message });
    }
};
