-- Migration: 0027_partner_assignment_ops_rls
-- Scope:
-- - operator/admin が弁理士パートナー割当（partner_invention_assignments）を
--   作成・取消できるようにする INSERT/UPDATE ポリシーを追加する。
-- - partner 自身は引き続き read-only（0016 の select_self のみ）。
-- - 非破壊（追加のみ）。

create policy partner_assignments_insert_ops_admin
on public.partner_invention_assignments
for insert
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
);

create policy partner_assignments_update_ops_admin
on public.partner_invention_assignments
for update
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
)
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
);

-- operator/admin は割当の参照も必要（一覧表示）。
create policy partner_assignments_select_ops_admin
on public.partner_invention_assignments
for select
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
);
