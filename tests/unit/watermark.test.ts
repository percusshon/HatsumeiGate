import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import {
  buildWatermarkText,
  isPdfMime,
  isWatermarkableImageMime,
  isWatermarkableMime,
  watermarkImage,
  watermarkPdf
} from '@/lib/storage/watermark';

describe('buildWatermarkText', () => {
  it('社名・閲覧者ID(8桁)・JST日時を含む', () => {
    const text = buildWatermarkText({
      companyName: '株式会社サンプル知財',
      companyAccountId: 'company-uuid-xyz',
      viewerId: 'abcdef1234567890',
      at: new Date('2026-06-03T08:40:00Z')
    });
    expect(text).toContain('株式会社サンプル知財');
    expect(text).toContain('abcdef12'); // 先頭8桁
    expect(text).not.toContain('abcdef123'); // 9桁目は含めない
    expect(text).toContain('JST');
    expect(text).toContain('2026-06-03');
  });

  it('社名が空なら企業IDで代替する', () => {
    const text = buildWatermarkText({
      companyName: '   ',
      companyAccountId: 'company-uuid-xyz',
      viewerId: 'abcdef1234567890'
    });
    expect(text).toContain('company-uuid-xyz');
  });
});

describe('MIME 判定', () => {
  it('画像 MIME を識別する', () => {
    expect(isWatermarkableImageMime('image/png')).toBe(true);
    expect(isWatermarkableImageMime('image/jpeg')).toBe(true);
    expect(isWatermarkableImageMime('image/gif')).toBe(false);
    expect(isWatermarkableImageMime('application/pdf')).toBe(false);
  });

  it('PDF MIME を識別する', () => {
    expect(isPdfMime('application/pdf')).toBe(true);
    expect(isPdfMime('image/png')).toBe(false);
  });

  it('透かし対象（画像 or PDF）を識別する', () => {
    expect(isWatermarkableMime('image/png')).toBe(true);
    expect(isWatermarkableMime('application/pdf')).toBe(true);
    expect(isWatermarkableMime('text/plain')).toBe(false);
    expect(isWatermarkableMime(null)).toBe(false);
  });
});

describe('watermarkImage', () => {
  it('PNG に透かしを焼き、PNG として出力する（寸法維持）', async () => {
    const base = await sharp({
      create: { width: 400, height: 300, channels: 3, background: '#ffffff' }
    })
      .png()
      .toBuffer();

    const out = await watermarkImage(base, '株式会社テスト ・ abcdef12 ・ 2026-06-03 17:40 JST');
    expect(out.contentType).toBe('image/png');
    expect(out.buffer.length).toBeGreaterThan(0);

    const meta = await sharp(out.buffer).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300);
  });

  it('JPEG 入力は JPEG として返す', async () => {
    const base = await sharp({
      create: { width: 200, height: 200, channels: 3, background: '#eeeeee' }
    })
      .jpeg()
      .toBuffer();
    const out = await watermarkImage(base, 'X ・ y ・ z');
    expect(out.contentType).toBe('image/jpeg');
  });
});

describe('watermarkPdf', () => {
  it('PDF に透かしを焼き、ページ数を維持する', async () => {
    const src = await PDFDocument.create();
    src.addPage([595, 842]);
    src.addPage([595, 842]);
    const srcBytes = await src.save();

    const out = await watermarkPdf(srcBytes, '株式会社テスト ・ abcdef12 ・ 2026-06-03 17:40 JST');
    expect(out.contentType).toBe('application/pdf');

    const reloaded = await PDFDocument.load(out.buffer);
    expect(reloaded.getPageCount()).toBe(2);
  });
});
