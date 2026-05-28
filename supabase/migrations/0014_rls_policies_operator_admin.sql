-- Hatsumei Gate: operator/reviewer/admin RLS policies (internal operations)
-- Scope: this migration adds internal role-based access for operator / reviewer / admin.
-- company_user / patent_attorney_partner policies are handled in other migrations.
-- Inventor self-access policies are implemented in 0013 and not modified here.
--
-- Role source:
-- users_profile does not currently carry app_role directly in committed schemas,
-- so internal role assignment is modeled by user_app_roles in this migration.
-- TODO: move role table to dedicated migration if schema plan is split.

create table if not exists public.user_app_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  role app_role not null,
  created_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint user_app_roles_role_check check (role in ('inventor','operator','reviewer','admin','patent_attorney_partner','company_user','company_admin','company_legal_reviewer'))
);

create unique index if not exists user_app_roles_active_user_role_idx
on public.user_app_roles (user_id, role)
where deleted_at is null;

create or replace function public.has_app_role(_role app_role)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_app_roles ur
    where ur.user_id = auth.uid()
      and ur.deleted_at is null
      and ur.role = _role
  );
$$;

create or replace function public.has_any_app_role(_roles app_role[])
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_app_roles ur
    where ur.user_id = auth.uid()
      and ur.deleted_at is null
      and ur.role = any (_roles)
  );
$$;

-- users_profile
create policy users_profile_select_internal
on public.users_profile
for select
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
);

create policy users_profile_update_admin
on public.users_profile
for update
using (
  public.has_app_role('admin'::app_role)
)
with check (
  public.has_app_role('admin'::app_role)
);

-- inventions
create policy inventions_select_internal
on public.inventions
for select
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy inventions_update_internal
on public.inventions
for update
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
  and deleted_at is null
)
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
  and deleted_at is null
);

-- invention_files metadata only
create policy invention_files_select_internal
on public.invention_files
for select
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

-- submission checks
create policy invention_submission_checks_select_internal
on public.invention_submission_checks
for select
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

-- status events
create policy invention_status_events_select_internal
on public.invention_status_events
for select
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
);

create policy invention_status_events_insert_ops_admin
on public.invention_status_events
for insert
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
);

-- screening reports
create policy invention_screening_reports_select_internal
on public.invention_screening_reports
for select
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy invention_screening_reports_mutate_internal
on public.invention_screening_reports
for insert
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy invention_screening_reports_update_internal
on public.invention_screening_reports
for update
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
)
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

-- screening scores
create policy invention_screening_scores_select_internal
on public.invention_screening_scores
for select
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy invention_screening_scores_mutate_internal
on public.invention_screening_scores
for insert
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy invention_screening_scores_update_internal
on public.invention_screening_scores
for update
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
)
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

-- prior art
create policy prior_art_items_select_internal
on public.prior_art_items
for select
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy prior_art_items_mutate_internal
on public.prior_art_items
for insert
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy prior_art_items_update_internal
on public.prior_art_items
for update
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
)
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

-- ip strategy notes
create policy ip_strategy_notes_select_internal
on public.ip_strategy_notes
for select
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy ip_strategy_notes_mutate_internal
on public.ip_strategy_notes
for insert
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy ip_strategy_notes_update_internal
on public.ip_strategy_notes
for update
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
)
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

-- company account/member
create policy company_accounts_select_internal
on public.company_accounts
for select
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy company_accounts_update_ops_admin
on public.company_accounts
for update
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
  and deleted_at is null
)
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy company_members_select_internal
on public.company_members
for select
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy company_members_mutate_ops_admin
on public.company_members
for insert
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy company_members_update_ops_admin
on public.company_members
for update
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
  and deleted_at is null
)
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
  and deleted_at is null
);

-- company disclosure / NDA / views
create policy nda_acceptances_select_internal
on public.nda_acceptances
for select
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy company_disclosure_requests_select_internal
on public.company_disclosure_requests
for select
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy company_disclosure_requests_update_ops_admin
on public.company_disclosure_requests
for update
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
  and deleted_at is null
)
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy company_invention_views_select_internal
on public.company_invention_views
for select
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
);

-- deal pipeline
create policy deal_pipeline_select_internal
on public.deal_pipeline
for select
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy deal_pipeline_update_ops_admin
on public.deal_pipeline
for update
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
  and deleted_at is null
)
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
  and deleted_at is null
);

create policy deal_status_events_select_internal
on public.deal_status_events
for select
using (
  public.has_any_app_role(ARRAY['operator'::app_role,'reviewer'::app_role,'admin'::app_role])
);

create policy deal_status_events_insert_ops_admin
on public.deal_status_events
for insert
with check (
  public.has_any_app_role(ARRAY['operator'::app_role,'admin'::app_role])
);

-- financial / audit
create policy revenue_events_select_admin
on public.revenue_events
for select
using (
  public.has_app_role('admin'::app_role)
);

create policy audit_logs_select_admin
on public.audit_logs
for select
using (
  public.has_app_role('admin'::app_role)
);
