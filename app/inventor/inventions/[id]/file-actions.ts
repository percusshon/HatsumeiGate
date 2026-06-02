'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { recordAuditLog } from '@/lib/audit/log';
import {
  INVENTION_FILES_BUCKET,
  INVENTION_FILE_VIEW_TTL_SECONDS,
  buildInventionFileStoragePath
} from '@/lib/storage/invention-files';

const MAX_FILE_SIZE_BYTES = 104857600; // bucket 上限と一致（100MB）

// 発明者本人が自案件のファイルをアップロードする。
// storage への書き込みは service_role 経由（private bucket には authenticated の insert ポリシーが無い）。
// 公開範囲は internal_only / level_0 で作成し、企業開示レベルの引き上げは operator が行う。
export async function uploadInventionFileAction(formData: FormData) {
  const inventionId = typeof formData.get('invention_id') === 'string' ? (formData.get('invention_id') as string).trim() : null;
  if (!inventionId) {
    redirect('/inventor?error=invention_id_missing');
  }

  const detailPath = `/inventor/inventions/${inventionId}`;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();

  // 所有確認（RLS により他人の発明は返らない）。
  const { data: invention } = await supabase
    .from('inventions')
    .select('id')
    .eq('id', inventionId)
    .eq('inventor_id', currentUser.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!invention) {
    redirect(`${detailPath}?error=file_forbidden`);
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    redirect(`${detailPath}?error=file_empty`);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    redirect(`${detailPath}?error=file_too_large`);
  }

  const fileUuid = randomUUID();
  const storagePath = buildInventionFileStoragePath(inventionId, fileUuid, file.name);
  const contentType = file.type || 'application/octet-stream';

  const admin = createAdminSupabaseClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(INVENTION_FILES_BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: false });

  if (uploadError) {
    redirect(`${detailPath}?error=file_upload_failed`);
  }

  const { data: inserted, error: insertError } = await admin
    .from('invention_files')
    .insert({
      invention_id: inventionId,
      uploaded_by: currentUser.id,
      storage_bucket: INVENTION_FILES_BUCKET,
      storage_path: storagePath,
      original_filename: file.name.slice(0, 255),
      mime_type: contentType,
      file_size_bytes: file.size,
      file_visibility: 'internal_only',
      disclosure_level_required: 'level_0_internal_only'
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    // メタデータ登録に失敗した場合はアップロード済みオブジェクトを掃除する。
    await admin.storage.from(INVENTION_FILES_BUCKET).remove([storagePath]);
    redirect(`${detailPath}?error=file_record_failed`);
  }

  await recordAuditLog({
    eventType: 'file_uploaded',
    targetTable: 'invention_files',
    targetId: inserted.id,
    actorUserId: currentUser.id,
    actorRole: currentUser.role,
    inventionId,
    metadata: { mime_type: contentType, file_size_bytes: file.size }
  });

  revalidatePath(detailPath);
  redirect(`${detailPath}?success=file_uploaded`);
}

// 発明者本人が自ファイルを短期 signed URL で閲覧する。
export async function viewInventionFileAction(formData: FormData) {
  const inventionId = typeof formData.get('invention_id') === 'string' ? (formData.get('invention_id') as string).trim() : null;
  const fileId = typeof formData.get('file_id') === 'string' ? (formData.get('file_id') as string).trim() : null;
  const detailPath = inventionId ? `/inventor/inventions/${inventionId}` : '/inventor';

  if (!fileId) {
    redirect(`${detailPath}?error=file_not_found`);
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();

  // RLS（invention_files_select_own）で本人の発明のファイルのみ取得できる。
  const { data: fileRow } = await supabase
    .from('invention_files')
    .select('id, invention_id, storage_bucket, storage_path')
    .eq('id', fileId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!fileRow) {
    redirect(`${detailPath}?error=file_not_found`);
  }

  const admin = createAdminSupabaseClient();
  const { data: signed, error: signError } = await admin.storage
    .from(fileRow.storage_bucket)
    .createSignedUrl(fileRow.storage_path, INVENTION_FILE_VIEW_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    redirect(`${detailPath}?error=file_url_failed`);
  }

  await recordAuditLog({
    eventType: 'file_viewed',
    targetTable: 'invention_files',
    targetId: fileRow.id,
    actorUserId: currentUser.id,
    actorRole: currentUser.role,
    inventionId: fileRow.invention_id,
    metadata: { context: 'inventor_self_view' }
  });

  redirect(signed.signedUrl);
}

// 発明者本人によるファイルの論理削除（監査のためオブジェクトは保持）。
export async function deleteInventionFileAction(formData: FormData) {
  const inventionId = typeof formData.get('invention_id') === 'string' ? (formData.get('invention_id') as string).trim() : null;
  const fileId = typeof formData.get('file_id') === 'string' ? (formData.get('file_id') as string).trim() : null;
  const detailPath = inventionId ? `/inventor/inventions/${inventionId}` : '/inventor';

  if (!fileId) {
    redirect(`${detailPath}?error=file_not_found`);
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();
  const { data: fileRow } = await supabase
    .from('invention_files')
    .select('id, invention_id')
    .eq('id', fileId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!fileRow) {
    redirect(`${detailPath}?error=file_not_found`);
  }

  const admin = createAdminSupabaseClient();
  const { error: deleteError } = await admin
    .from('invention_files')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', fileId)
    .is('deleted_at', null);

  if (deleteError) {
    redirect(`${detailPath}?error=file_delete_failed`);
  }

  await recordAuditLog({
    eventType: 'admin_action',
    targetTable: 'invention_files',
    targetId: fileRow.id,
    actorUserId: currentUser.id,
    actorRole: currentUser.role,
    inventionId: fileRow.invention_id,
    metadata: { action: 'file_deleted', by: 'inventor' }
  });

  revalidatePath(detailPath);
  redirect(`${detailPath}?success=file_deleted`);
}
