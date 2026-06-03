'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { isDealType, isOperatorDealTransitionAllowed } from '@/lib/deal/status';
import { isRevenueEventType } from '@/lib/revenue/events';
import { recordAuditLog } from '@/lib/audit/log';
import { createNotification, createNotifications, getCompanyMemberUserIds, type NotificationInput } from '@/lib/notifications/notify';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 取引（deal）の新規作成は operator/admin のみ（migration 0019 の insert ポリシー）。
// 承認済みの開示申請を起点に、その invention/company を引き継いで deal を作る。
const INITIAL_DEAL_STATUS = 'interested';

// deal_pipeline の更新と deal_status_events 追加は operator/admin のみ（migration 0014）。
const OPERATOR_ROLES = ['operator', 'admin'];

export async function updateDealStatusAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const dealId = readValue('deal_id');
  if (!dealId) {
    redirect('/operator/deals?error=deal_id_missing');
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  if (!currentUser.roles.some((role) => OPERATOR_ROLES.includes(role))) {
    redirect('/operator/deals?error=forbidden');
  }

  const toStatus = readValue('to_status');
  if (!toStatus) {
    redirect('/operator/deals?error=status_required');
  }
  const reason = readValue('reason');
  const visibleToInventor = formData.get('visible_to_inventor') === 'on';
  const visibleToCompany = formData.get('visible_to_company') === 'on';

  const supabase = createServerSupabaseClient();

  const { data: deal, error: fetchError } = await supabase
    .from('deal_pipeline')
    .select('id, status, invention_id, company_account_id')
    .eq('id', dealId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError || !deal) {
    redirect('/operator/deals?error=not_found');
  }

  const fromStatus = deal.status as string;

  if (fromStatus === toStatus) {
    redirect('/operator/deals?error=same_status');
  }

  if (!isOperatorDealTransitionAllowed(fromStatus, toStatus)) {
    redirect('/operator/deals?error=invalid_transition');
  }

  const { data: updated, error: updateError } = await supabase
    .from('deal_pipeline')
    .update({ status: toStatus, updated_by: currentUser.id })
    .eq('id', dealId)
    .eq('status', fromStatus)
    .is('deleted_at', null)
    .select('id')
    .single();

  if (updateError || !updated) {
    redirect('/operator/deals?error=update_failed');
  }

  const { error: eventError } = await supabase.from('deal_status_events').insert({
    deal_id: dealId,
    from_status: fromStatus,
    to_status: toStatus,
    changed_by: currentUser.id,
    reason: reason || null,
    visible_to_inventor: visibleToInventor,
    visible_to_company: visibleToCompany
  });

  if (eventError) {
    redirect('/operator/deals?error=status_event_failed');
  }

  await recordAuditLog({
    eventType: 'deal_status_changed',
    targetTable: 'deal_pipeline',
    targetId: dealId,
    actorUserId: currentUser.id,
    actorRole: currentUser.role,
    dealId,
    metadata: {
      from_status: fromStatus,
      to_status: toStatus,
      visible_to_inventor: visibleToInventor,
      visible_to_company: visibleToCompany
    }
  });

  // 可視フラグに応じて発明者・企業メンバーへ通知する。
  const notifications: NotificationInput[] = [];
  if (visibleToInventor) {
    const admin = createAdminSupabaseClient();
    const { data: owner } = await admin
      .from('inventions')
      .select('inventor_id')
      .eq('id', deal.invention_id)
      .maybeSingle();
    if (owner?.inventor_id) {
      notifications.push({
        recipientUserId: owner.inventor_id,
        type: 'deal_status_changed',
        title: '取引の状況が更新されました',
        body: '進捗の詳細はダッシュボードでご確認ください。',
        inventionId: deal.invention_id,
        dealId,
        linkPath: '/inventor'
      });
    }
  }
  if (visibleToCompany) {
    const memberIds = await getCompanyMemberUserIds(deal.company_account_id);
    for (const userId of memberIds) {
      notifications.push({
        recipientUserId: userId,
        type: 'deal_status_changed',
        title: '取引の状況が更新されました',
        body: 'Company Portal で詳細を確認してください。',
        inventionId: deal.invention_id,
        companyAccountId: deal.company_account_id,
        dealId,
        linkPath: '/company'
      });
    }
  }
  await createNotifications(notifications);

  revalidatePath('/operator/deals');
  redirect('/operator/deals?success=deal_updated');
}

