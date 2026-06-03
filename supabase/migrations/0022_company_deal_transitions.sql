-- Migration: 0022_company_deal_transitions
-- Scope:
-- - 企業メンバーが、自社が当事者の取引(deal)について「会社主導」の遷移を実行できるようにする。
-- - deal_pipeline / deal_status_events への直接 INSERT/UPDATE 権限は与えず、
--   SECURITY DEFINER 関数経由に限定する（0018/0021 と同方針）。
-- - 許可する遷移は docs/deal-pipeline-state-machine.md の会社主導遷移のみ。
-- - 会社内ロール(user/admin/legal_reviewer)の細分は本MVPでは区別しない。
-- - 非破壊（追加のみ）。

create or replace function public.company_advance_deal(
  _deal_id uuid,
  _to_status deal_status,
  _reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_account_id uuid;
  v_from_status deal_status;
  v_allowed boolean;
begin
  select dp.company_account_id, dp.status
    into v_company_account_id, v_from_status
  from public.deal_pipeline dp
  where dp.id = _deal_id
    and dp.deleted_at is null;

  if v_company_account_id is null then
    raise exception 'deal not found';
  end if;

  -- 呼び出し元が当該取引の企業メンバーであることを確認。
  if not public.is_company_member_of(v_company_account_id) then
    raise exception 'not authorized';
  end if;

  -- 会社主導の許可遷移のみ通す。
  v_allowed := case v_from_status
    when 'no_interest' then _to_status in ('interested', 'declined')
    when 'interested' then _to_status in ('nda_requested', 'declined')
    when 'nda_requested' then _to_status in ('nda_accepted', 'declined')
    when 'nda_accepted' then _to_status in ('meeting_requested')
    when 'meeting_requested' then _to_status in ('meeting_completed', 'declined')
    when 'evaluating' then _to_status in ('declined')
    when 'terms_proposed' then _to_status in ('negotiating')
    else false
  end;

  if not v_allowed then
    raise exception 'company transition % -> % not allowed', v_from_status, _to_status;
  end if;

  update public.deal_pipeline
  set status = _to_status,
      updated_by = auth.uid()
  where id = _deal_id
    and deleted_at is null;

  insert into public.deal_status_events (
    deal_id, from_status, to_status, changed_by, reason, visible_to_inventor, visible_to_company
  ) values (
    _deal_id, v_from_status, _to_status, auth.uid(), _reason, true, true
  );
end;
$$;

grant execute on function public.company_advance_deal(uuid, deal_status, text) to authenticated;
