import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { LEGAL_DOCS, docDates } from './legal-docs';

/** "October 16, 2026" -> "2026-10-16" */
const iso = (human: string) => new Date(`${human} 12:00 UTC`).toISOString().slice(0, 10);

/** The day the document's text last changed, from git (undefined where git or history is unavailable). */
function lastChanged(id: string): string | undefined {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', `src/data/legal/${id}.json`], { cwd: resolve(__dirname, '../..'), encoding: 'utf8' }).trim();
    return out || undefined;
  } catch {
    return undefined;
  }
}

describe('released legal documents show Published and Last updated dates (owner, 2026-10-19)', () => {
  const released = LEGAL_DOCS.filter((d) => d.approved);

  test('every released document has both dates, and Last updated is never before Published', () => {
    for (const doc of released) {
      const { published, updated } = docDates(doc);
      expect(published, doc.id).toBeTruthy();
      expect(updated, doc.id).toBeTruthy();
      expect(iso(updated!) >= iso(published!), doc.id).toBe(true);
    }
  });

  test('Last updated is not older than the last change to the document text', () => {
    for (const doc of released) {
      const changed = lastChanged(doc.id);
      if (!changed) continue;
      // Edited the text? Set `updated` on the document in src/lib/legal-docs.ts to the day of the change.
      expect(iso(docDates(doc).updated!) >= changed, `${doc.id} changed ${changed}, shows ${docDates(doc).updated}`).toBe(true);
    }
  });
});
