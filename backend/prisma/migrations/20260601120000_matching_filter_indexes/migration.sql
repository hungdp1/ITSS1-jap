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