export async function createDealAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  if (!currentUser.roles.some((role) => OPERATOR_ROLES.includes(role))) {
    redirect('/operator/deals?error=forbidden');
  }

  // 承認済みの開示申請を起点にする。invention/company は申請レコードから取得し、
  // フォーム送信値を信用しない（不整合・なりすまし防止）。
  const disclosureRequestId = readValue('disclosure_request_id');
  if (!disclosureRequestId || !UUID_RE.test(disclosureRequestId)) {
    redirect('/operator/deals?error=disclosure_request_invalid');
  }

  const dealType = readValue('deal_type');
  if (!dealType || !isDealType(dealType)) {
    redirect('/operator/deals?error=deal_type_invalid');
  }

  const proposedTerms = readValue('proposed_terms_summary');
  const internalNote = readValue('internal_note');

  const supabase = createServerSupabaseClient();

  const { data: request, error: requestError } = await supabase
    .from('company_disclosure_requests')
    .select('id, invention_id, company_account_id, status')
    .eq('id', disclosureRequestId)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .maybeSingle();

  if (requestError || !request) {
    redirect('/operator/deals?error=disclosure_request_not_approved');
  }

  // 同一開示申請から重複して deal を作らない。
  const { data: existing } = await supabase
    .from('deal_pipeline')
    .select('id')
    .eq('disclosure_request_id', disclosureRequestId)
    .is('deleted_at', null)
    .maybeSingle();

  if (existing) {
    redirect('/operator/deals?error=deal_already_exists');
  }

  const { data: created, error: insertError } = await supabase
    .from('deal_pipeline')
    .insert({
      invention_id: request.invention_id,
      company_account_id: request.company_account_id,
      disclosure_request_id: disclosureRequestId,
      deal_type: dealType,
      status: INITIAL_DEAL_STATUS,
      proposed_terms_summary: proposedTerms || null,
      internal_note: internalNote || null,
      created_by: currentUser.id,
      updated_by: currentUser.id
    })
    .select('id')
    .single();

  if (insertError || !created) {
    redirect('/operator/deals?error=create_failed');
  }

  // 初期ステータスの履歴を残す（from は null）。
  await supabase.from('deal_status_events').insert({
    deal_id: created.id,
    from_status: null,
    to_status: INITIAL_DEAL_STATUS,
    changed_by: currentUser.id,
    reason: 'deal created from approved disclosure request'
  });

  await recordAuditLog({
    eventType: 'deal_status_changed',
    targetTable: 'deal_pipeline',
    targetId: created.id,
    actorUserId: currentUser.id,
    actorRole: currentUser.role,
    dealId: created.id,
    inventionId: request.invention_id,
    companyAccountId: request.company_account_id,
    disclosureRequestId,
    metadata: { action: 'deal_created', deal_type: dealType, to_status: INITIAL_DEAL_STATUS }
  });

  revalidatePath('/operator/deals');
  redirect('/operator/deals?success=deal_created');
}

// operator が取引に対し収益イベントを記録する（migration 0026 の insert RLS）。
// 金額・通貨・手数料は入力値として保存する（業務上の固定ポリシーは持たない）。
export async function recordRevenueEventAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };
  const readNumber = (key: string): number | null => {
    const raw = readValue(key);
    if (!raw) {
      return null;
    }
    const n = Number(raw);
    return Number.isFinite(n) ? n : NaN;
  };

  const dealId = readValue('deal_id');
  if (!dealId || !UUID_RE.test(dealId)) {
    redirect('/operator/deals?error=deal_id_missing');
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }
  if (!currentUser.roles.some((role) => OPERATOR_ROLES.includes(role))) {
    redirect('/operator/deals?error=forbidden');
  }

  const eventType = readValue('event_type');
  if (!eventType || !isRevenueEventType(eventType)) {
    redirect('/operator/deals?error=revenue_type_invalid');
  }

  const amount = readNumber('amount');
  if (amount !== null && Number.isNaN(amount)) {
    redirect('/operator/deals?error=revenue_amount_invalid');
  }
  const inventorAmount = readNumber('inventor_amount');
  const platformFeeAmount = readNumber('platform_fee_amount');
  if (
    (inventorAmount !== null && Number.isNaN(inventorAmount)) ||
    (platformFeeAmount !== null && Number.isNaN(platformFeeAmount))
  ) {
    redirect('/operator/deals?error=revenue_amount_invalid');
  }

  const currency = readValue('currency') || 'JPY';
  const occurredAt = readValue('occurred_at');

  const supabase = createServerSupabaseClient();

  // deal から invention/company を引き継ぐ（入力の取り違え防止）。
  const { data: deal } = await supabase
    .from('deal_pipeline')
    .select('id, invention_id, company_account_id')
    .eq('id', dealId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!deal) {
    redirect('/operator/deals?error=not_found');
  }

  const { data: created, error } = await supabase
    .from('revenue_events')
    .insert({
      deal_id: dealId,
      invention_id: deal.invention_id,
      company_account_id: deal.company_account_id,
      event_type: eventType,
      amount,
      currency,
      platform_fee_amount: platformFeeAmount,
      inventor_amount: inventorAmount,
      occurred_at: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
      created_by: currentUser.id
    })
    .select('id')
    .single();

  if (error || !created) {
    redirect('/operator/deals?error=revenue_failed');
  }

  await recordAuditLog({
    eventType: 'revenue_recorded',
    targetTable: 'revenue_events',
    targetId: created.id,
    actorUserId: currentUser.id,
    actorRole: currentUser.role,
    dealId,
    inventionId: deal.invention_id,
    companyAccountId: deal.company_account_id,
    metadata: { revenue_event_type: eventType }
  });

  // 発明者へ収益記録を通知（金額本文は通知に含めない）。
  if (deal.invention_id) {
    const admin = createAdminSupabaseClient();
    const { data: owner } = await admin
      .from('inventions')
      .select('inventor_id')
      .eq('id', deal.invention_id)
      .maybeSingle();
    if (owner?.inventor_id) {
      await createNotification({
        recipientUserId: owner.inventor_id,
        type: 'revenue_recorded',
        title: '収益イベントが記録されました',
        body: '取引に関する収益が記録されました。詳細はダッシュボードでご確認ください。',
        inventionId: deal.invention_id,
        dealId,
        linkPath: '/inventor'
      });
    }
  }

  revalidatePath('/operator/deals');
  redirect('/operator/deals?success=revenue_recorded');
}
