---
title: Tomoio
emoji: 🌸
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# Tomoio — Full Supabase + Vercel

Tomoio is a **single Next.js app** (in `frontend/`) backed entirely by **Supabase**:

- **Database**: Supabase Postgres, queried directly from Next.js server code via raw SQL (`postgres.js`). No Prisma, no separate API server.
- **Auth**: custom JWT + bcrypt (kept from the original backend), running inside Next.js route handlers / server actions.
- **Storage**: Supabase Storage (`uploads` bucket) for avatars and chat/post images.
- **Realtime**: Supabase Realtime (Broadcast + Presence) for live chat, message translation, seen receipts, block events, online status, and notifications. No Socket.IO — works on Vercel serverless.

The old `backend/` (Express + Prisma + Socket.IO + Cloudinary) is **no longer used** and is not deployed. The business logic now lives in `frontend/lib/server/` (an in-process router + per-domain handlers).

```
frontend/
├── app/                      # Next.js routes, /api proxy routes, server actions
├── lib/
│   ├── api.ts                # in-process dispatcher (apiGet/apiPost… + localApiResponse)
│   ├── supabase-browser.ts   # client Supabase (Realtime only)
│   └── server/               # the "backend": db, auth, storage, translate, realtime, handlers, router
database/
├── tomoio.sql                # schema + demo data (60 users, groups, events, messages…)
└── supabase_setup.sql        # storage bucket + RLS + realtime publication
```

## 1. Supabase project setup (one time)

1. Create a Supabase project. Note the **project ref**, **publishable (anon) key**, and **database password**.
2. From `frontend/`, create `.env.local` (copy `.env.local.example`) and fill `DATABASE_URL` (transaction pooler, port 6543) + Supabase URL/key + a `JWT_SECRET`.
3. Load schema + demo data, then the platform setup (storage/realtime/RLS):

```bash
cd frontend
npm install
node --env-file=.env.local scripts/load-sql.mjs ../database/tomoio.sql
node --env-file=.env.local scripts/load-sql.mjs ../database/supabase_setup.sql
```

## 2. Run locally

```bash
cd frontend
npm run dev        # http://localhost:3000
```

Demo login: `seed.user001@tomoio.local` / `123456`.

## 3. Deploy to Vercel

1. Import the repo into Vercel.
2. Set **Root Directory = `frontend`** (Vercel auto-detects Next.js).
3. Add the env vars from `.env.local` to the Vercel project (Production + Preview):
   `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_STORAGE_BUCKET`, `JWT_SECRET`, `JWT_EXPIRES_IN`
   (optional `SUPABASE_SERVICE_ROLE_KEY`).
4. Deploy. The transaction pooler `DATABASE_URL` works on Vercel's IPv4 runtime.

## Notes

- Translation uses a keyless service (Google `gtx` with a MyMemory fallback) — no API key required.
- `database/supabase_setup.sql` enables permissive realtime read policies on `messages` and
  `"Notification"` so the browser can subscribe. App data reads go through the server (pooler,
  bypasses RLS). For production hardening, move to Supabase Auth + per-user RLS.
