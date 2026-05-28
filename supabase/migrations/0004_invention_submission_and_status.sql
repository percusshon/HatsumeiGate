-- Migration: 0004_invention_submission_and_status
-- Scope:
-- - invention_submission_checks
-- - invention_status_events
-- - minimal status history baseline for MVP
-- - No RLS policies in this migration (deferred)

create extension if not exists pgcrypto;

create table if not exists public.invention_submission_checks (
  id uuid primary key default gen_random_uuid(),
  invention_id uuid not null references public.inventions(id) on delete cascade,
  submitted_by uuid references public.users_profile(id) on delete set null,
  is_original_inventor boolean,
  has_co_inventors boolean,
  co_inventor_notes text,
  has_employer_or_client_claim_risk boolean,
  employer_or_client_notes text,
  has_public_disclosure boolean,
  public_disclosure_notes text,
  includes_third_party_material boolean,
  third_party_material_notes text,
  nda_pre_disclosure_summary text,
  confidential_detail_notes text,
  accepted_terms boolean,
  accepted_terms_at timestamptz,
  created_by uuid references public.users_profile(id) on delete set null,
  updated_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger invention_submission_checks_set_updated_at
before update on public.invention_submission_checks
for each row
execute function public.touch_updated_at();

create index if not exists invention_submission_checks_invention_id_idx
  on public.invention_submission_checks(invention_id);
create index if not exists invention_submission_checks_submitted_by_idx
  on public.invention_submission_checks(submitted_by);
create index if not exists invention_submission_checks_deleted_at_idx
  on public.invention_submission_checks(deleted_at);
create index if not exists invention_submission_checks_created_at_idx
  on public.invention_submission_checks(created_at);

create table if not exists public.invention_status_events (
  id uuid primary key default gen_random_uuid(),
  invention_id uuid not null references public.inventions(id) on delete cascade,
  from_status invention_status,
  to_status invention_status not null,
  changed_by uuid references public.users_profile(id) on delete set null,
  reason text,
  internal_note text,
  visible_to_inventor boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists invention_status_events_invention_id_idx
  on public.invention_status_events(invention_id);
create index if not exists invention_status_events_changed_by_idx
  on public.invention_status_events(changed_by);
create index if not exists invention_status_events_created_at_idx
  on public.invention_status_events(created_at);
