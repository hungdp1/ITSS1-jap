
-- ============================================================
-- Source: backend/prisma/migrations/20260530121644_init/migration.sql
-- ============================================================
-- CreateEnum
CREATE TYPE "ProfileActionType" AS ENUM ('PASS', 'LIKE', 'BLOCK');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportCaseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "verified_users" (
    "user_id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "location" TEXT,
    "bio" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "verified_users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "related_user_id" INTEGER,
    "session_id" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_photos" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "user_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_languages" (
    "id" SERIAL NOT NULL,
    "language" TEXT NOT NULL,
    "type" TEXT,
    "level" TEXT,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "user_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_purposes" (
    "id" SERIAL NOT NULL,
    "purpose" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "user_purposes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_hobbies" (
    "id" SERIAL NOT NULL,
    "hobby_name" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "user_hobbies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "post_id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "group_id" INTEGER,
    "author_id" INTEGER NOT NULL,
    "image" TEXT,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("post_id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "user_id" INTEGER NOT NULL,
    "post_id" INTEGER NOT NULL,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("user_id","post_id")
);

-- CreateTable
CREATE TABLE "comments" (
    "comment_id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "post_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "match_session" (
    "session_id" SERIAL NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_session_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "match_participants" (
    "session_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "match_participants_pkey" PRIMARY KEY ("session_id","user_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "message_id" SERIAL NOT NULL,
    "content" TEXT,
    "send_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "session_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "attachment_url" TEXT,
    "deleted_at" TIMESTAMP(3),
    "edited_at" TIMESTAMP(3),
    "is_seen" BOOLEAN NOT NULL DEFAULT false,
    "message_type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "translated_text" JSONB,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "events" (
    "event_id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "event_time" TIMESTAMP(3) NOT NULL,
    "format" TEXT NOT NULL,
    "address" TEXT,
    "url_link" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admin_id" INTEGER NOT NULL,
    "administratorId" INTEGER,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "events_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "event_engagements" (
    "event_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "engagement_type" TEXT NOT NULL,
    "engaged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_engagements_pkey" PRIMARY KEY ("event_id","user_id")
);

-- CreateTable
CREATE TABLE "administrators" (
    "admin_id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role_level" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "administrators_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "kyc_requests" (
    "request_id" SERIAL NOT NULL,
    "document_image_url" TEXT NOT NULL,
    "reject_reason" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "user_id" INTEGER NOT NULL,
    "admin_id" INTEGER,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "kyc_requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "report_cases" (
    "case_id" SERIAL NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admin_id" INTEGER,
    "status" "ReportCaseStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "report_cases_pkey" PRIMARY KEY ("case_id")
);

-- CreateTable
CREATE TABLE "report_parties" (
    "user_id" INTEGER NOT NULL,
    "case_id" INTEGER NOT NULL,
    "party_role" TEXT NOT NULL,

    CONSTRAINT "report_parties_pkey" PRIMARY KEY ("user_id","case_id")
);

-- CreateTable
CREATE TABLE "user_profile_actions" (
    "actor_id" INTEGER NOT NULL,
    "target_id" INTEGER NOT NULL,
    "action" "ProfileActionType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profile_actions_pkey" PRIMARY KEY ("actor_id","target_id","action")
);

-- CreateTable
CREATE TABLE "groups" (
    "group_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "group_avatar" TEXT,
    "group_cover" TEXT,
    "member_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("group_id")
);

-- CreateTable
CREATE TABLE "group_hobby_tags" (
    "group_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "group_hobby_tags_pkey" PRIMARY KEY ("group_id","name")
);

-- CreateTable
CREATE TABLE "group_language_tags" (
    "group_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "group_language_tags_pkey" PRIMARY KEY ("group_id","name")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verified_users_email_key" ON "verified_users"("email");

-- CreateIndex
CREATE INDEX "verified_users_status_idx" ON "verified_users"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_group_id_created_at_idx" ON "posts"("group_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "match_participants_user_id_idx" ON "match_participants"("user_id");

-- CreateIndex
CREATE INDEX "messages_session_id_send_at_idx" ON "messages"("session_id", "send_at");

-- CreateIndex
CREATE INDEX "messages_session_id_is_seen_idx" ON "messages"("session_id", "is_seen");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_url_link_key" ON "events"("url_link");

-- CreateIndex
CREATE UNIQUE INDEX "administrators_username_key" ON "administrators"("username");

-- CreateIndex
CREATE INDEX "kyc_requests_user_id_status_idx" ON "kyc_requests"("user_id", "status");

-- CreateIndex
CREATE INDEX "user_profile_actions_actor_id_action_idx" ON "user_profile_actions"("actor_id", "action");

-- CreateIndex
CREATE INDEX "user_profile_actions_target_id_action_idx" ON "user_profile_actions"("target_id", "action");

-- CreateIndex
CREATE INDEX "group_hobby_tags_name_idx" ON "group_hobby_tags"("name");

-- CreateIndex
CREATE INDEX "group_language_tags_name_idx" ON "group_language_tags"("name");

-- CreateIndex
CREATE INDEX "group_members_user_id_idx" ON "group_members"("user_id");

-- CreateIndex
CREATE INDEX "group_members_group_id_idx" ON "group_members"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_user_id_group_id_key" ON "group_members"("user_id", "group_id");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "verified_users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_photos" ADD CONSTRAINT "user_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "verified_users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_languages" ADD CONSTRAINT "user_languages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "verified_users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_purposes" ADD CONSTRAINT "user_purposes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "verified_users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_hobbies" ADD CONSTRAINT "user_hobbies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "verified_users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "verified_users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("post_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "verified_users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "verified_users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("post_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "match_session"("session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "verified_users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "verified_users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "match_session"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "verified_users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_administratorId_fkey" FOREIGN KEY ("administratorId") REFERENCES "administrators"("admin_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_engagements" ADD CONSTRAINT "event_engagements_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_engagements" ADD CONSTRAINT "event_engagements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "verified_users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_requests" ADD CONSTRAINT "kyc_requests_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "administrators"("admin_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_requests" ADD CONSTRAINT "kyc_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "verified_users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cases" ADD CONSTRAINT "report_cases_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "administrators"("admin_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_parties" ADD CONSTRAINT "report_parties_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "report_cases"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_parties" ADD CONSTRAINT "report_parties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "verified_users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profile_actions" ADD CONSTRAINT "user_profile_actions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "verified_users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profile_actions" ADD CONSTRAINT "user_profile_actions_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "verified_users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_hobby_tags" ADD CONSTRAINT "group_hobby_tags_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_language_tags" ADD CONSTRAINT "group_language_tags_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "verified_users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Source: backend/prisma/migrations/20260601120000_matching_filter_indexes/migration.sql
-- ============================================================
-- CreateIndex
CREATE INDEX "user_hobbies_user_id_idx" ON "user_hobbies"("user_id");

-- CreateIndex
CREATE INDEX "user_hobbies_hobby_name_idx" ON "user_hobbies"("hobby_name");

-- CreateIndex
CREATE INDEX "user_languages_user_id_idx" ON "user_languages"("user_id");

-- CreateIndex
CREATE INDEX "user_languages_language_idx" ON "user_languages"("language");

-- CreateIndex
CREATE INDEX "user_languages_level_idx" ON "user_languages"("level");

-- CreateIndex
CREATE INDEX "user_purposes_user_id_idx" ON "user_purposes"("user_id");

-- CreateIndex
CREATE INDEX "user_purposes_purpose_idx" ON "user_purposes"("purpose");

-- ============================================================
-- Source: backend/prisma/migrations/20260601130000_chat_query_indexes/migration.sql
-- ============================================================
-- Speed up unread counts per session (groupBy sessionId + isSeen filter)
CREATE INDEX "messages_session_unread_idx" ON "messages"("session_id", "is_seen", "sender_id")
WHERE "deleted_at" IS NULL;
-- Tomoio local seed data for pgAdmin 4 / PostgreSQL.
-- ============================================================
-- Tomoio full reset seed data
-- Domain: Japanese residents in Hanoi and Vietnamese learners of Japanese
-- Import this whole file into an empty database from pgAdmin 4 Query Tool.
-- Demo password for every seeded user/admin: 123456
-- Demo user: seed.user001@tomoio.local / 123456
-- ============================================================

BEGIN;

-- Clean existing data so this file can be re-run in pgAdmin 4.
TRUNCATE TABLE
    "Notification",
    "report_parties",
    "report_cases",
    "kyc_requests",
    "event_engagements",
    "events",
    "messages",
    "match_participants",
    "match_session",
    "comments",
    "post_likes",
    "posts",
    "group_members",
    "group_language_tags",
    "group_hobby_tags",
    "groups",
    "user_profile_actions",
    "user_photos",
    "user_languages",
    "user_purposes",
    "user_hobbies",
    "verified_users",
    "administrators"
RESTART IDENTITY CASCADE;

CREATE TEMP TABLE _seed_names (
    rn int PRIMARY KEY,
    email text,
    first_name text,
    last_name text,
    nationality text,
    learning_language text,
    learning_level text,
    location text,
    bio text,
    avatar_url text,
    status "UserStatus"
) ON COMMIT DROP;

INSERT INTO _seed_names VALUES
(1,'seed.user001@tomoio.local','Akira','Sato','日本','ベトナム','初級','Hanoi','Hanoiで働いている日本人です。ベトナム語はまだ初級ですが、毎日の生活で自然に使える表現を増やしたいです。日本語を学ぶベトナム人の方と、カフェで会話練習や文化の話ができたら嬉しいです。','/assets/images/avatars/avatar-1.jpg','VERIFIED'),
(2,'seed.user002@tomoio.local','Minh','Nguyen','ベトナム','日本','N2','Hanoi','Hanoiで日本語を勉強している大学生です。将来は日系企業で働きたいので、自然な日本語会話とビジネス表現を練習したいです。ベトナム語やHanoiの生活情報も紹介できます。','/assets/images/avatars/avatar-2.jpg','VERIFIED'),
(3,'seed.user003@tomoio.local','Yuki','Tanaka','日本','ベトナム','中級','Hanoi','Hanoiに住んで三年目です。ベトナム語で日常会話は少しできますが、もっと自然な言い回しを学びたいです。週末は旧市街やカフェを歩くのが好きです。','/assets/images/avatars/avatar-3.jpg','VERIFIED'),
(4,'seed.user004@tomoio.local','Linh','Tran','ベトナム','日本','N1','Hanoi','日本語通訳を目指して勉強しています。発音や敬語をもっと磨きたいです。日本の生活、仕事、文化について詳しく話せる友達を探しています。','/assets/images/avatars/avatar-4.jpg','VERIFIED'),
(5,'seed.user005@tomoio.local','Haruka','Suzuki','日本','ベトナム','初級','Hanoi','Hanoiで日本語教師をしています。ベトナム語の基礎を勉強中で、授業以外でも現地の方と交流したいです。料理と写真が好きです。','/assets/images/avatars/avatar-5.jpg','VERIFIED'),
(6,'seed.user006@tomoio.local','Anh','Le','ベトナム','日本','N3','Hanoi','日本のアニメと音楽が好きで日本語を始めました。会話になると緊張するので、やさしく練習してくれる日本人の友達を探しています。','/assets/images/avatars/avatar-6.jpg','VERIFIED'),
(7,'seed.user007@tomoio.local','Kenta','Yamamoto','日本','ベトナム','上級','Hanoi','HanoiでITエンジニアとして働いています。ベトナム語で技術の話もできるようになりたいです。日本語を勉強しているエンジニアの方と情報交換したいです。','/assets/images/avatars/avatar-7.jpg','VERIFIED'),
(8,'seed.user008@tomoio.local','Hoa','Pham','ベトナム','日本','N2','Hanoi','日系ホテルで働いています。接客で使う丁寧な日本語をもっと練習したいです。日本の旅行、食文化、マナーについて話すのが好きです。','/assets/images/avatars/avatar-8.jpg','VERIFIED'),
(9,'seed.user009@tomoio.local','Mai','Kobayashi','日本','ベトナム','中級','Hanoi','Hanoiの生活に慣れてきましたが、もっと地域の人と自然に話したいです。休日は料理教室や市場巡りに行きます。','/assets/images/avatars/avatar-9.jpg','VERIFIED'),
(10,'seed.user010@tomoio.local','Duy','Hoang','ベトナム','日本','N4','Hanoi','日本語を始めたばかりですが、日本人の友達と話して早く慣れたいです。サッカー、ゲーム、カフェが好きです。','/assets/images/avatars/avatar-10.jpg','VERIFIED'),
(11,'seed.user011@tomoio.local','Ryo','Nakamura','日本','ベトナム','初級','Hanoi','Hanoiで営業の仕事をしています。お客様とベトナム語で少しでも話せるようになりたいです。日本語の会話練習は丁寧にサポートできます。','/assets/images/avatars/avatar-1.jpg','VERIFIED'),
(12,'seed.user012@tomoio.local','Trang','Vu','ベトナム','日本','N2','Hanoi','日本留学の準備をしています。面接練習や自己紹介の日本語を自然にしたいです。Hanoiのおいしいお店もたくさん紹介できます。','/assets/images/avatars/avatar-2.jpg','VERIFIED'),
(13,'seed.user013@tomoio.local','Mika','Ito','日本','ベトナム','中級','Hanoi','Hanoiでデザインの仕事をしています。ベトナムのアートやカフェ文化が好きです。言語交換だけでなく、作品や写真の話もしたいです。','/assets/images/avatars/avatar-3.jpg','VERIFIED'),
(14,'seed.user014@tomoio.local','Nam','Bui','ベトナム','日本','N1','Hanoi','日本語のニュースを毎日読んでいますが、会話のスピードに慣れたいです。政治、社会、ITなど少し深い話題も歓迎です。','/assets/images/avatars/avatar-4.jpg','VERIFIED'),
(15,'seed.user015@tomoio.local','Sora','Watanabe','日本','ベトナム','初級','Hanoi','Hanoiに来たばかりです。生活に必要なベトナム語を覚えたいです。日本語の発音や作文チェックなら手伝えます。','/assets/images/avatars/avatar-5.jpg','VERIFIED'),
(16,'seed.user016@tomoio.local','Thao','Dang','ベトナム','日本','N3','Hanoi','日本のドラマと料理が好きです。自然な会話、特に友達同士の話し方を練習したいです。ベトナム料理も一緒に作れます。','/assets/images/avatars/avatar-6.jpg','VERIFIED'),
(17,'seed.user017@tomoio.local','Daichi','Kato','日本','ベトナム','中級','Hanoi','Hanoiでスタートアップに関わっています。ベトナム語で仕事の相談ができるレベルを目指しています。起業やキャリアの話が好きです。','/assets/images/avatars/avatar-7.jpg','VERIFIED'),
(18,'seed.user018@tomoio.local','Mai','Do','ベトナム','日本','N2','Hanoi','日本語の発音をもっときれいにしたいです。音楽、映画、カフェ巡りをしながら楽しく交流したいです。','/assets/images/avatars/avatar-8.jpg','VERIFIED'),
(19,'seed.user019@tomoio.local','Nao','Saito','日本','ベトナム','初級','Hanoi','Hanoiの大学で研究をしています。ベトナム語で学生と話せるようになりたいです。日本文化や留学相談にも対応できます。','/assets/images/avatars/avatar-9.jpg','VERIFIED'),
(20,'seed.user020@tomoio.local','Quang','Phan','ベトナム','日本','N4','Hanoi','日本語学校に通っています。まだ初級ですが、日本人の友達と短い会話から始めたいです。写真と散歩が好きです。','/assets/images/avatars/avatar-10.jpg','VERIFIED'),
(21,'seed.user021@tomoio.local','Shun','Matsumoto','日本','ベトナム','上級','Hanoi','ベトナム語でかなり会話できますが、発音と自然な表現を直してほしいです。日本語の敬語や文章表現を教えられます。','/assets/images/avatars/avatar-1.jpg','VERIFIED'),
(22,'seed.user022@tomoio.local','Vy','Nguyen','ベトナム','日本','N2','Hanoi','日本の会社でインターンをしています。会議で使う日本語やメール表現を学びたいです。旅行と読書も好きです。','/assets/images/avatars/avatar-2.jpg','VERIFIED'),
(23,'seed.user023@tomoio.local','Aoi','Inoue','日本','ベトナム','中級','Hanoi','Hanoiでベトナム料理を学んでいます。市場での会話や料理の説明をベトナム語でできるようになりたいです。','/assets/images/avatars/avatar-3.jpg','VERIFIED'),
(24,'seed.user024@tomoio.local','Khanh','Vo','ベトナム','日本','N1','Hanoi','日本語でプレゼンをする機会が増えました。論理的に話す練習をしたいです。ベトナム語の発音練習もサポートできます。','/assets/images/avatars/avatar-4.jpg','VERIFIED'),
(25,'seed.user025@tomoio.local','Kenji','Takahashi','日本','ベトナム','初級','Hanoi','Hanoiの暮らしを楽しんでいます。ベトナム語はまだ挨拶程度なので、日常フレーズからゆっくり練習したいです。','/assets/images/avatars/avatar-5.jpg','VERIFIED'),
(26,'seed.user026@tomoio.local','Huong','Ho','ベトナム','日本','N3','Hanoi','日本の大学院に進学したいです。研究計画や面接の日本語を練習したいです。日本人の友達も作りたいです。','/assets/images/avatars/avatar-6.jpg','VERIFIED'),
(27,'seed.user027@tomoio.local','Yuna','Yoshida','日本','ベトナム','中級','Hanoi','Hanoiでボランティア活動をしています。地域の方ともっと深く話したいので、ベトナム語の会話相手を探しています。','/assets/images/avatars/avatar-7.jpg','VERIFIED'),
(28,'seed.user028@tomoio.local','Tuan','Ly','ベトナム','日本','N2','Hanoi','日系IT企業を目指しています。技術面接で使う日本語や自己PRを練習したいです。プログラミングの話も歓迎です。','/assets/images/avatars/avatar-8.jpg','VERIFIED'),
(29,'seed.user029@tomoio.local','Hana','Kimura','日本','ベトナム','初級','Hanoi','Hanoiで日本語イベントを企画しています。ベトナム語を学びながら、参加者が安心して交流できる場を作りたいです。','/assets/images/avatars/avatar-9.jpg','VERIFIED'),
(30,'seed.user030@tomoio.local','Lan','Dinh','ベトナム','日本','N4','Hanoi','日本語の会話を始めたばかりです。買い物、学校、趣味など簡単なテーマで練習したいです。','/assets/images/avatars/avatar-10.jpg','VERIFIED'),
(31,'seed.user031@tomoio.local','Takumi','Hayashi','日本','ベトナム','上級','Hanoi','ベトナム語で友人と話すのは好きですが、ビジネスの場ではまだ不安があります。日本語を学ぶ方と実践的に練習したいです。','/assets/images/avatars/avatar-1.jpg','VERIFIED'),
(32,'seed.user032@tomoio.local','Hieu','Lam','ベトナム','日本','N2','Hanoi','日本の文学と映画が好きです。感想を日本語で自然に話せるようになりたいです。ゆっくり深く話せる友達を探しています。','/assets/images/avatars/avatar-2.jpg','VERIFIED'),
(33,'seed.user033@tomoio.local','Misaki','Shimizu','日本','ベトナム','中級','Hanoi','Hanoiでカフェ巡りをしながらベトナム語を練習しています。日本語を勉強している方と定期的に話せたら嬉しいです。','/assets/images/avatars/avatar-3.jpg','VERIFIED'),
(34,'seed.user034@tomoio.local','Ngan','Ngo','ベトナム','日本','N1','Hanoi','日本語教師を目指しています。自然な説明の仕方や授業で使う日本語を学びたいです。文化交流も大好きです。','/assets/images/avatars/avatar-4.jpg','VERIFIED'),
(35,'seed.user035@tomoio.local','Ren','Ogawa','日本','ベトナム','初級','Hanoi','Hanoiで長期滞在を始めました。生活に必要なベトナム語と、友達との自然な会話を学びたいです。','/assets/images/avatars/avatar-5.jpg','VERIFIED'),
(36,'seed.user036@tomoio.local','Phuong','Truong','ベトナム','日本','N3','Hanoi','日本語で日記を書いていますが、会話はまだ苦手です。発音や言い換えをやさしく直してほしいです。','/assets/images/avatars/avatar-6.jpg','VERIFIED'),
(37,'seed.user037@tomoio.local','Takeshi','Mori','日本','ベトナム','中級','Hanoi','Hanoiでスポーツ仲間を探しています。運動しながらベトナム語を練習したいです。日本語会話も楽しくサポートします。','/assets/images/avatars/avatar-7.jpg','VERIFIED'),
(38,'seed.user038@tomoio.local','Yen','Duong','ベトナム','日本','N2','Hanoi','日本の接客マナーを学んでいます。自然な敬語や電話対応の表現を練習したいです。','/assets/images/avatars/avatar-8.jpg','VERIFIED'),
(39,'seed.user039@tomoio.local','Emi','Fujimoto','日本','ベトナム','初級','Hanoi','Hanoiの音楽イベントによく行きます。ベトナム語で好きな曲やアーティストについて話せるようになりたいです。','/assets/images/avatars/avatar-9.jpg','VERIFIED'),
(40,'seed.user040@tomoio.local','Son','Pham','ベトナム','日本','N4','Hanoi','日本語は初級ですが、毎週少しずつ会話練習をしたいです。ゲーム、映画、スポーツの話ならたくさんできます。','/assets/images/avatars/avatar-10.jpg','PENDING'),
(41,'seed.user041@tomoio.local','Kei','Abe','日本','ベトナム','上級','Hanoi','Hanoiで教育関係の仕事をしています。ベトナム語で授業や相談ができるよう、表現を増やしたいです。','/assets/images/avatars/avatar-1.jpg','VERIFIED'),
(42,'seed.user042@tomoio.local','Ha','Huynh','ベトナム','日本','N2','Hanoi','日本語で友達と自然に冗談を言えるようになりたいです。会話練習と文化の違いについて話すのが好きです。','/assets/images/avatars/avatar-2.jpg','VERIFIED'),
(43,'seed.user043@tomoio.local','Mao','Ueda','日本','ベトナム','中級','Hanoi','Hanoiのローカル市場が好きです。ベトナム語で値段交渉や食材の説明ができるようになりたいです。','/assets/images/avatars/avatar-3.jpg','VERIFIED'),
(44,'seed.user044@tomoio.local','Bao','Le','ベトナム','日本','N1','Hanoi','日本語でディスカッションをするのが好きです。社会問題、仕事、生活文化など幅広いテーマで話したいです。','/assets/images/avatars/avatar-4.jpg','VERIFIED'),
(45,'seed.user045@tomoio.local','Nozomi','Endo','日本','ベトナム','初級','Hanoi','Hanoiでヨガと散歩を楽しんでいます。ゆっくりしたペースでベトナム語会話を練習したいです。','/assets/images/avatars/avatar-5.jpg','VERIFIED'),
(46,'seed.user046@tomoio.local','Chi','Nguyen','ベトナム','日本','N3','Hanoi','日本語の作文をもっと自然にしたいです。日本人の友達に添削してもらいながら会話も練習したいです。','/assets/images/avatars/avatar-6.jpg','VERIFIED'),
(47,'seed.user047@tomoio.local','Sho','Okada','日本','ベトナム','中級','Hanoi','Hanoiで写真を撮るのが好きです。街歩きしながらベトナム語を使う練習ができる友達を探しています。','/assets/images/avatars/avatar-7.jpg','VERIFIED'),
(48,'seed.user048@tomoio.local','Lien','Tran','ベトナム','日本','N2','Hanoi','日本語で旅行案内ができるようになりたいです。Hanoiの歴史や食文化を日本語で紹介する練習をしています。','/assets/images/avatars/avatar-8.jpg','VERIFIED'),
(49,'seed.user049@tomoio.local','Rina','Hasegawa','日本','ベトナム','初級','Hanoi','Hanoiで家族と暮らしています。日常生活で使えるベトナム語を学びたいです。日本語の読み書きもサポートできます。','/assets/images/avatars/avatar-9.jpg','VERIFIED'),
(50,'seed.user050@tomoio.local','Long','Ho','ベトナム','日本','N4','Hanoi','日本語で自己紹介や趣味の話をもっとスムーズにしたいです。カフェで短い会話から練習できる人を探しています。','/assets/images/avatars/avatar-10.jpg','VERIFIED'),
(51,'seed.user051@tomoio.local','Hiro','Yamada','日本','ベトナム','上級','Hanoi','ベトナム語での会議に参加する機会があります。自然で丁寧な表現をもっと増やしたいです。日本語のビジネス表現なら教えられます。','/assets/images/avatars/avatar-1.jpg','VERIFIED'),
(52,'seed.user052@tomoio.local','Oanh','Vu','ベトナム','日本','N2','Hanoi','日本の会社で働くために日本語面接を練習しています。Hanoiで日本人の友達も作りたいです。','/assets/images/avatars/avatar-2.jpg','VERIFIED'),
(53,'seed.user053@tomoio.local','Ayaka','Sasaki','日本','ベトナム','中級','Hanoi','Hanoiで子ども向け日本語イベントを手伝っています。ベトナム語の自然な声かけを学びたいです。','/assets/images/avatars/avatar-3.jpg','VERIFIED'),
(54,'seed.user054@tomoio.local','My','Pham','ベトナム','日本','N1','Hanoi','日本語で司会や発表をする練習をしています。正しい敬語と聞きやすい話し方を身につけたいです。','/assets/images/avatars/avatar-4.jpg','VERIFIED'),
(55,'seed.user055@tomoio.local','Toma','Nakajima','日本','ベトナム','初級','Hanoi','Hanoiの生活をもっと楽しむためにベトナム語を始めました。食べ歩きと言語交換が好きです。','/assets/images/avatars/avatar-5.jpg','VERIFIED'),
(56,'seed.user056@tomoio.local','Khoa','Dang','ベトナム','日本','N3','Hanoi','日本語の会話相手を探しています。間違えても楽しく話せる雰囲気が好きです。ベトナム語の発音も手伝えます。','/assets/images/avatars/avatar-6.jpg','VERIFIED'),
(57,'seed.user057@tomoio.local','Mizuki','Miyazaki','日本','ベトナム','中級','Hanoi','Hanoiで文化交流イベントに参加しています。ベトナム語で自己紹介やイベント案内をできるようになりたいです。','/assets/images/avatars/avatar-7.jpg','VERIFIED'),
(58,'seed.user058@tomoio.local','Nhi','Bui','ベトナム','日本','N2','Hanoi','日本語で日常会話はできますが、もっと自然な相づちや感情表現を学びたいです。','/assets/images/avatars/avatar-8.jpg','VERIFIED'),
(59,'seed.user059@tomoio.local','Yu','Ishikawa','日本','ベトナム','初級','Hanoi','Hanoiで週末にカフェ巡りをしています。ベトナム語で注文や雑談ができるようになりたいです。','/assets/images/avatars/avatar-9.jpg','VERIFIED'),
(60,'seed.user060@tomoio.local','Binh','Tran','ベトナム','日本','N4','Hanoi','日本語を楽しく続けるために交流相手を探しています。日本の漫画とスポーツの話が好きです。','/assets/images/avatars/avatar-10.jpg','PENDING');

INSERT INTO "verified_users" ("email", "password", "first_name", "last_name", "date_of_birth", "location", "bio", "avatar_url", "created_at", "status")
SELECT email, '$2b$10$46LHVChsNjhAXFTgU9z5puNOBiOjwvNZuHwo8TUQCBmd7/E9UFhy2', first_name, last_name, DATE '1988-01-01' + (rn * INTERVAL '137 days'),
       (ARRAY[
           'Hoan Kiem, Hanoi',
           'Ba Dinh, Hanoi',
           'Tay Ho, Hanoi',
           'Dong Da, Hanoi',
           'Cau Giay, Hanoi',
           'Nam Tu Liem, Hanoi',
           'Bac Tu Liem, Hanoi',
           'Hai Ba Trung, Hanoi',
           'Thanh Xuan, Hanoi',
           'Long Bien, Hanoi',
           'Ha Dong, Hanoi',
           'Hoang Mai, Hanoi'
       ])[((rn - 1) % 12) + 1],
       bio, CASE WHEN rn % 7 = 0 THEN '/assets/images/avatars/avatar-' || (((rn - 1) % 10) + 1) || '.jpg' ELSE '/assets/images/seed-avatars/avatar-' || LPAD((((rn - 1) % 63) + 1)::text, 3, '0') || '.jpg' END, NOW() - ((70 - rn) * INTERVAL '1 day'), status
FROM _seed_names
ORDER BY rn;


INSERT INTO "administrators" ("username", "password", "role_level", "created_at")
SELECT 'seed_admin_' || LPAD(gs::text, 3, '0'), '$2b$10$46LHVChsNjhAXFTgU9z5puNOBiOjwvNZuHwo8TUQCBmd7/E9UFhy2', CASE WHEN gs <= 3 THEN 'SUPER_ADMIN' ELSE 'MODERATOR' END, NOW() - ((20 - gs) * INTERVAL '1 day')
FROM generate_series(1, 12) AS gs;

CREATE TEMP TABLE _seed_users AS
SELECT vu."user_id", sn.rn, sn.nationality, sn.learning_language, sn.learning_level
FROM "verified_users" vu
JOIN _seed_names sn ON sn.email = vu.email;

CREATE TEMP TABLE _seed_cover_assets (rn int PRIMARY KEY, path text) ON COMMIT DROP;
INSERT INTO _seed_cover_assets VALUES
(1,'/assets/images/seed-covers/cover-001.webp'),
(2,'/assets/images/seed-covers/cover-002.jpg'),
(3,'/assets/images/seed-covers/cover-003.jpg'),
(4,'/assets/images/seed-covers/cover-004.jpg'),
(5,'/assets/images/seed-covers/cover-005.jpeg'),
(6,'/assets/images/seed-covers/cover-006.jpg'),
(7,'/assets/images/seed-covers/cover-007.jpg'),
(8,'/assets/images/seed-covers/cover-008.jpg'),
(9,'/assets/images/seed-covers/cover-009.jpg'),
(10,'/assets/images/seed-covers/cover-010.png'),
(11,'/assets/images/seed-covers/cover-011.jpg'),
(12,'/assets/images/seed-covers/cover-012.webp'),
(13,'/assets/images/seed-covers/cover-013.avif'),
(14,'/assets/images/seed-covers/cover-014.jpg'),
(15,'/assets/images/seed-covers/cover-015.webp'),
(16,'/assets/images/seed-covers/cover-016.jpeg'),
(17,'/assets/images/seed-covers/cover-017.jpg'),
(18,'/assets/images/seed-covers/cover-018.jpg'),
(19,'/assets/images/seed-covers/cover-019.jpg'),
(20,'/assets/images/seed-covers/cover-020.jpg'),
(21,'/assets/images/seed-covers/cover-021.jpg'),
(22,'/assets/images/seed-covers/cover-022.jpeg'),
(23,'/assets/images/seed-covers/cover-023.jpg');

INSERT INTO "user_photos" ("url", "isMain", "user_id")
SELECT '/assets/images/seed-avatars/avatar-' || LPAD((((rn + 10) % 63) + 1)::text, 3, '0') || '.jpg', TRUE, "user_id" FROM _seed_users
UNION ALL
SELECT '/assets/images/seed-avatars/avatar-' || LPAD((((rn + 25) % 63) + 1)::text, 3, '0') || '.jpg', FALSE, "user_id" FROM _seed_users;

INSERT INTO "user_languages" ("language", "type", "level", "user_id")
SELECT nationality, 'native', '母語', "user_id" FROM _seed_users
UNION ALL
SELECT learning_language, 'learning', learning_level, "user_id" FROM _seed_users;

WITH purpose_pool AS (
    SELECT * FROM (VALUES
        (1,'言語交換'),(2,'文化交流'),(3,'日本語会話'),(4,'ベトナム語練習'),(5,'友達作り'),(6,'留学準備'),(7,'仕事の日本語'),(8,'Hanoi生活相談'),(9,'カフェ交流'),(10,'旅行仲間'),(11,'JLPT練習'),(12,'ビジネス交流')
    ) AS t(idx, name)
)
INSERT INTO "user_purposes" ("purpose", "user_id")
SELECT p.name, u."user_id"
FROM _seed_users u
JOIN generate_series(0, 2) AS off ON TRUE
JOIN purpose_pool p ON p.idx = (((u.rn + off - 1) % 12) + 1);

WITH hobby_pool AS (
    SELECT * FROM (VALUES
        (1,'料理'),(2,'旅行'),(3,'アニメ'),(4,'漫画'),(5,'写真'),(6,'音楽'),(7,'スポーツ'),(8,'プログラミング'),(9,'読書'),(10,'映画'),(11,'ゲーム'),(12,'ベトナム料理'),(13,'日本文化'),(14,'カフェ'),(15,'散歩'),(16,'アート')
    ) AS t(idx, name)
)
INSERT INTO "user_hobbies" ("hobby_name", "user_id")
SELECT h.name, u."user_id"
FROM _seed_users u
JOIN generate_series(0, 3) AS off ON TRUE
JOIN hobby_pool h ON h.idx = (((u.rn + off - 1) % 16) + 1);

CREATE TEMP TABLE _group_templates (
    rn int PRIMARY KEY,
    name text,
    description text,
    hobby1 text,
    hobby2 text,
    lang1 text,
    lang2 text
) ON COMMIT DROP;

INSERT INTO _group_templates VALUES
(1,'Hanoi日本語カフェ会','Hanoiのカフェで日本語とベトナム語をゆっくり練習するグループです。初対面でも話しやすい雰囲気を大切にしています。','カフェ','言語交換','日本','ベトナム'),
(2,'ベトナム語初心者クラブ','Hanoi在住の日本人が生活で使うベトナム語を練習するグループです。発音、注文、道案内から始めます。','言語交換','Hanoi生活相談','ベトナム','日本'),
(3,'JLPT N2・N1勉強会','JLPT上級を目指すベトナム人学習者と日本人サポーターが集まり、読解、聴解、会話を練習します。','JLPT練習','読書','日本','日本語'),
(4,'Hanoi旧市街さんぽ','週末にHanoiの旧市街を歩きながら写真、食べ物、言葉を楽しむ交流グループです。','散歩','写真','日本','ベトナム'),
(5,'日本文化とマナー研究会','日本の職場マナー、敬語、季節行事、生活習慣について日本語で学ぶグループです。','日本文化','仕事の日本語','日本','ベトナム'),
(6,'ベトナム料理交流会','Hanoiでフォー、ブンチャー、バインミーなどを食べながら言語交換するグループです。','ベトナム料理','料理','ベトナム','日本'),
(7,'ITエンジニア日本語会','IT業界で働く日本人とベトナム人が技術、日本語、キャリアについて話すグループです。','プログラミング','ビジネス交流','日本','ベトナム'),
(8,'映画とアニメで日本語','映画、ドラマ、アニメのセリフを使って自然な日本語表現を学びます。','映画','アニメ','日本','日本語'),
(9,'Hanoi留学・就職相談室','日本留学、日系企業就職、面接準備について経験者に相談できるグループです。','留学準備','仕事の日本語','日本','ベトナム'),
(10,'週末スポーツ交流','Hanoiでフットサルやランニングをしながら気軽に交流するグループです。','スポーツ','友達作り','日本','ベトナム'),
(11,'写真好き言語交換','Hanoiの街並みやカフェを撮影しながら日本語とベトナム語で会話します。','写真','旅行','日本','ベトナム'),
(12,'ビジネス敬語練習会','メール、会議、電話、プレゼンで使う日本語を実践的に練習するグループです。','ビジネス交流','仕事の日本語','日本','日本語');

INSERT INTO "groups" ("name", "created_at", "description", "group_avatar", "group_cover", "member_count")
SELECT name || ' #' || LPAD(gs::text, 3, '0'), NOW() - ((36 - gs) * INTERVAL '1 day'), description, avatar_asset.path, cover_asset.path, 0
FROM generate_series(1, 36) AS gs
JOIN _group_templates gt ON gt.rn = (((gs - 1) % 12) + 1)
JOIN _seed_cover_assets avatar_asset ON avatar_asset.rn = (((gs - 1) % 23) + 1)
JOIN _seed_cover_assets cover_asset ON cover_asset.rn = (((gs + 7) % 23) + 1);

CREATE TEMP TABLE _seed_groups AS
WITH numbered_groups AS (
    SELECT g."group_id", ROW_NUMBER() OVER (ORDER BY g."group_id") AS rn
    FROM "groups" g
)
SELECT ng."group_id", ng.rn, gt.hobby1, gt.hobby2, gt.lang1, gt.lang2
FROM numbered_groups ng
JOIN _group_templates gt ON gt.rn = (((ng.rn - 1) % 12) + 1);

INSERT INTO "group_hobby_tags" ("group_id", "name")
SELECT "group_id", hobby1 FROM _seed_groups
UNION ALL
SELECT "group_id", hobby2 FROM _seed_groups;

INSERT INTO "group_language_tags" ("group_id", "name")
SELECT "group_id", lang1 FROM _seed_groups
UNION ALL
SELECT "group_id", lang2 FROM _seed_groups;

INSERT INTO "group_members" ("user_id", "group_id", "joined_at")
SELECT u."user_id", g."group_id", NOW() - (((g.rn + m.off) % 45) * INTERVAL '1 day')
FROM _seed_groups g
JOIN generate_series(0, 13) AS m(off) ON TRUE
JOIN _seed_users u ON u.rn = (((g.rn * 3 + m.off - 1) % 60) + 1);

UPDATE "groups" g
SET "member_count" = gm.cnt
FROM (SELECT "group_id", COUNT(*) AS cnt FROM "group_members" GROUP BY "group_id") gm
WHERE gm."group_id" = g."group_id";

CREATE TEMP TABLE _post_templates (rn int PRIMARY KEY, content text) ON COMMIT DROP;
INSERT INTO _post_templates VALUES
(1,'今週のHanoi日本語カフェ会では、自己紹介と最近見つけた好きな場所について話します。初めて参加する方も安心して来てください。'),
(2,'ベトナム語の発音で「ng」と「nh」がまだ難しいです。日本人向けに分かりやすい練習方法があれば教えてください。'),
(3,'JLPTの読解練習で使いやすい短い記事をまとめました。難しい語彙には日本語で説明を付けています。'),
(4,'Hanoi旧市街で撮った写真を共有します。次回は写真を見ながら日本語で感想を言う練習をしたいです。'),
(5,'日本の職場でよく使う「お疲れさまです」の使い方について質問がありました。場面別に例文を作ったので確認してください。'),
(6,'週末にブンチャーを食べに行く小さな交流会を考えています。日本語で注文する練習も一緒にしましょう。'),
(7,'IT面接でよく聞かれる質問を日本語で練習したい人はいますか。回答例を作って一緒に直しましょう。'),
(8,'好きなアニメのセリフを自然な日常会話に言い換える練習をします。おすすめ作品があればコメントしてください。'),
(9,'日本留学の面接で聞かれやすい質問をリストにしました。経験者の方からアドバイスをもらえると嬉しいです。'),
(10,'今週末は軽いランニング交流を予定しています。運動後にカフェで日本語とベトナム語の会話練習もします。'),
(11,'Hanoiで静かに勉強できるカフェを探しています。Wi-Fiが安定している場所を知っていたら教えてください。'),
(12,'ビジネスメールで「確認します」と「確認いたします」の違いを練習しました。例文をコメントで追加してください。');

INSERT INTO "posts" ("content", "created_at", "group_id", "author_id", "image")
SELECT pt.content, NOW() - (((g.rn + p.off) % 50) * INTERVAL '1 day'), g."group_id", u."user_id", CASE WHEN p.off % 3 = 0 THEN post_asset.path ELSE NULL END
FROM _seed_groups g
JOIN generate_series(0, 3) AS p(off) ON TRUE
JOIN _post_templates pt ON pt.rn = (((g.rn + p.off - 1) % 12) + 1)
JOIN _seed_users u ON u.rn = (((g.rn * 2 + p.off - 1) % 60) + 1)
JOIN _seed_cover_assets post_asset ON post_asset.rn = (((g.rn + p.off + 11) % 23) + 1);

CREATE TEMP TABLE _seed_posts AS
SELECT "post_id", ROW_NUMBER() OVER (ORDER BY "post_id") AS rn FROM "posts";

CREATE TEMP TABLE _comment_templates (rn int PRIMARY KEY, content text) ON COMMIT DROP;
INSERT INTO _comment_templates VALUES
(1,'とても分かりやすい内容です。次回の交流会でこのテーマを話したいです。'),
(2,'私も同じところで悩んでいます。一緒に練習できたら嬉しいです。'),
(3,'例文が自然で勉強になります。自分でも似た文を作ってみます。'),
(4,'その場所は行ったことがあります。静かで会話練習に向いています。'),
(5,'参加したいです。時間と集合場所が決まったら教えてください。'),
(6,'日本語では少し丁寧に言うとさらに自然になります。'),
(7,'写真がきれいですね。次は私もカメラを持って参加します。'),
(8,'この話題なら初心者でも参加しやすいと思います。ありがとうございます。'),
(9,'Hanoiで同じ目的の人が多くて安心しました。'),
(10,'ベトナム語の説明も日本語で聞けるので助かります。');

INSERT INTO "comments" ("content", "created_at", "post_id", "author_id")
SELECT ct.content, NOW() - (((sp.rn + c.off) % 30) * INTERVAL '1 day'), sp."post_id", u."user_id"
FROM _seed_posts sp
JOIN generate_series(0, ((sp.rn % 5) + 1)) AS c(off) ON TRUE
JOIN _comment_templates ct ON ct.rn = (((sp.rn + c.off - 1) % 10) + 1)
JOIN _seed_users u ON u.rn = (((sp.rn * 4 + c.off - 1) % 60) + 1);

INSERT INTO "post_likes" ("user_id", "post_id")
SELECT DISTINCT u."user_id", sp."post_id"
FROM _seed_posts sp
JOIN generate_series(0, ((sp.rn % 9) + 2)) AS l(off) ON TRUE
JOIN _seed_users u ON u.rn = (((sp.rn * 5 + l.off - 1) % 60) + 1);

CREATE TEMP TABLE _seed_sessions (session_id int, rn int, user_a int, user_b int) ON COMMIT DROP;
WITH raw_pairs AS (
    -- Sessions for the demo user (rn = 1) with various Vietnamese users
    SELECT 1 AS rn, 1 AS user_a_rn, 2 AS user_b_rn
    UNION ALL SELECT 2, 1, 4
    UNION ALL SELECT 3, 1, 6
    UNION ALL SELECT 4, 1, 8
    UNION ALL SELECT 5, 1, 10
    UNION ALL SELECT 6, 1, 12
    UNION ALL SELECT 7, 1, 14
    UNION ALL SELECT 8, 1, 16
    -- Other sessions
    UNION ALL SELECT gs + 8 AS rn, (((gs * 2 - 1) % 30) * 2 + 1) AS user_a_rn, (((gs * 2) % 30) * 2 + 2) AS user_b_rn
    FROM generate_series(1, 34) AS gs
), pairs AS (
    SELECT rp.rn, ja."user_id" AS user_a, vi."user_id" AS user_b
    FROM raw_pairs rp
    JOIN _seed_users ja ON ja.rn = rp.user_a_rn
    JOIN _seed_users vi ON vi.rn = rp.user_b_rn
), inserted AS (
    INSERT INTO "match_session" ("status", "created_at")
    SELECT CASE WHEN rn % 11 = 0 THEN 'BLOCKED' ELSE 'ACTIVE' END, NOW() - ((50 - rn) * INTERVAL '1 day')
    FROM pairs
    ORDER BY rn
    RETURNING "session_id"
), numbered_inserted AS (
    SELECT "session_id", ROW_NUMBER() OVER (ORDER BY "session_id") AS rn
    FROM inserted
)
INSERT INTO _seed_sessions
SELECT i."session_id", p.rn, p.user_a, p.user_b
FROM numbered_inserted i
JOIN pairs p ON p.rn = i.rn;

INSERT INTO "match_participants" ("session_id", "user_id")
SELECT session_id, user_a FROM _seed_sessions
UNION ALL
SELECT session_id, user_b FROM _seed_sessions;

CREATE TEMP TABLE _chat_templates (rn int, seq int, sender_side int, content text, attachment text, message_type "MessageType") ON COMMIT DROP;
INSERT INTO _chat_templates VALUES
(1,1,1,'マッチありがとうございます。Hanoiで日本語を練習している方と話せて嬉しいです。',NULL,'TEXT'),
(1,2,2,'こちらこそありがとうございます。日本語の会話はまだ緊張しますが、よろしくお願いします。',NULL,'TEXT'),
(1,3,1,'ゆっくり話しましょう。週末にカフェで一時間くらい練習できますか。',NULL,'TEXT'),
(1,4,2,'はい、土曜日の午後なら大丈夫です。場所はHoan Kiemの近くが便利です。',NULL,'TEXT'),
(2,1,1,'ベトナム語の発音を直してもらいたいです。特に声調が難しいです。',NULL,'TEXT'),
(2,2,2,'声調は短い単語から練習すると分かりやすいです。私も日本語のアクセントを練習したいです。',NULL,'TEXT'),
(2,3,1,'では、お互いに録音して聞き比べる練習をしましょう。',NULL,'TEXT'),
(2,4,2,'いいですね。短い自己紹介から始めたいです。',NULL,'TEXT'),
(3,1,1,'この前話していたカフェの写真を送ります。静かで勉強しやすい場所です。','/assets/images/seed-covers/cover-005.jpeg','IMAGE'),
(3,2,2,'ありがとうございます。雰囲気が良さそうです。次の会話練習で行ってみたいです。',NULL,'TEXT'),
(3,3,1,'予約は必要ないと思います。午後は少し混むので早めが良さそうです。',NULL,'TEXT'),
(3,4,2,'了解しました。日本語で注文する練習もしてみます。',NULL,'TEXT'),
(4,1,1,'JLPTの面接練習では、理由を二つ言うと答えが分かりやすくなります。',NULL,'TEXT'),
(4,2,2,'なるほど。いつも短く答えてしまうので、理由を増やす練習をします。',NULL,'TEXT'),
(4,3,1,'次回は「Hanoiで好きな場所」というテーマで二分話してみましょう。',NULL,'TEXT'),
(4,4,2,'準備しておきます。間違いがあったら直してください。',NULL,'TEXT'),
(5,1,1,'日系企業の面接では、自己紹介を一分でまとめる練習が大切です。',NULL,'TEXT'),
(5,2,2,'自己紹介文を作ったので、自然かどうか見てもらえますか。',NULL,'TEXT'),
(5,3,1,'もちろんです。文章を送ってください。敬語も一緒に確認します。',NULL,'TEXT'),
(5,4,2,'ありがとうございます。とても助かります。',NULL,'TEXT');

INSERT INTO "messages" ("content", "send_at", "session_id", "sender_id", "attachment_url", "is_seen", "message_type", "translated_text")
SELECT ct.content, NOW() - (((s.rn * 4 + ct.seq) % 28) * INTERVAL '1 hour'), s.session_id, CASE WHEN ct.sender_side = 1 THEN s.user_a ELSE s.user_b END, ct.attachment, ct.seq < 4, ct.message_type, jsonb_build_object('ja', ct.content)
FROM _seed_sessions s
JOIN _chat_templates ct ON ct.rn = (((s.rn - 1) % 5) + 1)
ORDER BY s.rn, ct.seq;

CREATE TEMP TABLE _event_templates (rn int PRIMARY KEY, title text, description text, format text, address text, image text) ON COMMIT DROP;
INSERT INTO _event_templates VALUES
(1,'Hanoi日本語フリートーク会','Hanoiに住む日本人と日本語学習者が集まり、自己紹介、趣味、生活の話題で自然に会話する交流イベントです。初参加でも話しやすい小グループ形式です。','offline','Hoan Kiem, Hanoi',NULL),
(2,'ベトナム語生活フレーズ練習','Hanoi生活で使う注文、道案内、買い物、タクシーでの会話を日本人向けに練習します。ベトナム人参加者が発音をサポートします。','offline','Ba Dinh, Hanoi',NULL),
(3,'JLPT会話集中ワークショップ','N3からN1を目指す学習者向けに、理由説明、意見交換、面接形式の会話を実践するオンラインワークショップです。','online',NULL,NULL),
(4,'Hanoiカフェ文化交流','Hanoiの人気カフェで、日本語とベトナム語を使いながら食文化、仕事、生活について話します。','offline','Tay Ho, Hanoi',NULL),
(5,'日系企業キャリア相談会','Hanoiの日系企業で働きたい方向けに、面接、日本語メール、職場マナーについて経験者がアドバイスします。','offline','Cau Giay, Hanoi',NULL),
(6,'週末フォトウォーク交流','Hanoi旧市街を歩きながら写真を撮り、撮った写真について日本語で感想を話すイベントです。','offline','Old Quarter, Hanoi',NULL),
(7,'日本文化ミニ講座','日本の季節行事、敬語、学校生活、職場文化を日本語で紹介し、参加者同士で質問し合います。','online',NULL,NULL),
(8,'ベトナム料理と言語交換','Bun ChaやPhoを楽しみながら、日本語とベトナム語で料理、家族、旅行について話す交流イベントです。','offline','Dong Da, Hanoi',NULL),
(9,'ITエンジニア日本語交流','HanoiのITエンジニア向けに、技術説明、自己紹介、面接で使う日本語を練習するイベントです。','offline','Nam Tu Liem, Hanoi',NULL),
(10,'留学準備と自己紹介練習','日本留学を目指す方向けに、志望理由、研究計画、自己紹介を日本語で練習します。','online',NULL,NULL),
(11,'映画で学ぶ自然な日本語','短い映画シーンを見ながら、日常会話の相づち、感情表現、言い換えを学ぶイベントです。','offline','Hai Ba Trung, Hanoi',NULL),
(12,'朝の散歩と言語交換','朝の涼しい時間にHanoiを散歩しながら、簡単な日本語とベトナム語で会話を楽しみます。','offline','West Lake, Hanoi',NULL);

INSERT INTO "events" ("title", "description", "event_time", "format", "address", "url_link", "image_url", "created_at", "admin_id", "administratorId", "status")
SELECT et.title || ' #' || LPAD(gs::text, 3, '0'), et.description, NOW() + ((gs + 2) * INTERVAL '1 day'), et.format, et.address, CASE WHEN et.format = 'online' THEN 'https://tomoio.local/events/seed-' || LPAD(gs::text, 3, '0') ELSE NULL END, event_asset.path, NOW() - ((gs % 20) * INTERVAL '1 day'), u."user_id", a."admin_id", CASE WHEN gs % 10 = 0 THEN 'PENDING'::"EventStatus" WHEN gs % 13 = 0 THEN 'REJECTED'::"EventStatus" ELSE 'APPROVED'::"EventStatus" END
FROM generate_series(1, 36) AS gs
JOIN _event_templates et ON et.rn = (((gs - 1) % 12) + 1)
JOIN _seed_users u ON u.rn = (((gs * 3 - 1) % 60) + 1)
JOIN "administrators" a ON a."admin_id" = (((gs - 1) % 12) + 1)
JOIN _seed_cover_assets event_asset ON event_asset.rn = (((gs + 13) % 23) + 1);

CREATE TEMP TABLE _seed_events AS
SELECT "event_id", ROW_NUMBER() OVER (ORDER BY "event_id") AS rn FROM "events";

INSERT INTO "event_engagements" ("event_id", "user_id", "engagement_type", "engaged_at")
SELECT e."event_id", u."user_id", CASE WHEN p.off % 4 = 0 THEN 'interested' ELSE 'joined' END, NOW() - (((e.rn + p.off) % 25) * INTERVAL '1 day')
FROM _seed_events e
JOIN generate_series(0, 11) AS p(off) ON TRUE
JOIN _seed_users u ON u.rn = (((e.rn * 4 + p.off - 1) % 60) + 1);

INSERT INTO "kyc_requests" ("document_image_url", "reject_reason", "submitted_at", "reviewed_at", "user_id", "admin_id", "status")
SELECT cover.path, CASE WHEN u.rn % 15 = 0 THEN '画像が不鮮明です。もう一度アップロードしてください。' ELSE NULL END, NOW() - ((70 - u.rn) * INTERVAL '1 day'), CASE WHEN u.rn % 15 = 0 OR u.rn % 9 <> 0 THEN NOW() - ((68 - u.rn) * INTERVAL '1 day') ELSE NULL END, u."user_id", CASE WHEN u.rn % 9 = 0 THEN NULL ELSE (((u.rn - 1) % 12) + 1) END, CASE WHEN u.rn % 15 = 0 THEN 'REJECTED'::"KycStatus" WHEN u.rn % 9 = 0 THEN 'PENDING'::"KycStatus" ELSE 'APPROVED'::"KycStatus" END
FROM _seed_users u
JOIN _seed_cover_assets cover ON cover.rn = (((u.rn + 5) % 23) + 1);

INSERT INTO "report_cases" ("reason", "evidence_url", "created_at", "admin_id", "status")
SELECT '不適切な表現またはスパムの可能性があるため確認が必要です。', cover.path, NOW() - ((gs % 20) * INTERVAL '1 day'), (((gs - 1) % 12) + 1), CASE WHEN gs % 5 = 0 THEN 'APPROVED'::"ReportCaseStatus" WHEN gs % 7 = 0 THEN 'REJECTED'::"ReportCaseStatus" ELSE 'PENDING'::"ReportCaseStatus" END
FROM generate_series(1, 18) AS gs
JOIN _seed_cover_assets cover ON cover.rn = (((gs + 9) % 23) + 1);

INSERT INTO "report_parties" ("user_id", "case_id", "party_role")
SELECT reporter."user_id", rc."case_id", 'REPORTER'
FROM "report_cases" rc
JOIN _seed_users reporter ON reporter.rn = (((rc."case_id" * 3 - 1) % 60) + 1)
UNION ALL
SELECT reported."user_id", rc."case_id", 'REPORTED'
FROM "report_cases" rc
JOIN _seed_users reported ON reported.rn = (((rc."case_id" * 3 + 17) % 60) + 1);

INSERT INTO "user_profile_actions" ("actor_id", "target_id", "action", "created_at")
SELECT actor."user_id", target_user."user_id", action_name::"ProfileActionType", NOW() - (((actor.rn + off + action_idx) % 35) * INTERVAL '1 day')
FROM _seed_users actor
JOIN generate_series(1, 4) AS off ON TRUE
JOIN LATERAL (VALUES (1,'LIKE'),(2,'PASS'),(3,'BLOCK')) AS actions(action_idx, action_name) ON TRUE
JOIN _seed_users target_user ON target_user.rn = (((actor.rn + off * 7 + action_idx - 1) % 60) + 1)
WHERE actor."user_id" <> target_user."user_id";

-- Mutual likes for strong match examples.
INSERT INTO "user_profile_actions" ("actor_id", "target_id", "action", "created_at")
SELECT a."user_id", b."user_id", 'LIKE'::"ProfileActionType", NOW() - (pair_no * INTERVAL '1 day')
FROM generate_series(1, 20) AS pair_no
JOIN _seed_users a ON a.rn = pair_no
JOIN _seed_users b ON b.rn = pair_no + 20
ON CONFLICT DO NOTHING;

INSERT INTO "user_profile_actions" ("actor_id", "target_id", "action", "created_at")
SELECT b."user_id", a."user_id", 'LIKE'::"ProfileActionType", NOW() - (pair_no * INTERVAL '1 day')
FROM generate_series(1, 20) AS pair_no
JOIN _seed_users a ON a.rn = pair_no
JOIN _seed_users b ON b.rn = pair_no + 20
ON CONFLICT DO NOTHING;

-- Mutual likes for the demo user (rn = 1) with chat partners
INSERT INTO "user_profile_actions" ("actor_id", "target_id", "action", "created_at")
SELECT a."user_id", b."user_id", 'LIKE'::"ProfileActionType", NOW() - (b.rn * INTERVAL '1 hour')
FROM _seed_users a
CROSS JOIN _seed_users b
WHERE a.rn = 1 AND b.rn IN (2, 4, 6, 8, 10, 12, 14, 16)
ON CONFLICT DO NOTHING;

INSERT INTO "user_profile_actions" ("actor_id", "target_id", "action", "created_at")
SELECT b."user_id", a."user_id", 'LIKE'::"ProfileActionType", NOW() - (b.rn * INTERVAL '1 hour')
FROM _seed_users a
CROSS JOIN _seed_users b
WHERE a.rn = 1 AND b.rn IN (2, 4, 6, 8, 10, 12, 14, 16)
ON CONFLICT DO NOTHING;


INSERT INTO "Notification" ("userId", "type", "message", "related_user_id", "session_id", "isRead", "createdAt")
SELECT recipient."user_id", (ARRAY['MATCH','NEW_MESSAGE','PROFILE_LIKE','EVENT','GROUP'])[(gs % 5) + 1],
       (ARRAY['新しいマッチが成立しました。チャットを始めてみましょう。','新しいメッセージが届いています。','あなたのプロフィールにいいねが届きました。','参加予定のイベントが近づいています。','参加中のグループに新しい投稿があります。'])[(gs % 5) + 1],
       related_user."user_id", s.session_id, gs % 4 = 0, NOW() - ((gs % 40) * INTERVAL '1 hour')
FROM generate_series(1, 140) AS gs
JOIN _seed_users recipient ON recipient.rn = (((gs - 1) % 60) + 1)
JOIN _seed_users related_user ON related_user.rn = (((gs + 11) % 60) + 1)
JOIN _seed_sessions s ON s.rn = (((gs - 1) % 42) + 1);

COMMIT;

-- Quick check
SELECT 'verified_users' AS table_name, COUNT(*) AS seed_count FROM "verified_users"
UNION ALL SELECT 'administrators', COUNT(*) FROM "administrators"
UNION ALL SELECT 'groups', COUNT(*) FROM "groups"
UNION ALL SELECT 'group_members', COUNT(*) FROM "group_members"
UNION ALL SELECT 'posts', COUNT(*) FROM "posts"
UNION ALL SELECT 'comments', COUNT(*) FROM "comments"
UNION ALL SELECT 'post_likes', COUNT(*) FROM "post_likes"
UNION ALL SELECT 'match_session', COUNT(*) FROM "match_session"
UNION ALL SELECT 'messages', COUNT(*) FROM "messages"
UNION ALL SELECT 'events', COUNT(*) FROM "events"
UNION ALL SELECT 'event_engagements', COUNT(*) FROM "event_engagements"
UNION ALL SELECT 'user_profile_actions', COUNT(*) FROM "user_profile_actions"
UNION ALL SELECT 'notifications', COUNT(*) FROM "Notification";
