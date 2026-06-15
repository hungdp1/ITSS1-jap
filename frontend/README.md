# Tomoio frontend

Single Next.js app — the whole product (DB, auth, storage, realtime) runs through
Supabase. There is no separate backend server anymore.

Setup, env vars, and Vercel deployment are documented in the repo root
[`README.md`](../README.md).

```bash
npm install
cp .env.local.example .env.local   # then fill in Supabase + JWT values
npm run dev                         # http://localhost:3000
```

Demo login: `seed.user001@tomoio.local` / `123456`.

The server-side "backend" lives in `lib/server/` (db, auth, storage, translate,
realtime, per-domain handlers, and an in-process `router.ts`). `lib/api.ts`
dispatches API paths to it; `app/api/*` are thin proxy routes for the browser.
