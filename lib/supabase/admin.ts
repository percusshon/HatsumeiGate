import { createClient } from '@supabase/supabase-js';

// SERVER-ONLY service_role client.
// 用途はサーバー専用のゲート付き処理に限定する:
//  1) ゲート付き企業開示API（本人認証・所属企業・開示承認・NDA・開示レベルの検証 + 閲覧ログ）
//  2) 監査ログの append-only 書き込み（audit_logs は insert ポリシーを持たないため）
//  3) private bucket `invention-files` の storage 操作・短期 signed URL 発行（発行の都度監査ログ）
// いずれも RLS をバイパスするため、呼び出し側で必ず権限・開示条件を検証すること。
// クライアントコンポーネントから絶対に import しない。
export function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role environment variables are not configured.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
