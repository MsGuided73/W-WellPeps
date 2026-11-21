import { describe, expect, test } from 'vitest';
import { PEPTIDES_PAGE_UPDATED } from './peptides';

describe('Peptide Therapy page last-modified date', () => {
  test('is a real YYYY-MM-DD date, not in the future', () => {
    expect(PEPTIDES_PAGE_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const date = Date.parse(`${PEPTIDES_PAGE_UPDATED}T12:00:00Z`);
    expect(Number.isNaN(date)).toBe(false);
    expect(date).toBeLessThanOrEqual(Date.now() + 24 * 60 * 60 * 1000);
  });
});
