-- Migration: 0021_inventor_withdraw_invention
-- Scope:
-- - 発明者が、自分の発明を取り下げ（withdrawn）できるようにする。
-- - 直接 UPDATE 権限は与えず、SECURITY DEFINER 関数経由に限定する（0018 と同方針）。
-- - 取り下げ可能なのは、企業検討/交渉/終了系に入る前の内部フェーズに限る。
-- - status 遷移イベントも関数内で記録する。
-- - 非破壊（追加のみ）。

create or replace function public.inventor_withdraw_invention(
  _invention_id uuid,
  _reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status invention_status;
begin
  -- 呼び出し元が当該発明の発明者本人であることを確認し、現在ステータスを取得。
  select i.status
    into v_status
  from public.inventions i
  where i.id = _invention_id
    and i.inventor_id = auth.uid()
    and i.deleted_at is null;

  if v_status is null then
    raise exception 'invention not found or not authorized';
  end if;

  -- 取り下げ可能フェーズに限定する（企業検討・交渉・終了系は不可）。
  if v_status not in (
    'submitted',
    'screening',
    'needs_more_info',
    'prior_art_research',
    'ip_strategy_review',
    'prototype_review',
    'attorney_review_ready',
    'company_disclosure_ready'
  ) then
    raise exception 'invention cannot be withdrawn from status %', v_status;
  end if;

  update public.inventions
  set status = 'withdrawn',
      updated_by = auth.uid()
  where id = _invention_id
    and deleted_at is null;

  insert into public.invention_status_events (
    invention_id, from_status, to_status, changed_by, reason, visible_to_inventor
  ) values (
    _invention_id, v_status, 'withdrawn', auth.uid(), _reason, true
  );
end;
$$;

grant execute on function public.inventor_withdraw_invention(uuid, text) to authenticated;
