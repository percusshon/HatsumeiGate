import { createAdminSupabaseClient } from '@/lib/supabase/admin';

// 監査ログ記録（append-only）。
//
// 設計上の制約:
// - audit_logs は RLS 有効・admin SELECT のみで insert ポリシーを持たない（migration 0010/0012/0014）。
//   改ざん耐性のため、書き込みはサーバー専用の service_role からのみ行い、クライアントからは書けない。
// - metadata には機密本文を入れない（migration 0010 のコメント参照）。構造化された文脈のみ。
// - 監査記録の失敗で主処理を止めない（best-effort）。失敗時はサーバーログに残す。
//
// audit_event_type（migration 0001）に対応する種別のみを受け付ける。
export type AuditEventType =
  | 'invention_submit'
  | 'invention_update'
  | 'invention_status_changed'
  | 'submission_check_saved'
  | 'file_uploaded'
  | 'file_viewed'
  | 'file_downloaded'
  | 'screening_report_saved'
  | 'prior_art_item_updated'
  | 'ip_strategy_note_updated'
  | 'company_disclosure_request'
  | 'nda_requested'
  | 'nda_accepted'
  | 'company_invention_viewed'
  | 'deal_status_changed'
  | 'deal_terms_updated'
  | 'revenue_recorded'
  | 'admin_action';

export type AuditLogInput = {
  eventType: AuditEventType;
  targetTable: string;
  targetId?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  inventionId?: string | null;
  companyAccountId?: string | null;
  dealId?: string | null;
  disclosureRequestId?: string | null;
  userAgent?: string | null;
  // 機密本文は入れない。構造化された文脈のみ。
  metadata?: Record<string, unknown>;
};

export async function recordAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const admin = createAdminSupabaseClient();
    const { error } = await admin.from('audit_logs').insert({
      event_type: input.eventType,
      target_table: input.targetTable,
      target_id: input.targetId ?? null,
      actor_user_id: input.actorUserId ?? null,
      actor_role: input.actorRole ?? null,
      invention_id: input.inventionId ?? null,
      company_account_id: input.companyAccountId ?? null,
      deal_id: input.dealId ?? null,
      disclosure_request_id: input.disclosureRequestId ?? null,
      user_agent: input.userAgent ?? null,
      metadata: input.metadata ?? {}
    });
    if (error) {
      console.error('[audit] failed to record audit log', input.eventType, error.message);
    }
  } catch (err) {
    // service_role 未設定など。監査失敗で主処理は止めない。
    console.error('[audit] unexpected error recording audit log', input.eventType, err);
  }
}
