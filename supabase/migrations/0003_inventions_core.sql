-- Migration: 0003_inventions_core
-- Scope:
-- - inventions core table
-- - invention_files core table
-- - indexes for initial query performance
-- - RLS is intentionally not enabled here.

create extension if not exists pgcrypto;

create table if not exists public.inventions (
  id uuid primary key default gen_random_uuid(),
  inventor_id uuid not null references public.users_profile(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  title text not null,
  problem_summary text,
  solution_summary text,
  target_users text,
  use_case text,
  similar_products text,
  prototype_status text,
  desired_outcome text,
  status invention_status not null default 'draft',
  visibility_level invention_visibility_level not null default 'internal',
  current_disclosure_level disclosure_level not null default 'level_0_internal_only',
  created_by uuid not null references public.users_profile(id) on delete restrict,
  updated_by uuid references public.users_profile(id) on delete set null,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger inventions_set_updated_at
before update on public.inventions
for each row
execute function public.touch_updated_at();

create index if not exists inventions_inventor_id_idx on public.inventions(inventor_id);
create index if not exists inventions_status_idx on public.inventions(status);
create index if not exists inventions_deleted_at_idx on public.inventions(deleted_at);
create index if not exists inventions_created_at_idx on public.inventions(created_at);

create table if not exists public.invention_files (
  id uuid primary key default gen_random_uuid(),
  invention_id uuid not null references public.inventions(id) on delete cascade,
  uploaded_by uuid not null references public.users_profile(id) on delete restrict,
  storage_bucket text not null,
  storage_path text not null,
  original_filename text not null,
  mime_type text,
  file_size_bytes bigint,
  file_visibility file_visibility not null default 'internal_only',
  disclosure_level_required disclosure_level not null default 'level_0_internal_only',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint invention_files_unique_path unique (storage_bucket, storage_path)
);

create trigger invention_files_set_updated_at
before update on public.invention_files
for each row
execute function public.touch_updated_at();

create index if not exists invention_files_invention_id_idx on public.invention_files(invention_id);
create index if not exists invention_files_uploaded_by_idx on public.invention_files(uploaded_by);
create index if not exists invention_files_deleted_at_idx on public.invention_files(deleted_at);
create index if not exists invention_files_created_at_idx on public.invention_files(created_at);
