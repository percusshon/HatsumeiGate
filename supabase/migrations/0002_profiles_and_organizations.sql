-- Migration: 0002_profiles_and_organizations
-- Scope:
-- - users_profile, organizations, organization_members
-- - updated_at auto-update helper
-- - No RLS here (RLS will be enabled in later migrations)

create extension if not exists pgcrypto;

-- Timestamp helper for updated_at
create or replace function public.touch_updated_at()
returns trigger as
$$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null default 'inventor',
  display_name text not null,
  email text not null,
  preferred_language text not null default 'ja',
  timezone text not null default 'Asia/Tokyo',
  created_by uuid references public.users_profile(id) on delete set null,
  updated_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger users_profile_set_updated_at
before update on public.users_profile
for each row
execute function public.touch_updated_at();

create index if not exists users_profile_email_idx on public.users_profile(email);
create index if not exists users_profile_role_idx on public.users_profile(role);
create index if not exists users_profile_deleted_at_idx on public.users_profile(deleted_at);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  organization_type organization_type not null default 'internal',
  name text not null,
  legal_name text,
  website_url text,
  country text,
  created_by uuid references public.users_profile(id) on delete set null,
  updated_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger organizations_set_updated_at
before update on public.organizations
for each row
execute function public.touch_updated_at();

create index if not exists organizations_name_idx on public.organizations(name);
create index if not exists organizations_type_idx on public.organizations(organization_type);
create index if not exists organizations_deleted_at_idx on public.organizations(deleted_at);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users_profile(id) on delete cascade,
  role organization_member_role not null default 'member',
  created_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
  -- allow one active membership per user/organization (soft-delete aware)
);

create unique index if not exists organization_members_active_unique_idx
  on public.organization_members(organization_id, user_id)
  where deleted_at is null;

comment on index organization_members_active_unique_idx is 'MVP: enforce one active membership per organization and user while allowing rejoin after soft delete.';

create index if not exists organization_members_org_idx on public.organization_members(organization_id);
create index if not exists organization_members_user_idx on public.organization_members(user_id);
create index if not exists organization_members_deleted_at_idx on public.organization_members(deleted_at);
