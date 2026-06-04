// 利用規約（公開用）。
// 注意（内部メモ・非表示）: 本文は実装と整合させた公開水準のドラフト。
// 事業者名・所在地・代表者・問い合わせ窓口・制定日・合意管轄など【】箇所は
// 公開前に運営が確定する。最終的な内容確定にあたっては弁護士の確認を推奨する。
// 確認項目は docs/legal-review-checklist.md を参照。
export const metadata = {
  title: '利用規約 | Hatsumei Gate'
};

export default function LegalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">利用規約</h2>
        <p className="mt-2 text-sm text-slate-600">
          本利用規約（以下「本規約」といいます。）は、【事業者名】（以下「当社」といいます。）が提供する
          「Hatsumei Gate（発明ゲート）」（以下「本サービス」といいます。）の利用条件を定めるものです。
          利用者は、本規約に同意のうえ本サービスを利用するものとします。
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">第1条（定義）</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>「利用者」とは、本サービスに登録し、または本サービスを利用するすべての者をいいます。</li>
          <li>「発明者」とは、発明アイデア等の情報（以下「投稿情報」）を本サービスに登録する利用者をいいます。</li>
          <li>「企業利用者」とは、審査・招待を経て企業として本サービスを利用する利用者をいいます。</li>
          <li>「運営」とは、本サービスの審査・運用を行う当社の担当者をいいます。</li>
          <li>「開示」とは、開示レベルおよび秘密保持契約（NDA）に基づき投稿情報を企業利用者へ提示することをいいます。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">第2条（本規約への同意・適用）</h3>
        <p className="text-sm text-slate-700">
          利用者は、本規約に同意した時点で本サービスを利用できます。本サービス上で当社が掲示する個別の
          ガイドライン・注意事項は本規約の一部を構成します。本規約と個別規定が矛盾する場合は、別段の定めがない限り個別規定が優先します。
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">第3条（アカウント登録・認証）</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>本サービスの認証は、登録メールアドレスへのログインリンク送信（パスワードレス認証）により行います。</li>
          <li>利用者は、登録情報を正確かつ最新に保つものとします。</li>
          <li>利用者は、自己のアカウントおよび認証手段を自己の責任で管理し、第三者と共有してはなりません。</li>
          <li>企業利用者の登録は、当社の審査および招待を経て有効になります。当社は理由を開示することなく審査・登録を拒否し、または停止することができます。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">第4条（本サービスの内容）</h3>
        <p className="text-sm text-slate-700">
          本サービスは、発明アイデアの整理、先行技術の確認、知財方針の検討、試作・提案の準備、企業への提案および
          譲渡・ライセンス・共同開発に関する交渉支援を提供するものです。本サービスはアイデアの単なる公開の場ではなく、
          秘密保持を前提とした審査・提案支援を目的とします。
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">第5条（非保証・弁理士業務の不提供）</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>当社は弁理士業務（特許庁に対する手続の代理その他弁理士法上の独占業務）を行いません。特許等の出願・権利化が必要な場合、利用者は別途、弁理士その他の専門家にご相談ください。</li>
          <li>当社は、特許等の取得、企業との取引の成立、譲渡・ライセンスの実現、収益化のいずれについても保証しません。</li>
          <li>本サービスを通じて提供される審査結果・助言・提案は参考情報であり、その正確性・有用性・特定目的への適合性を保証するものではありません。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">第6条（秘密保持と開示の仕組み）</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>投稿情報は原則として秘密情報として取り扱います。</li>
          <li>企業利用者への開示は、段階的な開示レベルと、レベルに応じた秘密保持契約（NDA）に基づいてのみ行われます。</li>
          <li>開示・閲覧・ファイル取得その他の重要な操作は記録（監査ログ）され、漏洩時の追跡に用いられます。</li>
          <li>企業利用者へ配信される画像・PDF には、配信の都度、社名・閲覧者・閲覧日時等の透かしが付されることがあります。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">第7条（知的財産権の帰属）</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>投稿情報に関する知的財産権その他の権利は、原則として発明者その他の正当な権利者に帰属します。本規約は当該権利を当社に移転するものではありません。</li>
          <li>当社は、本サービスの提供・運用・改善および利用者への提案支援に必要な範囲で、投稿情報を利用できるものとします。</li>
          <li>本サービス自体（プログラム、UI、文章、ロゴ等）に関する権利は当社または正当な権利者に帰属します。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">第8条（利用者の表明・保証および責任）</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>利用者は、投稿情報について自らが正当な権利を有し、または必要な権利・許諾を得ていることを表明し、保証します。</li>
          <li>利用者は、投稿情報が第三者の権利（知的財産権、秘密保持義務、肖像権等）を侵害しないことを保証します。</li>
          <li>投稿情報に起因して第三者との間に紛争が生じた場合、利用者は自己の責任と費用でこれを解決するものとします。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">第9条（禁止事項）</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>開示を受けた秘密情報の、許可のない社外共有・第三者提供・複製・転用。</li>
          <li>透かし・閲覧記録・アクセス制御等の保護措置の回避・除去・無効化の試み。</li>
          <li>他者の権利を侵害する投稿、虚偽情報の投稿、なりすまし。</li>
          <li>本サービスの不正利用、認証手段の共有・譲渡、過度な負荷を与える行為。</li>
          <li>法令または公序良俗に違反する行為、当社が不適切と合理的に判断する行為。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">第10条（料金・手数料）</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>本サービスの利用料金および当社が受領する手数料の有無・額・算定方法は、本サービス上の表示または個別の合意により定めます。</li>
          <li>本サービスを通じて成立した取引については、当社所定のプラットフォーム手数料（原則として対象金額の20%。個別の合意により変更することがあります。）が適用されることがあります。</li>
          <li>料金・手数料に関する具体的条件は、適用の前に利用者へ提示します。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">第11条（個人情報の取扱い）</h3>
        <p className="text-sm text-slate-700">
          当社は、利用者の個人情報を別途定める
          <a href="/privacy" className="text-blue-600 underline">プライバシーポリシー</a>
          に従い適切に取り扱います。
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">第12条（サービスの変更・中断・終了）</h3>
        <p className="text-sm text-slate-700">
          当社は、利用者への事前の通知をもって（緊急の場合は事後の通知により）、本サービスの内容の変更、提供の中断・終了を行うことができます。
          これにより利用者に生じた損害について、当社は次条の定めに従い責任を負います。
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">第13条（免責・責任の制限）</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>当社は、本サービスに事実上または法律上の瑕疵がないことを明示・黙示に保証しません。</li>
          <li>当社は、本サービスの利用に関連して利用者に生じた損害について、当社の故意または重過失による場合を除き、責任を負いません。</li>
          <li>前項にかかわらず、当社が責任を負う場合であっても、当社が賠償する損害は、現実に発生した通常損害（特別損害、逸失利益を除く。）に限られ、その上限は【上限額の定め（例: 利用者が当社に支払った直近12か月の対価の総額等）】とします。なお、消費者契約法その他の強行法規により当社の責任を免除できない場合には、当該法令が適用されます。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">第14条（反社会的勢力の排除）</h3>
        <p className="text-sm text-slate-700">
          利用者は、自らが反社会的勢力でないこと、およびこれらと関係を有しないことを表明し、保証します。
          これに違反した場合、当社は何らの催告なく本サービスの利用を停止し、または登録を抹消することができます。
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">第15条（規約の変更）</h3>
        <p className="text-sm text-slate-700">
          当社は、必要に応じて本規約を変更することができます。重要な変更を行う場合は、本サービス上での掲示その他適切な方法により周知します。
          変更後に利用者が本サービスを利用したときは、変更後の本規約に同意したものとみなします。
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">第16条（準拠法・管轄）</h3>
        <p className="text-sm text-slate-700">
          本規約は日本法に準拠して解釈されます。本サービスまたは本規約に関して紛争が生じた場合、
          【第一審の専属的合意管轄裁判所（例: 東京地方裁判所）】を第一審の専属的合意管轄裁判所とします。
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">第17条（事業者情報・お問い合わせ）</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>事業者名: 【事業者名】</li>
          <li>所在地: 【所在地】</li>
          <li>代表者: 【代表者名】</li>
          <li>お問い合わせ窓口: 【お問い合わせ用メールアドレス】</li>
        </ul>
      </section>

      <p className="text-xs text-slate-500">制定日: 【制定日】／最終改定日: 【最終改定日】</p>
    </div>
  );
}
