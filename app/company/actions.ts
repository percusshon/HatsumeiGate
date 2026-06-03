'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { isDisclosureLevel } from '@/lib/company/disclosure';
import { isCompanyDealTransitionAllowed } from '@/lib/deal/status';
import { recordAuditLog } from '@/lib/audit/log';
import { createNotification } from '@/lib/notifications/notify';

// NDA同意・開示申請の作成は企業メンバーのみ（migration 0015 の insert_by_member に準拠）。
const COMPANY_ROLES = ['company_user', 'company_admin', 'company_legal_reviewer'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function acceptNdaAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const companyAccountId = readValue('company_account_id');
  if (!companyAccountId) {
    redirect('/company?error=company_id_missing');
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  if (!currentUser.roles.some((role) => COMPANY_ROLES.includes(role))) {
    redirect('/company?error=forbidden');
  }

  const ndaVersion = readValue('nda_version');
  if (!ndaVersion) {
    redirect('/company?error=nda_version_required');
  }

  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from('nda_acceptances').insert({
    company_account_id: companyAccountId,
    user_id: currentUser.id,
    accepted_by: currentUser.id,
    nda_version: ndaVersion
  });

  if (error) {
    redirect('/company?error=nda_failed');
  }

  await recordAuditLog({
    eventType: 'nda_accepted',
    targetTable: 'nda_acceptances',
    actorUserId: currentUser.id,
    actorRole: currentUser.role,
    companyAccountId,
    metadata: { nda_version: ndaVersion }
  });

  revalidatePath('/company');
  redirect('/company?success=nda_accepted');
}

export async function createDisclosureRequestAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const companyAccountId = readValue('company_account_id');
  if (!companyAccountId) {
    redirect('/company?error=company_id_missing');
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  if (!currentUser.roles.some((role) => COMPANY_ROLES.includes(role))) {
    redirect('/company?error=forbidden');
  }

  const inventionId = readValue('invention_id');
  if (!inventionId || !UUID_RE.test(inventionId)) {
    redirect('/company?error=invention_id_invalid');
  }

  const requestedLevel = readValue('requested_level');
  if (!requestedLevel || !isDisclosureLevel(requestedLevel)) {
    redirect('/company?error=level_invalid');
  }

  const supabase = createServerSupabaseClient();

  const { data: inserted, error } = await supabase
    .from('company_disclosure_requests')
    .insert({
      invention_id: inventionId,
      company_account_id: companyAccountId,
      requested_by: currentUser.id,
      requested_level: requestedLevel,
      status: 'requested',
      inventor_approved: false,
      created_by: currentUser.id,
      updated_by: currentUser.id
    })
    .select('id')
    .single();

  if (error || !inserted) {
    redirect('/company?error=request_failed');
  }

  await recordAuditLog({
    eventType: 'company_disclosure_request',
    targetTable: 'company_disclosure_requests',
    targetId: inserted.id,
    actorUserId: currentUser.id,
    actorRole: currentUser.role,
    inventionId,
    companyAccountId,
    disclosureRequestId: inserted.id,
    metadata: { requested_level: requestedLevel }
  });

  // 発明者へ通知（企業名・申請内容は本文に含めない）。
  const admin = createAdminSupabaseClient();
  const { data: inventionOwner } = await admin
    .from('inventions')
    .select('inventor_id')
    .eq('id', inventionId)
    .maybeSingle();
  if (inventionOwner?.inventor_id) {
    await createNotification({
      recipientUserId: inventionOwner.inventor_id,
      type: 'disclosure_requested',
      title: 'あなたの発明に開示申請が届きました',
      body: '内容を確認し、開示への同意可否をご検討ください。',
      inventionId,
      disclosureRequestId: inserted.id,
      linkPath: `/inventor/inventions/${inventionId}`
    });
  }

  revalidatePath('/company');
  redirect('/company?success=request_created');
}

// 会社主導の取引遷移。SECURITY DEFINER 関数経由（migration 0022）。
// 本人の企業メンバー判定・許可遷移は関数内で再検証する。
export async function companyAdvanceDealAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const dealId = readValue('deal_id');
  const toStatus = readValue('to_status');
  const fromStatus = readValue('from_status');

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }
  if (!currentUser.roles.some((role) => COMPANY_ROLES.includes(role))) {
    redirect('/company?error=forbidden');
  }
  if (!dealId || !UUID_RE.test(dealId)) {
    redirect('/company?error=deal_invalid');
  }
  // UX 用の事前ガード（最終判定は関数内）。
  if (!toStatus || !fromStatus || !isCompanyDealTransitionAllowed(fromStatus, toStatus)) {
    redirect('/company?error=deal_transition_invalid');
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('company_advance_deal', {
    _deal_id: dealId,
    _to_status: toStatus,
    _reason: readValue('reason') || null
  });

  if (error) {
    redirect('/company?error=deal_transition_failed');
  }

  // 取引の発明者へ通知（visible_to_inventor=true で履歴も共有）。
  const admin = createAdminSupabaseClient();
  const { data: deal } = await admin
    .from('deal_pipeline')
    .select('invention_id, company_account_id')
    .eq('id', dealId)
    .maybeSingle();

  await recordAuditLog({
    eventType: 'deal_status_changed',
    targetTable: 'deal_pipeline',
    targetId: dealId,
    actorUserId: currentUser.id,
    actorRole: currentUser.role,
    dealId,
    inventionId: deal?.invention_id ?? null,
    companyAccountId: deal?.company_account_id ?? null,
    metadata: { from_status: fromStatus, to_status: toStatus, by: 'company' }
  });

  if (deal?.invention_id) {
    const { data: owner } = await admin
      .from('inventions')
      .select('inventor_id')
      .eq('id', deal.invention_id)
      .maybeSingle();
    if (owner?.inventor_id) {
      await createNotification({
        recipientUserId: owner.inventor_id,
        type: 'deal_status_changed',
        title: '取引の状況が更新されました',
        body: '企業側の操作により取引状況が更新されました。',
        inventionId: deal.invention_id,
        dealId,
        linkPath: '/inventor'
      });
    }
  }

  revalidatePath('/company');
  redirect('/company?success=deal_updated');
}
