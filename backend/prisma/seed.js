require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SQL_PATH = path.resolve(__dirname, "../../database/tomoio.sql");
const DEMO_PASSWORD = "123456";
const DEMO_USER = "seed.user001@tomoio.local";

function extractSeedStatements(sql) {
    const beginIndex = sql.indexOf("BEGIN;");
    const commitIndex = sql.indexOf("COMMIT;", beginIndex);

    if (beginIndex === -1 || commitIndex === -1) {
        throw new Error("database/tomoio.sql must contain a BEGIN ... COMMIT seed block.");
    }

    const seedBlock = sql.slice(beginIndex + "BEGIN;".length, commitIndex);

    return seedBlock
        .split(/;\s*(?:\r?\n|$)/)
        .map((statement) => statement.trim())
        .filter(Boolean);
}

async function printSummary() {
    const [
        users,
        admins,
        groups,
        groupMembers,
        posts,
        comments,
        postLikes,
        sessions,
        messages,
        events,
        eventEngagements,
        actions,
        notifications,
    ] = await Promise.all([
        prisma.verifiedUser.count(),
        prisma.administrator.count(),
        prisma.group.count(),
        prisma.groupMember.count(),
        prisma.post.count(),
        prisma.comment.count(),
        prisma.postLike.count(),
        prisma.matchSession.count(),
        prisma.message.count(),
        prisma.event.count(),
        prisma.eventEngagement.count(),
        prisma.userProfileAction.count(),
        prisma.notification.count(),
    ]);

    console.table({
        users,
        admins,
        groups,
        groupMembers,
        posts,
        comments,
        postLikes,
        sessions,
        messages,
        events,
        eventEngagements,
        actions,
        notifications,
    });
}

async function main() {
    const sql = fs.readFileSync(SQL_PATH, "utf8");
    const statements = extractSeedStatements(sql);

    console.log(`Running ${statements.length} seed SQL statements from database/tomoio.sql...`);

    await prisma.$transaction(
        async (tx) => {
            for (const statement of statements) {
                await tx.$executeRawUnsafe(statement);
            }
        },
        { timeout: 120_000 }
    );

    console.log("Seed completed.");
    console.log(`Demo user: ${DEMO_USER}`);
    console.log(`Demo password: ${DEMO_PASSWORD}`);
    await printSummary();
}

main()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
