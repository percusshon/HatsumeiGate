-- Migration: 0023_disclosure_revoke_cascade
-- Scope:
-- - 発明者が開示同意を取り消したとき、承認済みの開示申請も失効させる連動処理を追加する。
-- - set_inventor_disclosure_approval を create or replace で更新（署名は不変）。
-- - 非破壊（関数の挙動拡張のみ）。

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
  v_status text;
begin
  select invention_id, status
    into v_invention_id, v_status
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
      -- 同意取消時、承認済みなら開示を失効（revoked）させ承認レベルをクリアする。
      status = case
        when not _approved and v_status = 'approved' then 'revoked'
        else status
      end,
      approved_level = case
        when not _approved and v_status = 'approved' then null
        else approved_level
      end,
      updated_by = auth.uid()
  where id = _request_id
    and deleted_at is null;
end;
$$;
