-- Migration: 0006_company_accounts_and_members
-- Scope:
-- - company_accounts table
-- - company_members table
-- - basic indexes and constraints for MVP usage
-- - No RLS policies in this migration (deferred)

create extension if not exists pgcrypto;

create table if not exists public.company_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  company_name text not null,
  legal_name text,
  website_url text,
  industry text,
  country text,
  review_status text not null default 'pending',
  reviewed_by uuid references public.users_profile(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_by uuid references public.users_profile(id) on delete set null,
  updated_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint company_accounts_review_status_ck
    check (review_status in ('pending', 'approved', 'rejected', 'suspended'))
);

create trigger company_accounts_set_updated_at
before update on public.company_accounts
for each row
execute function public.touch_updated_at();

create index if not exists company_accounts_organization_id_idx
  on public.company_accounts(organization_id);
create index if not exists company_accounts_review_status_idx
  on public.company_accounts(review_status);
create index if not exists company_accounts_deleted_at_idx
  on public.company_accounts(deleted_at);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_account_id uuid not null references public.company_accounts(id) on delete cascade,
  user_id uuid not null references public.users_profile(id) on delete cascade,
  role app_role not null,
  created_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint company_members_role_ck
    check (role in ('company_user', 'company_admin', 'company_legal_reviewer'))
);

create unique index if not exists company_members_active_unique_idx
  on public.company_members(company_account_id, user_id)
  where deleted_at is null;

create index if not exists company_members_company_account_id_idx
  on public.company_members(company_account_id);
create index if not exists company_members_user_id_idx
  on public.company_members(user_id);
create index if not exists company_members_role_idx
  on public.company_members(role);
create index if not exists company_members_deleted_at_idx
  on public.company_members(deleted_at);
