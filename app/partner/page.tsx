import { SectionCard } from '@/components/section-card';

export default function PartnerPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Patent Partner Portal（プレースホルダー）</h2>
      <p className="text-slate-700">
        パートナーは運営が割り当てた案件のみ確認します。案件外の閲覧は原則不可です。
      </p>
      <SectionCard
        title="割当専用方針"
        description="assigned案件の閲覧のみを許可し、表示内容は相談準備用途に限定します。"
        href="/"
        cta="一覧へ戻る"
      />
      <p className="rounded-md border border-slate-200 bg-slate-100 p-3 text-sm">
        法的助言・特許手続代理の表示は避け、運営の代行判断にならない表現に留めます。
      </p>
    </div>
  );
}
