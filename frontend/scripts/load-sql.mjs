/**
 * Run a .sql file against the Supabase database.
 * Reads DATABASE_URL from the environment (.env.local).
 *
 *   node --env-file=.env.local scripts/load-sql.mjs ../database/tomoio.sql
 *   node --env-file=.env.local scripts/load-sql.mjs ../database/supabase_setup.sql
 */
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
    console.error("DATABASE_URL is not set. Run with: node --env-file=.env.local scripts/load-sql.mjs <file>");
    process.exit(1);
}
const file = process.argv[2];
if (!file) {
    console.error("Usage: node --env-file=.env.local scripts/load-sql.mjs <path-to.sql>");
    process.exit(1);
}

const content = readFileSync(resolve(process.cwd(), file), "utf8");
const sql = postgres(url, { ssl: "require", prepare: false, max: 1, connect_timeout: 20 });

try {
    const res = await sql.unsafe(content);
    const last = Array.isArray(res) ? res[res.length - 1] : res;
    console.log("OK. Last result:");
    console.table(last);
    await sql.end();
} catch (e) {
    console.error("FAILED:", e.message);
    await sql.end();
    process.exit(1);
}
