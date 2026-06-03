// リクエストヘッダからクライアントIPを推定する。
// inet 型に入れるため、最初の妥当な IP らしき値のみ返す（無ければ null）。
// 注意: プロキシ構成に依存するため、監査の補助情報として扱う。

type HeaderLike = { get(name: string): string | null };

export function getClientIp(headers: HeaderLike): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return null;
}
