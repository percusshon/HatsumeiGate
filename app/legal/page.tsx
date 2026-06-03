// 注意: 本ページの文言は暫定ドラフトであり、確定前に法務レビューが必要。
// 確定文言・準拠法・管轄・事業者表記は正式版で差し替える。
export default function LegalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">利用条件・免責（暫定ドラフト）</h2>
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          本ページは暫定版です。確定文言・準拠法・管轄・事業者情報は法務レビューを経て正式化します。
          現時点の記載は最終的な契約条件ではありません。
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">1. サービスの位置づけ</h3>
        <p className="text-sm text-slate-700">
          本サービスは、発明アイデアの整理・知財化検討・企業提案を支援するものです。
          運営は弁理士業務（特許庁手続の代理）を行いません。特許実務は必要に応じて専門家の見解を得る前提で進めます。
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">2. 保証の否認</h3>
        <p className="text-sm text-slate-700">
          本サービスは、特許取得、企業との取引成立、売却、ライセンス、収益化のいずれも保証しません。
          審査結果・提案結果は個別の状況により異なります。
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">3. 秘密保持と開示</h3>
        <p className="text-sm text-slate-700">
          投稿情報は原則として秘密情報として扱います。企業への開示は、開示レベルと NDA に基づく段階的な制御のもとでのみ行われます。
          開示・閲覧・ファイル取得は記録（監査ログ）されます。
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">4. 禁止事項</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>開示を受けた秘密情報の、許可なき社外共有・第三者転送・複製。</li>
          <li>透かし・閲覧記録などの保護措置の回避・除去の試み。</li>
          <li>他者の権利を侵害する投稿、虚偽情報の投稿。</li>
          <li>本サービスの不正利用、認証情報の共有。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">5. 責任の制限</h3>
        <p className="text-sm text-slate-700">
          利用は自己責任を前提とします。責任範囲・制限の詳細は正式版で定めます。
        </p>
      </section>

      <p className="text-xs text-slate-500">最終更新: 暫定ドラフト（要法務レビュー）。</p>
    </div>
  );
}
