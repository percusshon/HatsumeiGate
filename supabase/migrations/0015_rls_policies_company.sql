-- Hatsumei Gate: company-side RLS policies (minimal visibility)
-- Scope: company_user / company_admin / company_legal_reviewer
-- Not included: inventor/operator/admin/partner policies.
-- Note:
-- - Company access to sensitive inventions data is intentionally not exposed via direct SELECT here.
-- - Detailed invention disclosure is served via API/service_role with DTO filtering and logging.
-- - storage.objects direct access is not controlled here (handled by storage policy + API signed URL flow).

-- Company membership helpers
create or replace function public.is_company_member_of(_company_account_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
set row_security = off
as $$
  -- RLS policy recursion回避: company_members / 0007系データへの判定は
  -- 本関数内でboolean判定のみ行い、policy再帰を起こさない。
  select exists (
    select 1
    from public.company_members cm
    where cm.company_account_id = _company_account_id
      and cm.user_id = auth.uid()
      and cm.deleted_at is null
  );
$$;

create or replace function public.has_company_role(_company_account_id uuid, _roles app_role[])
returns boolean
language sql
security definer
stable
set search_path = public
set row_security = off
as $$
  -- RLS policy recursion回避: 会社メンバー/ロール判定を行うboolean helper。
  select exists (
    select 1
    from public.company_members cm
    where cm.company_account_id = _company_account_id
      and cm.user_id = auth.uid()
      and cm.deleted_at is null
      and cm.role = any(_roles)
  );
$$;

create or replace function public.has_active_company_nda(_company_account_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
set row_security = off
as $$
  -- RLS policy recursion回避: NDA有効性確認を関数内で最短boolean化。
  select exists (
    select 1
    from public.nda_acceptances na
    where na.company_account_id = _company_account_id
      and na.accepted_at is not null
      and na.revoked_at is null
      and na.deleted_at is null
      and (na.expires_at is null or na.expires_at > now())
  );
$$;

create or replace function public.disclosure_level_rank(_level disclosure_level)
returns int
language sql
immutable
set search_path = public
as $$
  select case _level
    when 'level_0_internal_only' then 0
    when 'level_1_company_teaser' then 1
    when 'level_2_nda_summary' then 2
    when 'level_3_nda_detail' then 3
    when 'level_4_negotiation_package' then 4
    else 0
  end;
$$;

create or replace function public.company_has_approved_disclosure(
  _company_account_id uuid,
  _invention_id uuid,
  _required_level disclosure_level
)
returns boolean
language sql
security definer
stable
set search_path = public
set row_security = off
as $$
  -- RLS policy recursion回避: NDA/開示承認条件を一括判定するboolean helper。
  select exists (
    select 1
    from public.company_disclosure_requests cdr
    where cdr.company_account_id = _company_account_id
      and cdr.invention_id = _invention_id
      and cdr.status = 'approved'
      and cdr.inventor_approved = true
      and cdr.approved_level is not null
      and cdr.deleted_at is null
      and public.disclosure_level_rank(cdr.approved_level) >= public.disclosure_level_rank(_required_level)
  );
$$;

-- company_accounts
create policy company_accounts_select_by_member
on public.company_accounts
for select
using (
  public.is_company_member_of(id)
  and deleted_at is null
);
-- MVP: company_accounts direct UPDATE is intentionally disabled.
-- RLS is row-level and cannot safely protect review_status/reviewed_by/reviewed_at/review_note
-- at column granularity; company info updates will be handled by API with explicit allow-lists.

-- company_members (read-only for company users/admins)
create policy company_members_select_by_member
on public.company_members
for select
using (
  public.is_company_member_of(company_account_id)
  and deleted_at is null
);

-- nda_acceptances
create policy nda_acceptances_select_by_member
on public.nda_acceptances
for select
using (
  public.is_company_member_of(company_account_id)
  and deleted_at is null
);

create policy nda_acceptances_insert_by_member
on public.nda_acceptances
for insert
with check (
  public.has_company_role(company_account_id, ARRAY['company_user'::app_role, 'company_admin'::app_role, 'company_legal_reviewer'::app_role])
  and public.is_company_member_of(company_account_id)
);

-- company_disclosure_requests
create policy company_disclosure_requests_select_by_member
on public.company_disclosure_requests
for select
using (
  public.is_company_member_of(company_account_id)
  and deleted_at is null
);

create policy company_disclosure_requests_insert_by_member
on public.company_disclosure_requests
for insert
with check (
  public.has_company_role(company_account_id, ARRAY['company_user'::app_role, 'company_admin'::app_role, 'company_legal_reviewer'::app_role])
  and public.is_company_member_of(company_account_id)
);

-- company_invention_views
-- API is preferred for insert; provide only read for own-company records.
create policy company_invention_views_select_by_member
on public.company_invention_views
for select
using (
  public.is_company_member_of(company_account_id)
);

-- Deals
create policy deal_pipeline_select_by_member
on public.deal_pipeline
for select
using (
  public.is_company_member_of(company_account_id)
  and deleted_at is null
);

create policy deal_status_events_select_by_member_visible
on public.deal_status_events
for select
using (
  public.is_company_member_of((select company_account_id from public.deal_pipeline dp where dp.id = deal_id))
  and visible_to_company = true
);

-- Restrict sensitive tables from company direct read:
-- inventions / invention_files / prior_art_items / ip_strategy_notes /
-- invention_screening_reports / invention_screening_scores / revenue_events / audit_logs
-- are intentionally not exposed here.
