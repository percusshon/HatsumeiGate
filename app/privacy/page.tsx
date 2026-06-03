// 注意: 本ページの文言は暫定ドラフトであり、確定前に法務レビューが必要。
// 取得情報の範囲・保存期間・第三者提供・問い合わせ窓口は正式版で確定する。
export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">プライバシー（暫定ドラフト）</h2>
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          本ページは暫定版です。取得情報の範囲・保存期間・第三者提供・開示請求対応・問い合わせ窓口は
          法務レビューを経て正式化します。
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">1. 取得する情報</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>アカウント情報（メールアドレス、表示名、ロール）。</li>
          <li>投稿された発明情報・添付ファイル。</li>
          <li>開示・閲覧・ファイル取得の操作ログ（日時、IP、ユーザーエージェント等）。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">2. 利用目的</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>発明の審査・知財化検討・企業提案支援の提供。</li>
          <li>秘密保持の担保と、不正・漏洩の検知・追跡。</li>
          <li>サービスの運用・改善、問い合わせ対応。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">3. 保存とアクセス制御</h3>
        <p className="text-sm text-slate-700">
          秘密情報は原則として private 扱いとし、公開範囲は RLS と API 制御で厳密に管理します。
          ファイルは署名付きの短期 URL でのみ配信し、企業向け配信には透かしと閲覧記録を適用します。
          サーバー専用の権限（service_role）は、開示 API・監査・ファイル配信に限定して使用します。
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">4. 第三者提供</h3>
        <p className="text-sm text-slate-700">
          開示レベルと NDA に基づく企業開示を除き、本人の同意なく第三者へ提供しません。
          具体的な提供先・条件は正式版で定めます。
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">5. 監査ログ</h3>
        <p className="text-sm text-slate-700">
          開示・閲覧・ファイル取得・重要な状態変更は監査ログとして記録し、漏洩時の追跡に用います。
        </p>
      </section>

      <p className="text-xs text-slate-500">最終更新: 暫定ドラフト（要法務レビュー）。</p>
    </div>
  );
}
