-- Migration: 0005_screening_and_ip_strategy
-- Scope:
-- - invention_screening_reports
-- - invention_screening_scores
-- - prior_art_items
-- - ip_strategy_notes
-- - No RLS policies in this migration (deferred)

create extension if not exists pgcrypto;

create table if not exists public.invention_screening_reports (
  id uuid primary key default gen_random_uuid(),
  invention_id uuid not null references public.inventions(id) on delete cascade,
  reviewer_id uuid references public.users_profile(id) on delete set null,
  overall_rating screening_overall_rating,
  summary text,
  recommendation text,
  next_action text,
  created_by uuid references public.users_profile(id) on delete set null,
  updated_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger invention_screening_reports_set_updated_at
before update on public.invention_screening_reports
for each row
execute function public.touch_updated_at();

create index if not exists invention_screening_reports_invention_id_idx
  on public.invention_screening_reports(invention_id);
create index if not exists invention_screening_reports_reviewer_id_idx
  on public.invention_screening_reports(reviewer_id);
create index if not exists invention_screening_reports_deleted_at_idx
  on public.invention_screening_reports(deleted_at);
create index if not exists invention_screening_reports_created_at_idx
  on public.invention_screening_reports(created_at);

create table if not exists public.invention_screening_scores (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.invention_screening_reports(id) on delete cascade,
  axis screening_axis not null,
  score integer not null,
  rationale text,
  created_by uuid references public.users_profile(id) on delete set null,
  updated_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint invention_screening_scores_range_ck
    check (score >= 0 and score <= 5)
);

create trigger invention_screening_scores_set_updated_at
before update on public.invention_screening_scores
for each row
execute function public.touch_updated_at();

create index if not exists invention_screening_scores_report_id_idx
  on public.invention_screening_scores(report_id);
create index if not exists invention_screening_scores_axis_idx
  on public.invention_screening_scores(axis);
create index if not exists invention_screening_scores_deleted_at_idx
  on public.invention_screening_scores(deleted_at);
create index if not exists invention_screening_scores_created_at_idx
  on public.invention_screening_scores(created_at);

create unique index if not exists invention_screening_scores_active_unique_idx
  on public.invention_screening_scores(report_id, axis)
  where deleted_at is null;

create table if not exists public.prior_art_items (
  id uuid primary key default gen_random_uuid(),
  invention_id uuid not null references public.inventions(id) on delete cascade,
  title text,
  source_url text,
  source_type text,
  publication_identifier text,
  summary text,
  relevance_note text,
  risk_level text,
  created_by uuid references public.users_profile(id) on delete set null,
  updated_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger prior_art_items_set_updated_at
before update on public.prior_art_items
for each row
execute function public.touch_updated_at();

create index if not exists prior_art_items_invention_id_idx
  on public.prior_art_items(invention_id);
create index if not exists prior_art_items_created_by_idx
  on public.prior_art_items(created_by);
create index if not exists prior_art_items_deleted_at_idx
  on public.prior_art_items(deleted_at);
create index if not exists prior_art_items_created_at_idx
  on public.prior_art_items(created_at);

create table if not exists public.ip_strategy_notes (
  id uuid primary key default gen_random_uuid(),
  invention_id uuid not null references public.inventions(id) on delete cascade,
  strategy_type ip_strategy_type not null,
  note text,
  requires_attorney_review boolean not null default false,
  created_by uuid references public.users_profile(id) on delete set null,
  updated_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger ip_strategy_notes_set_updated_at
before update on public.ip_strategy_notes
for each row
execute function public.touch_updated_at();

create index if not exists ip_strategy_notes_invention_id_idx
  on public.ip_strategy_notes(invention_id);
create index if not exists ip_strategy_notes_strategy_type_idx
  on public.ip_strategy_notes(strategy_type);
create index if not exists ip_strategy_notes_created_by_idx
  on public.ip_strategy_notes(created_by);
create index if not exists ip_strategy_notes_deleted_at_idx
  on public.ip_strategy_notes(deleted_at);
create index if not exists ip_strategy_notes_created_at_idx
  on public.ip_strategy_notes(created_at);
