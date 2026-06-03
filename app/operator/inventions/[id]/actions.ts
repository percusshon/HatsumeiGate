'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { isOperatorTransitionAllowed, isTeaserPublishableStatus } from '@/lib/invention/status';
import { recordAuditLog } from '@/lib/audit/log';
import { isDisclosureLevel, type DisclosureLevel } from '@/lib/company/disclosure';
import {
  INVENTION_FILE_VIEW_TTL_SECONDS,
  fileVisibilityForLevel
} from '@/lib/storage/invention-files';
import { createNotification } from '@/lib/notifications/notify';

const OPERATOR_ROLES = ['operator', 'admin'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function updateInventionStatusAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const inventionId = readValue('invention_id');
  if (!inventionId) {
    redirect('/operator/inventions?error=invention_id_missing');
  }

  const detailPath = `/operator/inventions/${inventionId}`;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  // RLS でも operator/admin に限定されるが、UX のため事前ガードする。
  const isOperator = currentUser.roles.some((role) => OPERATOR_ROLES.includes(role));
  if (!isOperator) {
    redirect(`${detailPath}?error=forbidden`);
  }

  const toStatus = readValue('to_status');
  const reason = readValue('reason');
  const visibleToInventor = formData.get('visible_to_inventor') === 'on';

  if (!toStatus) {
    redirect(`${detailPath}?error=status_required`);
  }

  const supabase = createServerSupabaseClient();

  const { data: invention, error: fetchError } = await supabase
    .from('inventions')
    .select('id, status')
    .eq('id', inventionId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError || !invention) {
    redirect(`${detailPath}?error=not_found`);
  }

  const fromStatus = invention.status as string;

  if (fromStatus === toStatus) {
    redirect(`${detailPath}?error=same_status`);
  }

  if (!isOperatorTransitionAllowed(fromStatus, toStatus)) {
    redirect(`${detailPath}?error=invalid_transition`);
  }

  const { data: updated, error: updateError } = await supabase
    .from('inventions')
    .update({
      status: toStatus,
      updated_by: currentUser.id
    })
    .eq('id', inventionId)
    .eq('status', fromStatus)
    .is('deleted_at', null)
    .select('id')
    .single();

  if (updateError || !updated) {
    redirect(`${detailPath}?error=update_failed`);
  }

  const { error: eventError } = await supabase.from('invention_status_events').insert({
    invention_id: inventionId,
    from_status: fromStatus,
    to_status: toStatus,
    changed_by: currentUser.id,
    reason: reason || null,
    visible_to_inventor: visibleToInventor
  });

  if (eventError) {
    redirect(`${detailPath}?error=status_event_failed`);
  }

  await recordAuditLog({
    eventType: 'invention_status_changed',
    targetTable: 'inventions',
    targetId: inventionId,
    actorUserId: currentUser.id,
    actorRole: currentUser.role,
    inventionId,
    metadata: { from_status: fromStatus, to_status: toStatus, visible_to_inventor: visibleToInventor }
  });

  // 発明者可視の更新のみ通知する（内部フェーズは通知しない）。
  if (visibleToInventor) {
    const admin = createAdminSupabaseClient();
    const { data: owner } = await admin
      .from('inventions')
      .select('inventor_id')
      .eq('id', inventionId)
      .maybeSingle();
    if (owner?.inventor_id) {
      await createNotification({
        recipientUserId: owner.inventor_id,
        type: 'invention_status_changed',
        title: '発明の審査状況が更新されました',
        body: '進捗の詳細はダッシュボードでご確認ください。',
        inventionId,
        linkPath: `/inventor/inventions/${inventionId}`
      });
    }
  }

  revalidatePath(detailPath);
  redirect(`${detailPath}?success=status_updated`);
}

