-- Migration: 0026_revenue_events_rls
-- Scope:
-- - revenue_events への operator/admin の INSERT を許可する。
-- - operator/reviewer/admin の SELECT を許可する（既存は admin のみ）。
-- - 発明者は自分の発明に紐づく収益イベントを閲覧できる（透明性のため）。
-- - 金額・手数料率は API/UI 入力値とし、本migrationでは業務上の数値ポリシーを固定しない。
-- - 非破壊（追加のみ）。

create policy revenue_events_insert_ops_admin
on public.revenue_events
for insert
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy revenue_events_select_internal
on public.revenue_events
for select
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy revenue_events_select_own_inventor
on public.revenue_events
for select
using (
  invention_id is not null
  and public.is_inventor_owner_of_invention(invention_id)
  and deleted_at is null
);
