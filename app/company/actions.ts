'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { isDisclosureLevel } from '@/lib/company/disclosure';
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
