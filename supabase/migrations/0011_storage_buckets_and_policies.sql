-- Hatsumei Gate: storage buckets and initial access policy (draft)
-- Scope: only storage bucket registration + minimal safe policies.
-- In-depth disclosure control (NDA checks, role checks, signed-url expiry) is handled
-- in later API/RLS phases.

-- ========================================
-- Buckets (private by default / public-assets only public)
-- ========================================
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'invention-files',
  'invention-files',
  false,
  104857600,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'application/zip',
    'application/x-tar',
    'application/gzip'
  ]::text[]
), (
  'company-disclosure-files',
  'company-disclosure-files',
  false,
  104857600,
  array[
    'image/png',
    'image/jpeg',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4',
    'audio/mpeg'
  ]::text[]
), (
  'legal-documents',
  'legal-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/plain',
    'text/markdown'
  ]::text[]
), (
  'public-assets',
  'public-assets',
  true,
  5242880,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'text/plain',
    'text/css',
    'text/javascript',
    'application/javascript',
    'text/html',
    'application/json'
  ]::text[]
) on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ========================================
-- Policy strategy:
-- - public-assets: publicly listed/used assets can be read by anon/authenticated.
-- - private buckets: no wide open object-select policy is created here.
--   API/service_role will issue signed URLs after NDA/consent + audit logging checks.
-- ========================================

-- Allow read access only for public-assets (website/public files).
create policy storage_public_assets_read
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'public-assets'
);

-- Optional explicit helper comments for next phases:
-- - NDA前の企業アクセスはこのmigrationではstorage側で許可しない。
-- - 会社閲覧APIで company_invention_views 記録後に signed URL を発行する。
-- - signed URL有効期限/閲覧ログ/メタ情報開示範囲はAPI側で拘束する。
-- - metadataへ秘密情報本文そのものを詰めない。
