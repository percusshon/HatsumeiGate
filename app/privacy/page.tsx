// プライバシーポリシー（公開用）。
// 注意（内部メモ・非表示）: 本文は実装（収集項目・委託先・安全管理措置）と整合させた公開水準のドラフト。
// 事業者名・所在地・代表者・保護管理者・問い合わせ窓口・制定日・保存期間の具体値など【】箇所は
// 公開前に運営が確定する。海外移転・委託先の最終確定および表現の妥当性は弁護士の確認を推奨する。
// 確認項目は docs/legal-review-checklist.md を参照。
export const metadata = {
  title: 'プライバシーポリシー | Hatsumei Gate'
};

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">プライバシーポリシー</h2>
        <p className="mt-2 text-sm text-slate-600">
          【事業者名】（以下「当社」といいます。）は、「Hatsumei Gate（発明ゲート）」（以下「本サービス」といいます。）における
          利用者の個人情報を、個人情報の保護に関する法律その他の関係法令を遵守し、本ポリシーに従って適切に取り扱います。
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">1. 取得する情報</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>アカウント情報: メールアドレス、表示名、ロール（発明者／企業／運営等）、希望言語、タイムゾーン。</li>
          <li>投稿情報: 発明アイデアの内容、添付ファイル、関連するメタデータ。</li>
          <li>取引・開示に関する情報: 開示申請、秘密保持契約（NDA）の同意・失効、取引の状態、当社が記録する取引金額等。</li>
          <li>操作・アクセスログ: 開示・閲覧・ファイル取得・重要な状態変更等の記録（日時、IPアドレス、ユーザーエージェント等）。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">2. 利用目的</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>本サービスの提供、本人認証、アカウント管理。</li>
          <li>発明の審査、知財化検討、企業提案および取引支援の提供。</li>
          <li>秘密保持の担保、ならびに不正利用・情報漏洩の検知・防止・追跡。</li>
          <li>お問い合わせへの対応、重要なお知らせの通知。</li>
          <li>本サービスの運用・改善、品質・安全性の向上。</li>
          <li>法令に基づく対応。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">3. 安全管理措置</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>投稿情報は原則として非公開として保管し、公開範囲をアクセス制御（行レベルセキュリティおよびアプリケーションでの認可）により厳密に管理します。</li>
          <li>サーバー専用の高権限は、開示処理・監査記録・ファイル配信など必要な処理に限定して使用し、利用者の端末には渡しません。</li>
          <li>企業利用者へのファイル配信は、秘密保持契約および開示レベルの条件を満たす場合に限り、サーバー側で透かしを付し、閲覧記録を残したうえで行います。</li>
          <li>通信の暗号化、アクセスログの記録、権限分離等の措置を講じます。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">4. 第三者提供</h3>
        <p className="text-sm text-slate-700">
          当社は、次の場合を除き、あらかじめ本人の同意を得ることなく個人情報を第三者に提供しません。
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>開示レベルおよび秘密保持契約に基づき、本人（発明者）の同意のもとで企業利用者へ開示する場合。</li>
          <li>法令に基づく場合、または人の生命・身体・財産の保護のために必要な場合。</li>
          <li>次条に定める業務委託に伴い、利用目的の達成に必要な範囲で取扱いを委託する場合。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">5. 業務委託（クラウド事業者の利用）</h3>
        <p className="text-sm text-slate-700">
          当社は、本サービスの提供のため、データベース・認証・ストレージおよびホスティングを外部のクラウド事業者
          （例: Supabase、Vercel、ならびに認証メール送信のための送信サービス）に委託します。委託に際しては、
          利用目的の達成に必要な範囲で個人情報を取り扱わせ、適切な監督を行います。
          データの保存先リージョンは日本国内（東京）を指定する方針です。委託先が外国にある場合には、
          関係法令に従い必要な措置を講じます。
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">6. Cookie・アクセスログ</h3>
        <p className="text-sm text-slate-700">
          本サービスは、ログインセッションの維持や安全性確保のために Cookie 等を使用します。
          また、不正検知・品質改善のためアクセスログ（IPアドレス、ユーザーエージェント等）を記録します。
          これらは本ポリシーに定める利用目的の範囲で取り扱います。
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">7. 保存期間</h3>
        <p className="text-sm text-slate-700">
          当社は、利用目的の達成に必要な期間、および法令により保存が義務付けられる期間、個人情報を保管し、
          その後は適切な方法で消去または匿名化します。なお、漏洩時の追跡に必要な監査ログは、安全管理の目的のため
          相当期間保管することがあります。具体的な保存期間は【保存期間の具体的定め】によります。
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">8. 開示・訂正・利用停止等の請求</h3>
        <p className="text-sm text-slate-700">
          利用者は、法令の定めるところにより、自己の保有個人データについて、利用目的の通知、開示、訂正・追加・削除、
          利用停止・消去、第三者提供の停止を請求できます。請求は下記のお問い合わせ窓口で受け付けます。
          本人確認のうえ、法令に従い対応します。
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">9. 本ポリシーの改定</h3>
        <p className="text-sm text-slate-700">
          当社は、必要に応じて本ポリシーを改定することがあります。重要な変更を行う場合は、本サービス上での掲示その他適切な方法により周知します。
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">10. お問い合わせ窓口</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>事業者名: 【事業者名】</li>
          <li>個人情報保護管理者: 【保護管理者の役職・氏名】</li>
          <li>お問い合わせ用メールアドレス: 【お問い合わせ用メールアドレス】</li>
        </ul>
      </section>

      <p className="text-xs text-slate-500">制定日: 【制定日】／最終改定日: 【最終改定日】</p>
    </div>
  );
}
