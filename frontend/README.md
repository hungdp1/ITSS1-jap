# Tomoio Frontend Local

Frontend Next.js ket noi backend local.

## Cau Truc

```text
app/                    # Route, page, API proxy, server actions
components/             # UI components theo domain
hooks/                  # React hooks
lib/                    # API clients, formatter, auth/session/socket helpers
public/assets/images/   # Anh tinh duoc chia theo nhom
```

## Setup

Dam bao backend dang chay tai `http://localhost:5001`, sau do:

```bash
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

Mo:

```text
http://localhost:3000
```

## Tai Khoan Demo

Neu backend da chay seed:

```text
Email: seed.user001@tomoio.local
Password: 123456
```

## Lenh

```bash
npm run dev
npm run build
npm run lint
```

## Trang Thai Da Test

- Frontend chay duoc tai `http://localhost:3000`.
- Trang chu render duoc va doc du lieu event seed tu backend.
- `npm run lint` hien con loi code san co ve ESLint/React rules, khong phai loi ket noi backend/frontend.
