import { SectionCard } from '@/components/section-card';

export default function OperatorPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Operator Dashboard（プレースホルダー）</h2>
      <p className="text-slate-700">運営向けの審査・ステータス・開示ワークフロー起点のページです。</p>
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard
          title="審査管理"
          description="発明ごとの進捗イベント確認・診断メモ起点の運用を追加予定です。"
          href="/"
          cta="運営方針を確認"
        />
        <SectionCard
          title="会社・開示管理"
          description="NDA/開示レベル制御を前提に、開示リクエストと審査履歴を管理します。"
          href="/"
          cta="業務ルールを確認"
        />
      </div>
    </div>
  );
}
