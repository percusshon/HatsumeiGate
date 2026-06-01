import { createClient } from '@supabase/supabase-js';

// SERVER-ONLY service_role client.
// 用途は「ゲート付き企業開示API」に限定する。RLS をバイパスするため、
// 呼び出し側で必ず本人認証・所属企業・開示承認・NDA・開示レベルを検証し、
// 閲覧ログを記録すること。クライアントコンポーネントから絶対に import しない。
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
