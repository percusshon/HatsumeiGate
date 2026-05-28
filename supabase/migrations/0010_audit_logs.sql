-- Migration: 0010_audit_logs
-- Scope:
-- - audit_logs table (append-only event records)
-- - baseline indexes
-- - No RLS policies and no write trigger/functions in this migration (deferred)

create extension if not exists pgcrypto;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users_profile(id) on delete set null,
  actor_role app_role,
  event_type audit_event_type not null,
  target_table text not null,
  target_id uuid,
  invention_id uuid references public.inventions(id) on delete set null,
  company_account_id uuid references public.company_accounts(id) on delete set null,
  deal_id uuid references public.deal_pipeline(id) on delete set null,
  disclosure_request_id uuid references public.company_disclosure_requests(id) on delete set null,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on column public.audit_logs.metadata is 'Keep sensitive textual content out of metadata; store only structured event context to reduce exposure risk.';

create index if not exists audit_logs_actor_user_id_idx
  on public.audit_logs(actor_user_id);
create index if not exists audit_logs_event_type_idx
  on public.audit_logs(event_type);
create index if not exists audit_logs_target_table_target_id_idx
  on public.audit_logs(target_table, target_id);
create index if not exists audit_logs_invention_id_idx
  on public.audit_logs(invention_id);
create index if not exists audit_logs_company_account_id_idx
  on public.audit_logs(company_account_id);
create index if not exists audit_logs_deal_id_idx
  on public.audit_logs(deal_id);
create index if not exists audit_logs_disclosure_request_id_idx
  on public.audit_logs(disclosure_request_id);
create index if not exists audit_logs_created_at_idx
  on public.audit_logs(created_at);
