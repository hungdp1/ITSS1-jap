-- Speed up unread counts per session (groupBy sessionId + isSeen filter)
CREATE INDEX "messages_session_unread_idx" ON "messages"("session_id", "is_seen", "sender_id")
WHERE "deleted_at" IS NULL;
