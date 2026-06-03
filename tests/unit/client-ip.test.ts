import { describe, expect, it } from 'vitest';
import { getClientIp } from '@/lib/http/client-ip';

// Headers 風の最小モック。
function headers(map: Record<string, string>) {
  return {
    get(name: string): string | null {
      return map[name.toLowerCase()] ?? null;
    }
  };
}

describe('getClientIp', () => {
  it('x-forwarded-for の先頭IPを返す', () => {
    expect(getClientIp(headers({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' }))).toBe(
      '203.0.113.7'
    );
  });

  it('x-forwarded-for の先頭の前後空白を除去する', () => {
    expect(getClientIp(headers({ 'x-forwarded-for': '  198.51.100.5 , 10.0.0.1' }))).toBe('198.51.100.5');
  });

  it('x-forwarded-for が無ければ x-real-ip にフォールバックする', () => {
    expect(getClientIp(headers({ 'x-real-ip': '192.0.2.44' }))).toBe('192.0.2.44');
  });

  it('x-real-ip も trim する', () => {
    expect(getClientIp(headers({ 'x-real-ip': ' 192.0.2.99 ' }))).toBe('192.0.2.99');
  });

  it('どのヘッダも無ければ null', () => {
    expect(getClientIp(headers({}))).toBeNull();
  });

  it('x-forwarded-for が空文字なら x-real-ip にフォールバックする', () => {
    expect(getClientIp(headers({ 'x-forwarded-for': '', 'x-real-ip': '192.0.2.1' }))).toBe('192.0.2.1');
  });

  it('x-forwarded-for が空要素だけ（", "）なら null（妥当な先頭IPなし）', () => {
    // split(',')[0] が空文字 → trim 後も空 → フォールバックも無いので null
    expect(getClientIp(headers({ 'x-forwarded-for': ' , 10.0.0.1' }))).toBeNull();
  });

  it('x-forwarded-for を x-real-ip より優先する', () => {
    expect(
      getClientIp(headers({ 'x-forwarded-for': '203.0.113.7', 'x-real-ip': '192.0.2.1' }))
    ).toBe('203.0.113.7');
  });
});
