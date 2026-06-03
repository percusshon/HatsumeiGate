-- Migration: 0028_company_revoke_nda_role
-- Scope:
-- - NDA の失効を company_admin / company_legal_reviewer に限定する（多層防御）。
-- - company_revoke_nda を create or replace で更新（署名は不変）。
-- - 非破壊（挙動の制限強化のみ）。

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

  -- 当該企業のメンバーであること、かつ admin / legal_reviewer ロールであること。
  if not public.is_company_member_of(v_company_account_id) then
    raise exception 'not authorized';
  end if;
  if not public.has_any_app_role(ARRAY['company_admin'::app_role,'company_legal_reviewer'::app_role]) then
    raise exception 'nda revoke requires company_admin or company_legal_reviewer';
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
