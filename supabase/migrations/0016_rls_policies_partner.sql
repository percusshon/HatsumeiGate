-- Hatsumei Gate: patent_attorney_partner RLS policies (assignment-based read scope)
-- Scope: patent_attorney_partner
-- Not included: inventor/operator/admin/company/partner assignment management policies.
-- Security posture:
-- - Partner can only read records for assignments explicitly made to them.
-- - Read-only access by default; operational write paths remain API/operator-admin controlled.
-- - No direct access for audit_logs/revenue_events/deal_pipeline in this migration.

-- Partner assignment table (minimal and append-only-like usage)
create table if not exists public.partner_invention_assignments (
  id uuid primary key default gen_random_uuid(),
  invention_id uuid not null references public.inventions(id) on delete cascade,
  partner_user_id uuid not null references public.users_profile(id) on delete cascade,
  assigned_by uuid references public.users_profile(id) on delete set null,
  assignment_note text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.users_profile(id) on delete set null,
  revocation_reason text
);

create unique index if not exists partner_invention_assignments_active_idx
on public.partner_invention_assignments (invention_id, partner_user_id)
where revoked_at is null;

create index if not exists partner_invention_assignments_partner_user_idx
on public.partner_invention_assignments (partner_user_id)
where revoked_at is null;

create index if not exists partner_invention_assignments_invention_idx
on public.partner_invention_assignments (invention_id)
where revoked_at is null;

alter table public.partner_invention_assignments enable row level security;

-- check if auth user is currently assigned as partner for the invention
create or replace function public.is_partner_assigned_to_invention(_invention_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_invention_assignments pia
    where pia.invention_id = _invention_id
      and pia.partner_user_id = auth.uid()
      and pia.revoked_at is null
      and public.has_app_role('patent_attorney_partner'::app_role)
  );
$$;

-- partner assignment metadata
create policy partner_assignments_select_self
on public.partner_invention_assignments
for select
using (
  partner_user_id = auth.uid()
  and revoked_at is null
  and public.has_app_role('patent_attorney_partner'::app_role)
);

-- invention read: only assigned invention records.
create policy inventions_select_partner_assigned
on public.inventions
for select
using (
  public.has_app_role('patent_attorney_partner'::app_role)
  and public.is_partner_assigned_to_invention(id)
  and deleted_at is null
);

-- invention metadata read only for assigned inventions.
create policy invention_files_select_partner_assigned
on public.invention_files
for select
using (
  public.has_app_role('patent_attorney_partner'::app_role)
  and public.is_partner_assigned_to_invention(invention_id)
  and deleted_at is null
);

-- submission check read only for assigned inventions.
create policy invention_submission_checks_select_partner_assigned
on public.invention_submission_checks
for select
using (
  public.has_app_role('patent_attorney_partner'::app_role)
  and public.is_partner_assigned_to_invention(invention_id)
  and deleted_at is null
);

-- screening report read only for assigned inventions.
create policy invention_screening_reports_select_partner_assigned
on public.invention_screening_reports
for select
using (
  public.has_app_role('patent_attorney_partner'::app_role)
  and public.is_partner_assigned_to_invention(invention_id)
  and deleted_at is null
);

-- screening score read only for assigned inventions.
create policy invention_screening_scores_select_partner_assigned
on public.invention_screening_scores
for select
using (
  public.has_app_role('patent_attorney_partner'::app_role)
  and exists (
    select 1
    from public.invention_screening_reports isr
    where isr.id = report_id
      and public.is_partner_assigned_to_invention(isr.invention_id)
  )
  and deleted_at is null
);

-- prior art read only for assigned inventions.
create policy prior_art_items_select_partner_assigned
on public.prior_art_items
for select
using (
  public.has_app_role('patent_attorney_partner'::app_role)
  and public.is_partner_assigned_to_invention(invention_id)
  and deleted_at is null
);

-- ip strategy notes read only for assigned inventions.
create policy ip_strategy_notes_select_partner_assigned
on public.ip_strategy_notes
for select
using (
  public.has_app_role('patent_attorney_partner'::app_role)
  and public.is_partner_assigned_to_invention(invention_id)
  and deleted_at is null
);

-- Explicitly no write policy is added for partner in MVP.
-- API/service_role are responsible for insert/update flows if needed.
