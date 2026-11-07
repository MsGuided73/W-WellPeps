import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MD_REVIEWED_LABEL, sealMarkup } from './md-seal';

describe('MD Reviewed seal', () => {
  const inline = sealMarkup(22);

  it('is decorative inline: hidden from screen readers, no title, no duplicate ids', () => {
    expect(inline).toContain('aria-hidden="true"');
    expect(inline).not.toContain('<title');
    expect(inline).not.toContain('role="img"');
    expect(inline).not.toMatch(/\sid="/);
  });

  it('draws at the requested size with the class the styles target', () => {
    expect(inline).toContain('width="22" height="22" class="md-seal"');
    expect(sealMarkup(56, 'md-seal review-note__seal')).toContain('width="56" height="56" class="md-seal review-note__seal"');
  });

  it('keeps an accessible title in the standalone file', () => {
    const file = readFileSync(resolve(__dirname, '../assets/badges/md-reviewed-seal.svg'), 'utf8');
    expect(file).toMatch(/<title id="md-seal-title">Medically reviewed by a physician \(MD\)<\/title>/);
    expect(file).toContain('role="img"');
  });

  it('is always paired with a text label', () => {
    expect(MD_REVIEWED_LABEL).toBe('MD Reviewed');
  });
});
