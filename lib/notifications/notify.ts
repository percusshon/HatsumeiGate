import { createAdminSupabaseClient } from '@/lib/supabase/admin';

// アプリ内通知の作成（サーバー専用）。
//
// 設計上の制約:
// - notifications は受信者本人のみ select/update 可能で、insert ポリシーを持たない（migration 0020）。
//   そのため作成はサーバーの service_role からのみ行う。
// - title/body に機密本文（発明内容等）を入れない。汎用文言＋リンクのみ。
// - 通知作成の失敗で主処理を止めない（best-effort）。

export type NotificationInput = {
  recipientUserId: string;
  type: string;
  title: string;
  body?: string | null;
  inventionId?: string | null;
  companyAccountId?: string | null;
  dealId?: string | null;
  disclosureRequestId?: string | null;
  linkPath?: string | null;
};

export async function createNotifications(inputs: NotificationInput[]): Promise<void> {
  if (inputs.length === 0) {
    return;
  }
  try {
    const admin = createAdminSupabaseClient();
    const rows = inputs.map((input) => ({
      recipient_user_id: input.recipientUserId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      invention_id: input.inventionId ?? null,
      company_account_id: input.companyAccountId ?? null,
      deal_id: input.dealId ?? null,
      disclosure_request_id: input.disclosureRequestId ?? null,
      link_path: input.linkPath ?? null
    }));
    const { error } = await admin.from('notifications').insert(rows);
    if (error) {
      console.error('[notify] failed to create notifications', error.message);
    }
  } catch (err) {
    console.error('[notify] unexpected error creating notifications', err);
  }
}

export async function createNotification(input: NotificationInput): Promise<void> {
  await createNotifications([input]);
}

// 指定した企業アカウントの有効メンバー（user_id 一覧）を取得する。
// deal/開示イベントを企業側へ通知する際の宛先解決に使う。
export async function getCompanyMemberUserIds(companyAccountId: string): Promise<string[]> {
  try {
    const admin = createAdminSupabaseClient();
    const { data } = await admin
      .from('company_members')
      .select('user_id')
      .eq('company_account_id', companyAccountId)
      .is('deleted_at', null);
    return Array.from(new Set((data ?? []).map((row) => row.user_id as string)));
  } catch (err) {
    console.error('[notify] failed to resolve company members', err);
    return [];
  }
}
