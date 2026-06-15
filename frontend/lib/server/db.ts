import "server-only";
import postgres from "postgres";

/**
 * Single Postgres connection to Supabase (via the Supavisor transaction pooler).
 * No Prisma — raw SQL with postgres.js. `prepare: false` is required for the
 * transaction-mode pooler (port 6543).
 *
 * Set DATABASE_URL in .env.local / Vercel env to the Supabase pooler string:
 *   postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:6543/postgres
 */
declare global {
    // eslint-disable-next-line no-var
    var __tomoioSql: ReturnType<typeof postgres> | undefined;
}

function createClient() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error("DATABASE_URL is not set");
    }
    return postgres(url, {
        ssl: "require",
        prepare: false,
        max: Number(process.env.DB_POOL_MAX || 5),
        idle_timeout: 20,
        connect_timeout: 15,
    });
}

export const sql = global.__tomoioSql ?? createClient();

if (process.env.NODE_ENV !== "production") {
    global.__tomoioSql = sql;
}
