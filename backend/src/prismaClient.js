const { PrismaClient } = require("@prisma/client");

const globalForPrisma = globalThis;

/** @type {import("@prisma/client").PrismaClient} */
const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });

// Reuse one client per process during local development.
globalForPrisma.prisma = prisma;

module.exports = prisma;
