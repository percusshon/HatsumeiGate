-- Migration: 0024_inventor_respond_needs_more_info
-- Scope:
-- - 発明者が needs_more_info の発明に追加情報を提出し、screening へ戻せるようにする。
-- - 直接 UPDATE 権限は与えず SECURITY DEFINER 関数経由（0018/0021 と同方針）。
-- - status 遷移イベント（補足提出メモ付き）も関数内で記録する。
-- - 非破壊（追加のみ）。

create or replace function public.inventor_respond_needs_more_info(
  _invention_id uuid,
  _note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status invention_status;
begin
  select i.status
    into v_status
  from public.inventions i
  where i.id = _invention_id
    and i.inventor_id = auth.uid()
    and i.deleted_at is null;

  if v_status is null then
    raise exception 'invention not found or not authorized';
  end if;

  if v_status <> 'needs_more_info' then
    raise exception 'invention is not awaiting more info (status=%)', v_status;
  end if;

  if _note is null or btrim(_note) = '' then
    raise exception 'response note is required';
  end if;

  update public.inventions
  set status = 'screening',
      updated_by = auth.uid()
  where id = _invention_id
    and deleted_at is null;

  insert into public.invention_status_events (
    invention_id, from_status, to_status, changed_by, reason, visible_to_inventor
  ) values (
    _invention_id, 'needs_more_info', 'screening', auth.uid(), _note, true
  );
end;
$$;

grant execute on function public.inventor_respond_needs_more_info(uuid, text) to authenticated;
