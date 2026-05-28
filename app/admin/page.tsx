import { SectionCard } from '@/components/section-card';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Admin Console（プレースホルダー）</h2>
      <p className="text-slate-700">役割別の監査前提で、監視・運用品質確認を行うための管理画面プレースホルダーです。</p>
      <SectionCard
        title="監査ログ方針"
        description="監査ログの閲覧・履歴追跡の実装は次フェーズで接続します。"
        href="/"
        cta="Topへ"
      />
    </div>
  );
}
