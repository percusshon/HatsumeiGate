import { SectionCard } from '@/components/section-card';

export default function CompanyPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Company Portal（プレースホルダー）</h2>
      <p className="text-slate-700">
        NDA前提のため、発明の詳細は直接画面表示しません。まずは自社のアカウントと開示申請状況のみ閲覧します。
      </p>
      <SectionCard
        title="表示制約"
        description="本段階では `inventions` / `invention_files` の直接取得画面は作成しません。"
        href="/"
        cta="トップへ"
      />
      <p className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
        表示権限はNDA成立・開示承認・企業所属・閲覧ログを満たした場合のみ、次工程でAPI経由のDTOとして返却します。
      </p>
    </div>
  );
}
