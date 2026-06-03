// 開示ファイルの表示時透かし（社名＋日時＋閲覧者ID）。
// Source of truth: docs/storage-policy-plan.md §10（将来拡張）/§11（未決事項）
//
// 方針:
// - level_2 以上で企業へ配信する画像・PDF に、配信の都度サーバー側で透かしを焼き込む。
// - 透かし内容は「社名 ・ 閲覧者ID(8桁) ・ 閲覧日時(JST)」。漏洩時の追跡を目的とする。
// - 日本語社名を確実に描画するため Noto Sans JP を同梱し、PDF は fontkit で埋め込み、
//   画像は SVG に base64 で埋め込んで librsvg に描画させる（システムフォント非依存）。
//
// 注意: 透かしは抑止・追跡目的であり、画面キャプチャ等を完全に防ぐものではない。

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { PDFDocument, degrees, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const FONT_PATH = path.join(process.cwd(), 'assets', 'fonts', 'NotoSansJP-VF.ttf');

let fontBytesCache: Buffer | null = null;
function getFontBytes(): Buffer {
  if (!fontBytesCache) {
    fontBytesCache = fs.readFileSync(FONT_PATH);
  }
  return fontBytesCache;
}

let fontBase64Cache: string | null = null;
function getFontBase64(): string {
  if (!fontBase64Cache) {
    fontBase64Cache = getFontBytes().toString('base64');
  }
  return fontBase64Cache;
}

// 透かしを焼き込める画像 MIME か。
export function isWatermarkableImageMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  return /^image\/(png|jpe?g|webp|tiff)$/i.test(mime.trim());
}

// PDF か。
export function isPdfMime(mime: string | null | undefined): boolean {
  return !!mime && /^application\/pdf$/i.test(mime.trim());
}

export function isWatermarkableMime(mime: string | null | undefined): boolean {
  return isWatermarkableImageMime(mime) || isPdfMime(mime);
}

export type WatermarkContext = {
  companyName: string | null | undefined;
  companyAccountId: string;
  viewerId: string;
  at?: Date;
};

// JST の "YYYY-MM-DD HH:MM JST" を返す。
function formatJst(d: Date): string {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')} JST`;
}

// 透かし1行テキストを組み立てる。社名が空なら企業IDで代替。
export function buildWatermarkText(ctx: WatermarkContext): string {
  const at = ctx.at ?? new Date();
  const name = ctx.companyName && ctx.companyName.trim() ? ctx.companyName.trim() : ctx.companyAccountId;
  const viewer = (ctx.viewerId || '').slice(0, 8);
  return `${name} ・ ${viewer} ・ ${formatJst(at)}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export type WatermarkedFile = { buffer: Buffer; contentType: string };

// 画像にタイル状の斜め透かしを焼き込む。元の画像形式を維持する。
export async function watermarkImage(
  input: Buffer,
  text: string
): Promise<WatermarkedFile> {
  const image = sharp(input, { failOn: 'none' });
  const meta = await image.metadata();
  const width = Math.max(1, meta.width ?? 1000);
  const height = Math.max(1, meta.height ?? 1000);

  const fontSize = Math.max(14, Math.round(Math.min(width, height) / 28));
  const esc = escapeXml(text);
  const tileW = Math.max(320, Math.round(esc.length * fontSize * 0.62) + 120);
  const tileH = Math.max(160, fontSize * 8);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <style>
      @font-face { font-family: 'WmJP'; src: url('data:font/ttf;base64,${getFontBase64()}') format('truetype'); }
      .wm { font-family: 'WmJP', sans-serif; font-size: ${fontSize}px; fill: #777777; fill-opacity: 0.28; }
    </style>
    <pattern id="wmpat" width="${tileW}" height="${tileH}" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
      <text x="0" y="${Math.round(tileH / 2)}" class="wm">${esc}</text>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#wmpat)"/>
</svg>`;

  const composited = image.composite([{ input: Buffer.from(svg), blend: 'over' }]);

  const fmt = (meta.format ?? '').toLowerCase();
  if (fmt === 'jpeg' || fmt === 'jpg') {
    return { buffer: await composited.jpeg().toBuffer(), contentType: 'image/jpeg' };
  }
  if (fmt === 'webp') {
    return { buffer: await composited.webp().toBuffer(), contentType: 'image/webp' };
  }
  if (fmt === 'tiff') {
    return { buffer: await composited.tiff().toBuffer(), contentType: 'image/tiff' };
  }
  return { buffer: await composited.png().toBuffer(), contentType: 'image/png' };
}

// PDF 各ページに斜めの透かしをタイル状に描画する。
export async function watermarkPdf(input: Uint8Array, text: string): Promise<WatermarkedFile> {
  const pdf = await PDFDocument.load(input, { ignoreEncryption: true });
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(getFontBytes(), { subset: true });

  const fontSize = 16;
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const stepX = Math.max(220, textWidth + 140);
  const stepY = 150;

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    for (let y = -Math.round(height * 0.5); y < height * 1.5; y += stepY) {
      for (let x = -Math.round(width * 0.5); x < width * 1.5; x += stepX) {
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.5, 0.5, 0.5),
          opacity: 0.18,
          rotate: degrees(30)
        });
      }
    }
  }

  const bytes = await pdf.save();
  return { buffer: Buffer.from(bytes), contentType: 'application/pdf' };
}
