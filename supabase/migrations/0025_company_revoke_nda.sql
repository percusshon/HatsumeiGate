-- Migration: 0025_company_revoke_nda
-- Scope:
-- - 企業メンバーが自社の NDA 同意を失効（revoke）できるようにする。
-- - 直接 UPDATE 権限は与えず SECURITY DEFINER 関数経由（company 系は select/insert のみの RLS）。
-- - 非破壊（追加のみ）。

create or replace function public.company_revoke_nda(
  _nda_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_account_id uuid;
  v_revoked_at timestamptz;
begin
  select company_account_id, revoked_at
    into v_company_account_id, v_revoked_at
  from public.nda_acceptances
  where id = _nda_id
    and deleted_at is null;

  if v_company_account_id is null then
    raise exception 'nda acceptance not found';
  end if;

  if not public.is_company_member_of(v_company_account_id) then
    raise exception 'not authorized';
  end if;

  if v_revoked_at is not null then
    return; -- 既に失効済みなら冪等に何もしない。
  end if;

  update public.nda_acceptances
  set revoked_at = now()
  where id = _nda_id
    and deleted_at is null;
end;
$$;

grant execute on function public.company_revoke_nda(uuid) to authenticated;
