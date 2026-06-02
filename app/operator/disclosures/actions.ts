'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import {
  disclosureLevelRank,
  disclosureRequiresNda,
  isDisclosureLevel,
  isDisclosureReviewDecision
} from '@/lib/company/disclosure';
import { recordAuditLog } from '@/lib/audit/log';
import { createNotification } from '@/lib/notifications/notify';

const DISCLOSURE_DECISION_TITLES: Record<string, string> = {
  approved: '開示申請が承認されました',
  rejected: '開示申請が却下されました',
  revoked: '開示申請が取り消されました'
};

// company_disclosure_requests の審査更新は operator/admin のみ（migration 0014）。
const OPERATOR_ROLES = ['operator', 'admin'];

export async function reviewDisclosureRequestAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const requestId = readValue('request_id');
  if (!requestId) {
    redirect('/operator/disclosures?error=request_id_missing');
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  if (!currentUser.roles.some((role) => OPERATOR_ROLES.includes(role))) {
    redirect('/operator/disclosures?error=forbidden');
  }

  const decision = readValue('decision');
  if (!decision || !isDisclosureReviewDecision(decision)) {
    redirect('/operator/disclosures?error=invalid_decision');
  }

  const approvedLevelRaw = readValue('approved_level');
  const reviewNote = readValue('review_note');

  const supabase = createServerSupabaseClient();

  const { data: request, error: fetchError } = await supabase
    .from('company_disclosure_requests')
    .select('id, company_account_id, invention_id, requested_by, requested_level, approved_level, inventor_approved, status')
    .eq('id', requestId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError || !request) {
    redirect('/operator/disclosures?error=not_found');
  }

  const baseUpdate = {
    status: decision,
    reviewed_by: currentUser.id,
    reviewed_at: new Date().toISOString(),
    review_note: reviewNote || null,
    updated_by: currentUser.id
  };

  let updatePayload: Record<string, unknown> = baseUpdate;

  if (decision === 'approved') {
    // 承認レベルは申請レベル以下に限定（過剰開示の禁止）。
    const approvedLevel = approvedLevelRaw || (request.requested_level as string);
    if (!isDisclosureLevel(approvedLevel)) {
      redirect('/operator/disclosures?error=invalid_level');
    }
    if (disclosureLevelRank(approvedLevel) > disclosureLevelRank(request.requested_level as string)) {
      redirect('/operator/disclosures?error=level_exceeds_request');
    }

    // 発明者同意なしに開示承認しない。
    if (!request.inventor_approved) {
      redirect('/operator/disclosures?error=inventor_not_approved');
    }

    // level_2 以上は有効な NDA が必須。
    if (disclosureRequiresNda(approvedLevel)) {
      const nowIso = new Date().toISOString();
      const { data: ndaRows } = await supabase
        .from('nda_acceptances')
        .select('id, expires_at')
        .eq('company_account_id', request.company_account_id)
        .is('revoked_at', null)
        .is('deleted_at', null)
        .not('accepted_at', 'is', null);

      const hasActiveNda = (ndaRows ?? []).some(
        (row) => !row.expires_at || row.expires_at > nowIso
      );

      if (!hasActiveNda) {
        redirect('/operator/disclosures?error=nda_required');
      }
    }

    updatePayload = { ...baseUpdate, approved_level: approvedLevel };
  } else {
    // 却下 / 取消では承認レベルをクリアする。
    updatePayload = { ...baseUpdate, approved_level: null };
  }

  const { data: updated, error: updateError } = await supabase
    .from('company_disclosure_requests')
    .update(updatePayload)
    .eq('id', requestId)
    .is('deleted_at', null)
    .select('id')
    .single();

  if (updateError || !updated) {
    redirect('/operator/disclosures?error=update_failed');
  }

  await recordAuditLog({
    eventType: 'admin_action',
    targetTable: 'company_disclosure_requests',
    targetId: requestId,
    actorUserId: currentUser.id,
    actorRole: currentUser.role,
    inventionId: request.invention_id,
    companyAccountId: request.company_account_id,
    disclosureRequestId: requestId,
    metadata: {
      action: 'disclosure_review',
      decision,
      approved_level: (updatePayload as { approved_level?: string | null }).approved_level ?? null
    }
  });

  // 申請した企業ユーザーへ通知（審査結果）。
  if (request.requested_by) {
    await createNotification({
      recipientUserId: request.requested_by,
      type: 'disclosure_reviewed',
      title: DISCLOSURE_DECISION_TITLES[decision] ?? '開示申請の審査結果が更新されました',
      body: 'Company Portal で詳細を確認してください。',
      inventionId: request.invention_id,
      companyAccountId: request.company_account_id,
      disclosureRequestId: requestId,
      linkPath: '/company'
    });
  }

  revalidatePath('/operator/disclosures');
  redirect('/operator/disclosures?success=reviewed');
}
