import { SectionCard } from '@/components/section-card';

export default function InventorPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Inventor Dashboard（プレースホルダー）</h2>
      <p className="text-slate-700">本人の発明管理ダッシュボードです。投稿・編集・提出は次フェーズで実装予定です。</p>
      <SectionCard
        title="次フェーズ予定"
        description="draft作成、投稿チェック、statusイベント閲覧、開示依頼の受付結果確認を追加します。"
        href="/"
        cta="トップで概要確認"
      />
    </div>
  );
}
