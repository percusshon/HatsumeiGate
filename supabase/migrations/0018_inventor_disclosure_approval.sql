-- Migration: 0018_inventor_disclosure_approval
-- Scope:
-- - 発明者が、自分の発明に対する開示申請を閲覧し、開示同意(inventor_approved)を
--   設定できるようにする。
-- - 列単位の制限（status/approved_level を発明者に触らせない）のため、
--   UPDATE は SECURITY DEFINER 関数経由に限定し、テーブルへの直接 UPDATE 権限は与えない。
-- - 非破壊（追加のみ）。

-- 発明者は自分の発明に対する開示申請を閲覧できる（company名等の他テーブルは別途RLSで制御）。
create policy company_disclosure_requests_select_own_inventor
on public.company_disclosure_requests
for select
using (
  public.is_inventor_owner_of_invention(invention_id)
  and deleted_at is null
);

-- 発明者の開示同意の設定/取消のみを許可する関数。
-- status / approved_level など運営専管の列は変更しない。
create or replace function public.set_inventor_disclosure_approval(
  _request_id uuid,
  _approved boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invention_id uuid;
begin
  select invention_id
    into v_invention_id
  from public.company_disclosure_requests
  where id = _request_id
    and deleted_at is null;

  if v_invention_id is null then
    raise exception 'disclosure request not found';
  end if;

  -- 呼び出し元が当該発明の発明者本人であることを確認。
  if not exists (
    select 1
    from public.inventions i
    where i.id = v_invention_id
      and i.inventor_id = auth.uid()
      and i.deleted_at is null
  ) then
    raise exception 'not authorized';
  end if;

  update public.company_disclosure_requests
  set inventor_approved = _approved,
      inventor_approved_by = case when _approved then auth.uid() else null end,
      inventor_approved_at = case when _approved then now() else null end,
      updated_by = auth.uid()
  where id = _request_id
    and deleted_at is null;
end;
$$;

grant execute on function public.set_inventor_disclosure_approval(uuid, boolean) to authenticated;
