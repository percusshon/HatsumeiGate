-- Migration: 0009_revenue_events
-- Scope:
-- - revenue_events table
-- - indexes for MVP query paths
-- - No RLS policies in this migration (deferred)

create extension if not exists pgcrypto;

create table if not exists public.revenue_events (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deal_pipeline(id) on delete set null,
  invention_id uuid references public.inventions(id) on delete set null,
  company_account_id uuid references public.company_accounts(id) on delete set null,
  event_type text not null,
  amount numeric(12,2),
  currency text not null default 'JPY',
  platform_fee_rate numeric(5,4),
  platform_fee_amount numeric(12,2),
  inventor_amount numeric(12,2),
  occurred_at timestamptz not null,
  created_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint revenue_events_type_ck
    check (event_type in (
      'diagnostic_fee',
      'report_fee',
      'prototype_fee',
      'success_fee',
      'license_royalty',
      'assignment_fee',
      'joint_development_fee',
      'refund',
      'adjustment'
    )),
  constraint revenue_events_currency_ck
    check (char_length(currency) between 3 and 5)
);

comment on table public.revenue_events is 'Amount fields allow negative values for refund/adjustment as needed; event_type-specific numeric constraints are deferred to API/business validation.';

create index if not exists revenue_events_deal_id_idx
  on public.revenue_events(deal_id);
create index if not exists revenue_events_invention_id_idx
  on public.revenue_events(invention_id);
create index if not exists revenue_events_company_account_id_idx
  on public.revenue_events(company_account_id);
create index if not exists revenue_events_event_type_idx
  on public.revenue_events(event_type);
create index if not exists revenue_events_occurred_at_idx
  on public.revenue_events(occurred_at);
create index if not exists revenue_events_deleted_at_idx
  on public.revenue_events(deleted_at);
