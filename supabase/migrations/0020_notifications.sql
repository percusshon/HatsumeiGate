-- Migration: 0020_notifications
-- Scope:
-- - アプリ内通知（in-app notification）テーブルと RLS。
-- - 受信者は自分宛の通知のみ閲覧/既読更新できる。作成はサーバー（service_role）のみ。
-- - 機密本文（発明内容等）は title/body に入れない運用とする（構造化された文脈＋リンクのみ）。
-- - 非破壊（追加のみ）。

create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.users_profile(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  invention_id uuid references public.inventions(id) on delete set null,
  company_account_id uuid references public.company_accounts(id) on delete set null,
  deal_id uuid references public.deal_pipeline(id) on delete set null,
  disclosure_request_id uuid references public.company_disclosure_requests(id) on delete set null,
  link_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_user_id_idx
  on public.notifications(recipient_user_id);
create index if not exists notifications_recipient_unread_idx
  on public.notifications(recipient_user_id, read_at);
create index if not exists notifications_created_at_idx
  on public.notifications(created_at);

alter table public.notifications enable row level security;

-- 受信者本人のみ自分宛通知を閲覧できる。
create policy notifications_select_own
on public.notifications
for select
using (
  recipient_user_id = auth.uid()
);

-- 受信者本人のみ自分宛通知を更新できる（既読化想定）。
create policy notifications_update_own
on public.notifications
for update
using (
  recipient_user_id = auth.uid()
)
with check (
  recipient_user_id = auth.uid()
);

-- INSERT ポリシーは作らない（通知の作成はサーバーの service_role に限定する）。
