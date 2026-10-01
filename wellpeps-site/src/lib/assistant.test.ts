import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { ASSISTANT_DISCLOSURE, ASSISTANT_GREETING } from './assistant';

const root = resolve(__dirname, '../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

describe('assistant disclosure', () => {
  test('says it is automated, not a person or clinician, gives no medical advice, and points to 911', () => {
    expect(ASSISTANT_DISCLOSURE).toMatch(/automated assistant/i);
    expect(ASSISTANT_DISCLOSURE).toMatch(/not a person or a clinician/i);
    expect(ASSISTANT_DISCLOSURE).toMatch(/cannot give medical advice/i);
    expect(ASSISTANT_DISCLOSURE).toMatch(/patient portal/i);
    expect(ASSISTANT_DISCLOSURE).toMatch(/911/);
  });

  test('the greeting never presents the assistant as a person', () => {
    expect(ASSISTANT_GREETING).not.toMatch(/\b(nurse|doctor|clinician|human|real person)\b/i);
  });

  test('the chat window shows the disclosure first and keeps a notice visible while it is open', () => {
    const html = read('src/components/Assistant.astro');
    expect(html).toContain('ASSISTANT_DISCLOSURE');
    expect(html.indexOf('ASSISTANT_DISCLOSURE')).toBeLessThan(html.indexOf('ASSISTANT_GREETING}'));
    expect(html).toMatch(/Automated assistant/);
    expect(html).toMatch(/call 911/);
  });
});

describe('the claim that messages stay in the browser', () => {
  // The disclosure says nothing is sent or kept. These patterns are the ways code could send or keep a message.
  const NETWORK_OR_STORAGE = /\b(fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|document\.cookie)/;

  test('the assistant code makes no network call and writes no storage', () => {
    for (const f of ['src/lib/assistant.ts', 'src/components/Assistant.astro']) {
      const code = read(f);
      expect(NETWORK_OR_STORAGE.test(code), `${f} now sends or stores something: update the disclosure and the AI Use Disclosure first`).toBe(false);
    }
  });
});
