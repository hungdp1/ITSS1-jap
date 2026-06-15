# Database Local

Thu muc nay giu file SQL de import truc tiep bang PostgreSQL extension hoac pgAdmin 4:

```text
tomoio.sql
```

File nay gom ca:

- Cau truc database: enum, table, index, foreign key
- Du lieu demo moi: users, profiles, groups, posts, comments, likes, matches, chat, events, moderation, notifications
- Anh seed public: `frontend/public/assets/images/seed-avatars` va `frontend/public/assets/images/seed-covers`

Noi dung seed duoc viet cho he thong giao luu giua nguoi Nhat o Hanoi va nguoi Viet hoc tieng Nhat. Tru ten nguoi va dia diem de latin, noi dung hien thi trong seed dung tieng Nhat.

## Cach import lai tu dau

1. Drop/recreate database local ten `tomoio` de co database sach.
2. Mo PostgreSQL extension hoac pgAdmin 4 Query Tool.
3. Chon database `tomoio`.
4. Chay file:

```text
database/tomoio.sql
```

Tai khoan demo:

```text
Email: seed.user001@tomoio.local
Password: 123456
```

Du lieu seed chinh:

```text
users: 60
administrators: 12
groups: 36
group_members: 504
posts: 144
comments: 578
post_likes: 1008
match_session: 42
messages: 168
events: 36
event_engagements: 432
kyc_requests: 60
report_cases: 18
user_profile_actions: 760
notifications: 140
```

Luu y: file nay tao schema, nen hay chay tren database `tomoio` dang trong. Neu da co table san, hay drop/recreate database truoc khi chay lai.

Neu muon seed qua Prisma thay vi pgAdmin 4, chay migration truoc, sau do chay:

```bash
cd backend
npx prisma db seed
```

Prisma seed se doc cung block du lieu trong `database/tomoio.sql`, nen pgAdmin 4 va backend dung chung mot nguon seed.
