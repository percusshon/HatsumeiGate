export default function LoginPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Login（プレースホルダー）</h2>
      <p className="text-slate-700">
        認証実装は次フェーズで本格化します。現時点では接続確認用のプレースホルダーです。
      </p>
      <p className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600">
        ここでは Supabase の公開キー（ANON）経由での接続準備を想定し、service_role は利用しません。
      </p>
    </div>
  );
}
