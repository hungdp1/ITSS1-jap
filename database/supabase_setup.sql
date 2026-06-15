-- ============================================================
-- Supabase platform setup for Tomoio (storage + realtime + RLS)
-- Safe to run multiple times.
-- ============================================================

-- ---------- Storage bucket for all uploads (avatars, chat images, posts) ----------
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do update set public = true;

drop policy if exists "uploads public read" on storage.objects;
create policy "uploads public read" on storage.objects
  for select to public using (bucket_id = 'uploads');

drop policy if exists "uploads anon write" on storage.objects;
create policy "uploads anon write" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'uploads');

-- ---------- Realtime for chat messages + notifications ----------
-- Full row on UPDATE/DELETE so the client can reconcile edits/deletes/translations.
alter table "messages" replica identity full;
alter table "Notification" replica identity full;

-- Realtime delivery to the anon role requires RLS + a SELECT policy + SELECT grant.
-- NOTE: data reads in the app go through the server (postgres superuser, bypasses RLS);
-- these permissive policies only expose realtime row events to the browser client.
alter table "messages" enable row level security;
alter table "Notification" enable row level security;

drop policy if exists "messages realtime read" on "messages";
create policy "messages realtime read" on "messages"
  for select to anon, authenticated using (true);

drop policy if exists "notification realtime read" on "Notification";
create policy "notification realtime read" on "Notification"
  for select to anon, authenticated using (true);

grant select on "messages" to anon, authenticated;
grant select on "Notification" to anon, authenticated;

-- Add tables to the realtime publication (guarded — add only if missing).
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table "messages";
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'Notification'
  ) then
    alter publication supabase_realtime add table "Notification";
  end if;
end $$;

select 'supabase setup done' as status;
