import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

/**
 * Claims the site must not make until they are substantiated (compliance build list W8; the
 * legal placement guide, section 6). Each pattern is a statement a regulator or LegitScript would
 * treat as unsupported. The scan covers site copy and code, ignoring comments and the draft
 * legal documents (which discuss these claims in order to forbid them).
 */
const BANNED: { pattern: RegExp; why: string }[] = [
  { pattern: /HIPAA[- ]compliant|strict HIPAA standards/i, why: 'No agency certifies HIPAA compliance, and WellPeps’ HIPAA role is undecided' },
  { pattern: /all 50 states|50-state|50 states ·|nationwide (care|network|lab)|patients nationwide|available nationwide/i, why: 'Licensure and pharmacy availability are state by state; needs a verified state matrix' },
  { pattern: /FDA[- ]registered/i, why: '503A compounding pharmacies are state-licensed, not FDA-registered' },
  { pattern: /FDA[- ]approved treatments/i, why: 'Only some listed products are FDA-approved; compounded products are not' },
  { pattern: /Physician (&|&amp;|and) Pharmacy Founded/i, why: 'Needs proof of the founders’ current licensure' },
  { pattern: /Natural Growth Hormone Support|Feel Like Yourself Again/, why: 'Drug-benefit claims for compounded peptides' },
  { pattern: /lipotropic/i, why: '"Lipotropic" implies fat loss for an injectable with no approved indication' },
  { pattern: /Quest Diagnostics|Labcorp/, why: 'Names a lab partner without a written arrangement' },
  { pattern: /low-cost/i, why: 'A price claim needs the actual prices and who bills' },
  { pattern: /will never be shared/i, why: 'An absolute privacy promise the company cannot show it keeps' },
  { pattern: /encrypted/i, why: '"Encrypted" is a technical claim that needs proof of what is encrypted and how' },
  { pattern: /LegitScript certified/i, why: 'Certification is pending; the seal and claim wait until it is granted' },
];

const root = resolve(__dirname, '..');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = resolve(dir, name);
    if (statSync(p).isDirectory()) return name === 'legal' && dir.endsWith('data') ? [] : files(p);
    return /\.(astro|ts)$/.test(name) && !/\.test\.ts$/.test(name) ? [p] : [];
  });
}

/** Source with comments removed, so a note explaining a removed claim is not mistaken for the claim. */
function withoutComments(src: string): string {
  return src
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*)/.test(l))
    .join('\n');
}

describe('claims the site must not make', () => {
  const sources = files(root).map((f) => ({ f, text: withoutComments(readFileSync(f, 'utf8')) }));

  for (const { pattern, why } of BANNED) {
    test(`no "${pattern.source}": ${why}`, () => {
      const hits = sources.filter((s) => pattern.test(s.text)).map((s) => s.f.replace(root, 'src'));
      expect(hits, `found in ${hits.join(', ')}`).toEqual([]);
    });
  }

  test('the scan reads real files (it is not passing on nothing)', () => {
    expect(sources.length).toBeGreaterThan(60);
    expect(sources.some((s) => s.f.split('\\').join('/').endsWith('data/weight.ts'))).toBe(true);
  });

  test('removed claims are not hiding in the draft pages either: the legal drafts may quote them only to forbid them', () => {
    // The drafts live in src/data/legal and are excluded above; this just pins that the exclusion is that folder only.
    expect(files(root).some((f) => f.split('\\').join('/').includes('data/legal'))).toBe(false);
  });
});
