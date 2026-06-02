-- Migration: 0019_deal_pipeline_insert_rls
-- Scope:
-- - deal_pipeline への INSERT を operator/admin に許可する RLS ポリシーを追加。
-- - 既存方針（migration 0014）に合わせ、deal の作成/更新は運営専管とする。
-- - 非破壊（追加のみ）。select/update ポリシーは 0014 で既存のため変更しない。

create policy deal_pipeline_insert_ops_admin
on public.deal_pipeline
for insert
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
  and deleted_at is null
);
