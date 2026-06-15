# Tomoio Backend Local

Backend Express + Prisma + PostgreSQL + Socket.IO.

## Setup

Tao database `tomoio` bang pgAdmin 4, sau do chay:

```bash
npm install
cp env.example .env
```

Sua `.env` theo thong tin PostgreSQL local:

```env
DATABASE_URL="postgresql://postgres:12345678@localhost:5432/tomoio?schema=public"
DIRECT_URL="postgresql://postgres:12345678@localhost:5432/tomoio?schema=public"
PORT=5001
NODE_ENV=development
JWT_SECRET=local-dev-secret-change-me
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:3000
```

Tao schema va Prisma client:

```bash
npx prisma migrate dev
npx prisma generate
```

Nap du lieu mau:

```bash
npm run seed
```

Hoac neu muon tao schema va nap SQL truc tiep bang PostgreSQL extension/pgAdmin 4, dung:

```text
../database/tomoio.sql
```

Chay backend:

```bash
npm run dev
```

Kiem tra:

```bash
curl http://localhost:5001/health
```

Ket qua dung:

```json
{"status":"ok","database":"connected"}
```

## Tai Khoan Demo

```text
Email: seed.user001@tomoio.local
Password: 123456
```

## Lenh

```bash
npm run dev
npm start
npm run build
npm run seed
npx prisma migrate dev
npx prisma studio
```

## Trang Thai Da Test

- Database `tomoio` ket noi duoc voi `postgres/12345678`.
- Backend chay duoc o `http://localhost:5001`.
- `/health` da tra ve database connected.
- API login seed user da tra ve `200`.