// 企業向けティザー公開トグル。
// 内部審査が完了（attorney_review_ready）した発明に限り、current_disclosure_level を
// level_1_company_teaser / level_0_internal_only に切り替える。状態機械（status）は変更しない。
// level_1 はティザー一覧で開示されるが、本文・図面・ファイルは別経路（要承認/NDA）でのみ提供。
export async function setInventionTeaserAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const inventionId = readValue('invention_id');
  if (!inventionId) {
    redirect('/operator/inventions?error=invention_id_missing');
  }

  const detailPath = `/operator/inventions/${inventionId}`;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const isOperator = currentUser.roles.some((role) => OPERATOR_ROLES.includes(role));
  if (!isOperator) {
    redirect(`${detailPath}?error=forbidden`);
  }

  const publish = readValue('publish') === 'true';
  const nextLevel = publish ? 'level_1_company_teaser' : 'level_0_internal_only';
  const nextVisibility = publish ? 'teaser' : 'internal';

  const supabase = createServerSupabaseClient();

  const { data: invention, error: fetchError } = await supabase
    .from('inventions')
    .select('id, status')
    .eq('id', inventionId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError || !invention) {
    redirect(`${detailPath}?error=not_found`);
  }

  // 内部審査完了〜企業開示準備フェーズに限りティザー公開を許可する。
  if (!isTeaserPublishableStatus(invention.status)) {
    redirect(`${detailPath}?error=teaser_status_invalid`);
  }

  const { data: updated, error: updateError } = await supabase
    .from('inventions')
    .update({
      current_disclosure_level: nextLevel,
      visibility_level: nextVisibility,
      updated_by: currentUser.id
    })
    .eq('id', inventionId)
    .is('deleted_at', null)
    .select('id')
    .single();

  if (updateError || !updated) {
    redirect(`${detailPath}?error=teaser_update_failed`);
  }

  await recordAuditLog({
    eventType: 'invention_update',
    targetTable: 'inventions',
    targetId: inventionId,
    actorUserId: currentUser.id,
    actorRole: currentUser.role,
    inventionId,
    metadata: { action: publish ? 'teaser_published' : 'teaser_unpublished', disclosure_level: nextLevel }
  });

  revalidatePath(detailPath);
  revalidatePath('/company/discovery');
  redirect(`${detailPath}?success=${publish ? 'teaser_published' : 'teaser_unpublished'}`);
}

// operator がファイルの企業開示レベルを設定する。
// disclosure_level_required と file_visibility を単一値から整合的に導出して設定する。
// invention_files への書き込みは service_role 経由（operator は select のみの RLS）。
export async function setInventionFileDisclosureAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const inventionId = readValue('invention_id');
  if (!inventionId) {
    redirect('/operator/inventions?error=invention_id_missing');
  }
  const detailPath = `/operator/inventions/${inventionId}`;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }
  if (!currentUser.roles.some((role) => OPERATOR_ROLES.includes(role))) {
    redirect(`${detailPath}?error=forbidden`);
  }

  const fileId = readValue('file_id');
  if (!fileId) {
    redirect(`${detailPath}?error=file_not_found`);
  }

  const level = readValue('disclosure_level');
  if (!level || !isDisclosureLevel(level)) {
    redirect(`${detailPath}?error=file_level_invalid`);
  }

  const admin = createAdminSupabaseClient();

  // 対象ファイルが当該発明に属することを確認（取り違え防止）。
  const { data: fileRow } = await admin
    .from('invention_files')
    .select('id, invention_id')
    .eq('id', fileId)
    .eq('invention_id', inventionId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!fileRow) {
    redirect(`${detailPath}?error=file_not_found`);
  }

  const { error: updateError } = await admin
    .from('invention_files')
    .update({
      disclosure_level_required: level,
      file_visibility: fileVisibilityForLevel(level as DisclosureLevel)
    })
    .eq('id', fileId)
    .is('deleted_at', null);

  if (updateError) {
    redirect(`${detailPath}?error=file_level_update_failed`);
  }

  await recordAuditLog({
    eventType: 'admin_action',
    targetTable: 'invention_files',
    targetId: fileId,
    actorUserId: currentUser.id,
    actorRole: currentUser.role,
    inventionId,
    metadata: { action: 'file_disclosure_set', disclosure_level_required: level }
  });

  revalidatePath(detailPath);
  redirect(`${detailPath}?success=file_level_updated`);
}

