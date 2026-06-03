'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { recordAuditLog } from '@/lib/audit/log';
import { createNotification } from '@/lib/notifications/notify';

// 発明者の開示同意は SECURITY DEFINER 関数経由（migration 0018）。
// 本人確認は関数内で行うため、ここでは認証のみ確認する。
export async function setDisclosureApprovalAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const inventionId = readValue('invention_id');
  const requestId = readValue('request_id');
  const decision = readValue('decision');

  if (!inventionId) {
    redirect('/inventor?error=invention_id_missing');
  }
  const detailPath = `/inventor/inventions/${inventionId}`;

  if (!requestId || (decision !== 'approve' && decision !== 'revoke')) {
    redirect(`${detailPath}?error=invalid_request`);
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('set_inventor_disclosure_approval', {
    _request_id: requestId,
    _approved: decision === 'approve'
  });

  if (error) {
    redirect(`${detailPath}?error=approval_failed`);
  }

  revalidatePath(detailPath);
  redirect(`${detailPath}?success=${decision === 'approve' ? 'disclosure_approved' : 'disclosure_revoked'}`);
}

// 発明者による発明の取り下げ。SECURITY DEFINER 関数経由（migration 0021）。
// 取り下げ可能フェーズ・本人確認は関数内で行う。
export async function withdrawInventionAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const inventionId = readValue('invention_id');
  if (!inventionId) {
    redirect('/inventor?error=invention_id_missing');
  }
  const detailPath = `/inventor/inventions/${inventionId}`;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const reason = readValue('reason');

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('inventor_withdraw_invention', {
    _invention_id: inventionId,
    _reason: reason || null
  });

  if (error) {
    redirect(`${detailPath}?error=withdraw_failed`);
  }

  await recordAuditLog({
    eventType: 'invention_update',
    targetTable: 'inventions',
    targetId: inventionId,
    actorUserId: currentUser.id,
    actorRole: currentUser.role,
    inventionId,
    metadata: { action: 'invention_withdrawn' }
  });

  revalidatePath(detailPath);
  redirect(`${detailPath}?success=invention_withdrawn`);
}

// needs_more_info の発明に発明者が追加情報を提出し screening へ戻す。
// SECURITY DEFINER 関数経由（migration 0024）。
export async function respondNeedsMoreInfoAction(formData: FormData) {
  const readValue = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : null;
  };

  const inventionId = readValue('invention_id');
  if (!inventionId) {
    redirect('/inventor?error=invention_id_missing');
  }
  const detailPath = `/inventor/inventions/${inventionId}`;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const note = readValue('note');
  if (!note) {
    redirect(`${detailPath}?error=response_required`);
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc('inventor_respond_needs_more_info', {
    _invention_id: inventionId,
    _note: note
  });

  if (error) {
    redirect(`${detailPath}?error=response_failed`);
  }

  await recordAuditLog({
    eventType: 'invention_update',
    targetTable: 'inventions',
    targetId: inventionId,
    actorUserId: currentUser.id,
    actorRole: currentUser.role,
    inventionId,
    metadata: { action: 'needs_more_info_response' }
  });

  // 追加情報を依頼した operator（最後に needs_more_info へ遷移させた人）へ通知。
  const admin = createAdminSupabaseClient();
  const { data: lastNmi } = await admin
    .from('invention_status_events')
    .select('changed_by')
    .eq('invention_id', inventionId)
    .eq('to_status', 'needs_more_info')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastNmi?.changed_by) {
    await createNotification({
      recipientUserId: lastNmi.changed_by,
      type: 'needs_more_info_response',
      title: '発明者から追加情報が提出されました',
      body: '審査を再開できます。案件の詳細をご確認ください。',
      inventionId,
      linkPath: `/operator/inventions/${inventionId}`
    });
  }

  revalidatePath(detailPath);
  redirect(`${detailPath}?success=response_submitted`);
}
