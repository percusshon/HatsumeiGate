import { describe, it, expect } from 'vitest';
import {
  isFileDisclosableToCompany,
  fileVisibilityForLevel,
  sanitizeFilename,
  buildInventionFileStoragePath
} from '@/lib/storage/invention-files';

describe('isFileDisclosableToCompany', () => {
  it('承認レベルが NDA 未満（level_0/1）なら常に不可', () => {
    expect(isFileDisclosableToCompany('nda_summary', 'level_2_nda_summary', 'level_1_company_teaser')).toBe(false);
    expect(isFileDisclosableToCompany('teaser', 'level_1_company_teaser', 'level_1_company_teaser')).toBe(false);
  });

  it('none / internal_only / 未設定の可視性は配信不可', () => {
    expect(isFileDisclosableToCompany('none', 'level_2_nda_summary', 'level_3_nda_detail')).toBe(false);
    expect(isFileDisclosableToCompany('internal_only', 'level_2_nda_summary', 'level_3_nda_detail')).toBe(false);
    expect(isFileDisclosableToCompany(null, 'level_2_nda_summary', 'level_3_nda_detail')).toBe(false);
  });

  it('要求レベル <= 承認レベル かつ可視性ありで配信可', () => {
    expect(isFileDisclosableToCompany('nda_summary', 'level_2_nda_summary', 'level_2_nda_summary')).toBe(true);
    expect(isFileDisclosableToCompany('nda_detail', 'level_3_nda_detail', 'level_4_negotiation_package')).toBe(true);
  });

  it('要求レベルが承認レベルを超えると不可', () => {
    expect(isFileDisclosableToCompany('nda_detail', 'level_3_nda_detail', 'level_2_nda_summary')).toBe(false);
  });
});

describe('fileVisibilityForLevel', () => {
  it('開示レベルから可視性を一意に導出する', () => {
    expect(fileVisibilityForLevel('level_0_internal_only')).toBe('internal_only');
    expect(fileVisibilityForLevel('level_1_company_teaser')).toBe('teaser');
    expect(fileVisibilityForLevel('level_2_nda_summary')).toBe('nda_summary');
    expect(fileVisibilityForLevel('level_3_nda_detail')).toBe('nda_detail');
    expect(fileVisibilityForLevel('level_4_negotiation_package')).toBe('negotiation_package');
  });
});

describe('sanitizeFilename', () => {
  it('パス区切り・記号を除去し、日本語は維持する', () => {
    expect(sanitizeFilename('../../etc/passwd')).not.toContain('/');
    expect(sanitizeFilename('図面 v1.png')).toMatch(/図面.*v1\.png/);
  });

  it('空入力は file になる', () => {
    expect(sanitizeFilename('')).toBe('file');
  });

  it('長すぎる名前は 120 文字に制限する', () => {
    expect(sanitizeFilename('a'.repeat(300)).length).toBeLessThanOrEqual(120);
  });
});

describe('buildInventionFileStoragePath', () => {
  it('{invention}/{uuid}/{safe} の規約で組み立てる', () => {
    const p = buildInventionFileStoragePath('inv-1', 'uuid-2', 'My File.pdf');
    expect(p.startsWith('inv-1/uuid-2/')).toBe(true);
    expect(p).not.toContain(' ');
  });
});
