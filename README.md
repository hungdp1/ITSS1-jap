---
title: Tomoio
emoji: 🌸
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# Tomoio Local Development

Du an gom 3 phan:

- `backend`: Backend Express + Prisma + PostgreSQL + Socket.IO.
- `frontend`: Frontend Next.js + React + TypeScript.
- `database`: SQL seed de nap truc tiep bang pgAdmin 4.

Tai lieu nay chi phuc vu chay he thong tren local.

## Yeu Cau

- Node.js 20+
- npm
- PostgreSQL local
- pgAdmin 4 de tao/xem database

## Cau Truc

```text
.
├── backend/
│   ├── src/                 # Backend source
│   ├── prisma/              # Prisma schema, migrations, seed JS
│   ├── env.example          # Mau .env local
│   └── package.json
├── database/
│   └── tomoio.sql           # Tao schema + nap data demo trong 1 file
└── frontend/
    ├── app/                 # Next.js app routes/pages
    ├── components/
    ├── lib/
    ├── public/assets/images/# Static images grouped by domain
    ├── .env.local.example   # Mau env frontend local
    └── package.json
```

## 1. Tao Database Local Bang pgAdmin 4

1. Mo pgAdmin 4.
2. Ket noi den PostgreSQL local.
3. Tao database moi, vi du:

```text
tomoio
```

Tren may hien tai, user/password PostgreSQL da test duoc la `postgres/12345678`.
Neu pgAdmin 4 cua ban dung password khac, hay sua connection string trong backend `.env`.

## 2. Tao Cau Truc Va Nap Data

Co 2 cach.

### Cach A: Dung PostgreSQL extension / pgAdmin 4

Dung khi ban muon nap truc tiep bang SQL. Chay file duy nhat:

```text
database/tomoio.sql
```

File nay gom ca schema va du lieu demo. Nen chay tren database `tomoio` dang trong.

### Cach B: Dung Prisma tu backend

```bash
cd "/Users/haruoki/学習/大学/ITSS Jap/backend"
npx prisma migrate dev
npm run seed
```

## 3. Chay Backend

```bash
cd "/Users/haruoki/学習/大学/ITSS Jap/backend"
npm install
cp env.example .env
```

Mo `.env` va sua neu can:

```env
DATABASE_URL="postgresql://postgres:12345678@localhost:5432/tomoio?schema=public"
DIRECT_URL="postgresql://postgres:12345678@localhost:5432/tomoio?schema=public"
PORT=5001
NODE_ENV=development
JWT_SECRET=local-dev-secret-change-me
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:3000
```

Neu chua tao schema/data bang SQL o buoc 2, chay Prisma:

```bash
npx prisma migrate dev
npx prisma generate
```

Nap du lieu mau bang Prisma neu chua chay `database/tomoio.sql`:

```bash
npm run seed
```

Chay backend:

```bash
npm run dev
```

Backend chay tai:

```text
http://localhost:5001
```

Kiem tra ket noi backend/database:

```bash
curl http://localhost:5001/health
```

Ket qua dung:

```json
{"status":"ok","database":"connected"}
```

## 4. Chay Frontend

Mo terminal thu hai:

```bash
cd "/Users/haruoki/学習/大学/ITSS Jap/frontend"
npm install
cp .env.local.example .env.local
```

Noi dung `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5001
```

Chay frontend:

```bash
npm run dev
```

Frontend chay tai:

```text
http://localhost:3000
```

## Tai Khoan Demo

Sau khi nap `database/tomoio.sql` hoac chay `npm run seed`, co the dang nhap bang:

```text
Email: seed.user001@tomoio.local
Password: 123456
```

## Lenh Hay Dung

Backend:

```bash
cd "/Users/haruoki/学習/大学/ITSS Jap/backend"
npm run dev
npm run seed
npx prisma migrate dev
npx prisma studio
```

Frontend:

```bash
cd "/Users/haruoki/学習/大学/ITSS Jap/frontend"
npm run dev
npm run build
npm run lint
```

## Luu Y Local

- Backend phai chay truoc frontend.
- Port backend trong repo hien cau hinh local la `5001` vi tren may nay port `5000` dang bi macOS `ControlCe` chiem.
- Port frontend mac dinh la `3000`.
- Neu muon dung port khac, doi `PORT` trong `backend/.env` va doi ca 2 bien trong `frontend/.env.local`.
- File seed chi tao/xoa lai du lieu mau co prefix `seed.*` / `Seed ...`, khong wipe toan bo database.
- Cac API upload anh/CCCD can Cloudinary. Neu chi chay UI voi seed data thi co the de trong Cloudinary env.

## Ket Qua Kiem Tra Local

Da kiem tra tren may nay:

- PostgreSQL database `tomoio` ton tai va ket noi duoc bang `postgres/12345678`.
- `database/tomoio.sql` da co du lieu: 60 users, 50 admins, 50 groups, 50 events, 100 posts, 200 messages.
- Backend `http://localhost:5001/health` tra ve `{"status":"ok","database":"connected"}`.
- Frontend `http://localhost:3000` render duoc trang chu va doc du lieu event seed.
- API login test thanh cong voi `seed.user001@tomoio.local` / `123456`.
- `npm run lint` frontend hien con loi code san co ve ESLint/React rules, khong phai loi ket noi local.
