-- Migration: 0007_nda_and_disclosure
-- Scope:
-- - nda_acceptances table
-- - company_disclosure_requests table
-- - company_invention_views table (append-only log)
-- - indexes and checks for MVP
-- - No RLS policies in this migration (deferred)

create extension if not exists pgcrypto;

create table if not exists public.nda_acceptances (
  id uuid primary key default gen_random_uuid(),
  company_account_id uuid not null references public.company_accounts(id) on delete cascade,
  user_id uuid not null references public.users_profile(id) on delete restrict,
  accepted_by uuid not null references public.users_profile(id) on delete restrict,
  nda_version text not null,
  accepted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references public.users_profile(id) on delete set null,
  revocation_reason text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists nda_acceptances_company_account_id_idx
  on public.nda_acceptances(company_account_id);
create index if not exists nda_acceptances_user_id_idx
  on public.nda_acceptances(user_id);
create index if not exists nda_acceptances_accepted_at_idx
  on public.nda_acceptances(accepted_at);
create index if not exists nda_acceptances_expires_at_idx
  on public.nda_acceptances(expires_at);

create table if not exists public.company_disclosure_requests (
  id uuid primary key default gen_random_uuid(),
  invention_id uuid not null references public.inventions(id) on delete cascade,
  company_account_id uuid not null references public.company_accounts(id) on delete cascade,
  requested_by uuid not null references public.users_profile(id) on delete restrict,
  requested_level disclosure_level not null,
  approved_level disclosure_level,
  status text not null default 'requested',
  inventor_approved boolean not null default false,
  inventor_approved_by uuid references public.users_profile(id) on delete set null,
  inventor_approved_at timestamptz,
  reviewed_by uuid references public.users_profile(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_by uuid references public.users_profile(id) on delete set null,
  updated_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint company_disclosure_requests_status_ck
    check (status in ('requested', 'approved', 'rejected', 'revoked', 'expired'))
);

create trigger company_disclosure_requests_set_updated_at
before update on public.company_disclosure_requests
for each row
execute function public.touch_updated_at();

create index if not exists company_disclosure_requests_invention_id_idx
  on public.company_disclosure_requests(invention_id);
create index if not exists company_disclosure_requests_company_account_id_idx
  on public.company_disclosure_requests(company_account_id);
create index if not exists company_disclosure_requests_status_idx
  on public.company_disclosure_requests(status);
create index if not exists company_disclosure_requests_requested_level_idx
  on public.company_disclosure_requests(requested_level);
create index if not exists company_disclosure_requests_created_at_idx
  on public.company_disclosure_requests(created_at);
create index if not exists company_disclosure_requests_deleted_at_idx
  on public.company_disclosure_requests(deleted_at);

create table if not exists public.company_invention_views (
  id uuid primary key default gen_random_uuid(),
  invention_id uuid not null references public.inventions(id) on delete cascade,
  company_account_id uuid not null references public.company_accounts(id) on delete cascade,
  viewed_by uuid not null references public.users_profile(id) on delete restrict,
  disclosure_request_id uuid references public.company_disclosure_requests(id) on delete set null,
  viewed_level disclosure_level not null,
  view_context text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists company_invention_views_invention_id_idx
  on public.company_invention_views(invention_id);
create index if not exists company_invention_views_company_account_id_idx
  on public.company_invention_views(company_account_id);
create index if not exists company_invention_views_viewed_by_idx
  on public.company_invention_views(viewed_by);
create index if not exists company_invention_views_created_at_idx
  on public.company_invention_views(created_at);
