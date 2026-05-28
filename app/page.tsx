import { SectionCard } from '@/components/section-card';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">個人の発明を、知財と企業提案へつなぐ。</h2>
      <p className="text-slate-700">
        Hatsumei Gate は秘密情報の取扱いを前提にした非公開・審査制の企画管理基盤です。公開販売マーケットではなく、
        発明者・運営・会社・パートナー向けに役割別の流れを整えることを目的とします。
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard
          title="発明者向け"
          description="発明登録・一次診断・進捗確認などの土台を次フェーズで実装します。"
          href="/inventor"
          cta="発明者ダッシュボードへ"
        />
        <SectionCard
          title="運営・提案フロー"
          description="審査・ステータス管理・開示ワークフローの実装を後続で段階導入します。"
          href="/operator"
          cta="運営ページへ"
        />
      </div>
      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        NDA前提・開示レベル制御・閲覧ログを満たすUIは次工程で追加し、誤表示を抑止します。
      </p>
    </div>
  );
}
