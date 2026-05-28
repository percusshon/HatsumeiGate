-- Migration: 0008_deal_pipeline
-- Scope:
-- - deal_pipeline table
-- - deal_status_events table
-- - indexes for MVP query paths
-- - No RLS policies in this migration (deferred)

create extension if not exists pgcrypto;

create table if not exists public.deal_pipeline (
  id uuid primary key default gen_random_uuid(),
  invention_id uuid not null references public.inventions(id) on delete cascade,
  company_account_id uuid not null references public.company_accounts(id) on delete cascade,
  disclosure_request_id uuid references public.company_disclosure_requests(id) on delete set null,
  deal_type deal_type not null,
  status deal_status not null default 'no_interest',
  proposed_terms_summary text,
  internal_note text,
  created_by uuid references public.users_profile(id) on delete set null,
  updated_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger deal_pipeline_set_updated_at
before update on public.deal_pipeline
for each row
execute function public.touch_updated_at();

create table if not exists public.deal_status_events (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deal_pipeline(id) on delete cascade,
  from_status deal_status,
  to_status deal_status not null,
  changed_by uuid references public.users_profile(id) on delete set null,
  reason text,
  internal_note text,
  visible_to_inventor boolean not null default false,
  visible_to_company boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists deal_pipeline_invention_id_idx
  on public.deal_pipeline(invention_id);
create index if not exists deal_pipeline_company_account_id_idx
  on public.deal_pipeline(company_account_id);
create index if not exists deal_pipeline_disclosure_request_id_idx
  on public.deal_pipeline(disclosure_request_id);
create index if not exists deal_pipeline_status_idx
  on public.deal_pipeline(status);
create index if not exists deal_pipeline_deal_type_idx
  on public.deal_pipeline(deal_type);
create index if not exists deal_pipeline_deleted_at_idx
  on public.deal_pipeline(deleted_at);

create index if not exists deal_status_events_deal_id_idx
  on public.deal_status_events(deal_id);
create index if not exists deal_status_events_changed_by_idx
  on public.deal_status_events(changed_by);
create index if not exists deal_status_events_created_at_idx
  on public.deal_status_events(created_at);