// operator が審査目的でファイルを短期 signed URL で閲覧する。
export async function viewInventionFileAsOperatorAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const inventionId = readValue('invention_id');
  const fileId = readValue('file_id');
  const detailPath = inventionId ? `/operator/inventions/${inventionId}` : '/operator/inventions';

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }
  if (!currentUser.roles.some((role) => OPERATOR_ROLES.includes(role))) {
    redirect(`${detailPath}?error=forbidden`);
  }
  if (!fileId) {
    redirect(`${detailPath}?error=file_not_found`);
  }

  const admin = createAdminSupabaseClient();
  const { data: fileRow } = await admin
    .from('invention_files')
    .select('id, invention_id, storage_bucket, storage_path')
    .eq('id', fileId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!fileRow) {
    redirect(`${detailPath}?error=file_not_found`);
  }

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
    metadata: { context: 'operator_review_view' }
  });

  redirect(signed.signedUrl);
}

// 弁理士パートナーの割当（operator/admin、migration 0027 の insert RLS）。
export async function assignPartnerAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const inventionId = readValue('invention_id');
  if (!inventionId) {
    redirect('/operator/inventions?error=invention_id_missing');
  }
  const detailPath = `/operator/inventions/${inventionId}`;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }
  if (!currentUser.roles.some((role) => OPERATOR_ROLES.includes(role))) {
    redirect(`${detailPath}?error=forbidden`);
  }

  const partnerUserId = readValue('partner_user_id');
  if (!partnerUserId || !UUID_RE.test(partnerUserId)) {
    redirect(`${detailPath}?error=partner_user_invalid`);
  }

  const supabase = createServerSupabaseClient();

  // 既存のアクティブ割当があれば重複させない。
  const { data: existing } = await supabase
    .from('partner_invention_assignments')
    .select('id')
    .eq('invention_id', inventionId)
    .eq('partner_user_id', partnerUserId)
    .is('revoked_at', null)
    .maybeSingle();
  if (existing) {
    redirect(`${detailPath}?error=partner_exists`);
  }

  const { error } = await supabase.from('partner_invention_assignments').insert({
    invention_id: inventionId,
    partner_user_id: partnerUserId,
    assigned_by: currentUser.id,
    assignment_note: readValue('assignment_note')
  });

  if (error) {
    redirect(`${detailPath}?error=partner_assign_failed`);
  }

  await recordAuditLog({
    eventType: 'admin_action',
    targetTable: 'partner_invention_assignments',
    actorUserId: currentUser.id,
    actorRole: currentUser.role,
    inventionId,
    metadata: { action: 'partner_assigned' }
  });

  revalidatePath(detailPath);
  redirect(`${detailPath}?success=partner_assigned`);
}

// 弁理士パートナー割当の取消（operator/admin、migration 0027 の update RLS）。
export async function revokePartnerAssignmentAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const inventionId = readValue('invention_id');
  const assignmentId = readValue('assignment_id');
  const detailPath = inventionId ? `/operator/inventions/${inventionId}` : '/operator/inventions';

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }
  if (!currentUser.roles.some((role) => OPERATOR_ROLES.includes(role))) {
    redirect(`${detailPath}?error=forbidden`);
  }
  if (!assignmentId) {
    redirect(`${detailPath}?error=partner_assignment_invalid`);
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('partner_invention_assignments')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: currentUser.id,
      revocation_reason: readValue('revocation_reason')
    })
    .eq('id', assignmentId)
    .is('revoked_at', null);

  if (error) {
    redirect(`${detailPath}?error=partner_revoke_failed`);
  }

  await recordAuditLog({
    eventType: 'admin_action',
    targetTable: 'partner_invention_assignments',
    targetId: assignmentId,
    actorUserId: currentUser.id,
    actorRole: currentUser.role,
    inventionId: inventionId ?? null,
    metadata: { action: 'partner_assignment_revoked' }
  });

  revalidatePath(detailPath);
  redirect(`${detailPath}?success=partner_revoked`);
}
