-- 0013_rls_policies_inventor
-- Scope:
-- - Add inventor self-access policies only.
-- - Operator/admin/company/partner policies are in subsequent migrations.
-- - storage.objects policy changes are not included here.

-- Helper predicate: inventor owns target invention.
create or replace function public.is_inventor_owner_of_invention(_invention_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.inventions i
    where i.id = _invention_id
      and i.inventor_id = auth.uid()
      and i.deleted_at is null
  );
$$;

-- users_profile: self only
create policy users_profile_select_self
  on public.users_profile
  for select
  using (
    auth.uid() = id
    and deleted_at is null
  );

create policy users_profile_insert_self
  on public.users_profile
  for insert
  with check (
    id = auth.uid()
    and deleted_at is null
  );

create policy users_profile_update_self
  on public.users_profile
  for update
  using (
    auth.uid() = id
    and deleted_at is null
  )
  with check (
    id = auth.uid()
    and deleted_at is null
  );

-- inventions: inventor owns own draft only in this phase
create policy inventions_select_own
  on public.inventions
  for select
  using (
    inventor_id = auth.uid()
    and deleted_at is null
  );

create policy inventions_insert_own_draft
  on public.inventions
  for insert
  with check (
    inventor_id = auth.uid()
    and deleted_at is null
    and coalesce(status, 'draft') = 'draft'
  );

create policy inventions_update_own_draft
  on public.inventions
  for update
  using (
    inventor_id = auth.uid()
    and deleted_at is null
    and coalesce(status, 'draft') = 'draft'
  )
  with check (
    inventor_id = auth.uid()
    and deleted_at is null
    and coalesce(status, 'draft') = 'draft'
  );

-- invention_files: self metadata access only
create policy invention_files_select_own
  on public.invention_files
  for select
  using (
    public.is_inventor_owner_of_invention(invention_id)
    and deleted_at is null
  );

create policy invention_files_insert_own
  on public.invention_files
  for insert
  with check (
    public.is_inventor_owner_of_invention(invention_id)
    and deleted_at is null
  );

-- submission check: self only
create policy invention_submission_checks_select_own
  on public.invention_submission_checks
  for select
  using (
    public.is_inventor_owner_of_invention(invention_id)
    and deleted_at is null
  );

create policy invention_submission_checks_insert_own
  on public.invention_submission_checks
  for insert
  with check (
    public.is_inventor_owner_of_invention(invention_id)
    and deleted_at is null
  );

create policy invention_submission_checks_update_own
  on public.invention_submission_checks
  for update
  using (
    public.is_inventor_owner_of_invention(invention_id)
    and deleted_at is null
  )
  with check (
    public.is_inventor_owner_of_invention(invention_id)
    and deleted_at is null
  );

-- status events: visible-to-inventor only
create policy invention_status_events_select_visible_own
  on public.invention_status_events
  for select
  using (
    visible_to_inventor = true
    and public.is_inventor_owner_of_invention(invention_id)
  );

-- The following tables are intentionally not exposed to inventor directly in this phase.
-- - invention_screening_reports
-- - invention_screening_scores
-- - prior_art_items
-- - ip_strategy_notes
-- - deal_pipeline
-- - deal_status_events
-- - revenue_events
-- - audit_logs
-- These can be exposed via dedicated API responses or additional views after risk review.
