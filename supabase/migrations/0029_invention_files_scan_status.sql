-- Migration: 0029_invention_files_scan_status
-- Scope:
-- - 開示ファイルのウイルススキャン基盤として invention_files にスキャン状態列を追加する。
-- - 後方互換・非破壊: 既定 'pending'。配信ゲートは 'infected' のみブロックするため、
--   既存ファイル/新規アップロードは従来どおり配信可能（スキャナ未配線でも挙動不変）。
-- - スキャン結果の書込はアプリの service_role 経由のみ（invention_files には
--   authenticated ロールの UPDATE ポリシーが存在しないため、追加 RLS は不要）。
-- - 実スキャナ（ワーカー）は外部インフラ依存のため本 migration には含めない。
--   設計は docs/virus-scan-proposal.md を参照。

do $$ begin
  create type file_scan_status as enum ('pending', 'clean', 'infected', 'error');
exception
  when duplicate_object then null;
end $$;

alter table public.invention_files
  add column if not exists scan_status file_scan_status not null default 'pending',
  add column if not exists scanned_at timestamptz,
  add column if not exists scan_detail text;

comment on column public.invention_files.scan_status is
  'ウイルススキャン状態。配信ゲートは infected のみブロック（pending/clean/error は配信可）。書込は service_role のみ。';
comment on column public.invention_files.scanned_at is 'スキャン完了時刻（未スキャンは null）。';
comment on column public.invention_files.scan_detail is '検出名やエラー要因などの補足（任意）。';

create index if not exists invention_files_scan_status_idx
  on public.invention_files(scan_status);
