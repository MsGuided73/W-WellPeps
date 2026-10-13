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
  // "all 50 states" is allowed since 2026-10-02: LegitScript certified the provider network (OSI) for all 50 states, and the
  // platform tells a patient at checkout when a medication cannot ship to their state (client-verified). Unqualified
  // nationwide-network and lab claims stay banned.
  { pattern: /50-state|50 states ·|nationwide (care|network|lab)|patients nationwide|available nationwide/i, why: 'Medication and lab availability are state by state; say which states, and that some medications vary' },
  { pattern: /FDA[- ]registered/i, why: '503A compounding pharmacies are state-licensed, not FDA-registered' },
  { pattern: /FDA[- ]approved treatments/i, why: 'Only some listed products are FDA-approved; compounded products are not' },
  // Caught in a search description on 2026-10-11 ("Advanced, FDA-approved hair restoration treatments"): any "FDA-approved"
  // label in front of a group of treatments, therapies or options.
  { pattern: /FDA[- ]approved\s+(hair|weight|ed|erectile|sexual|peptide|wellness|healthy aging|anti-aging)[\w &-]{0,25}(treatments|therapies|options|programs)/i, why: 'Some treatments in every program are compounded, which FDA has not approved' },
  { pattern: /Physician (&|&amp;|and) Pharmacy Founded/i, why: 'Needs proof of the founders’ current licensure' },
  { pattern: /Natural Growth Hormone Support|Feel Like Yourself Again/, why: 'Drug-benefit claims for compounded peptides' },
  { pattern: /lipotropic/i, why: '"Lipotropic" implies fat loss for an injectable with no approved indication' },
  { pattern: /Quest Diagnostics|Labcorp/, why: 'Names a lab partner without a written arrangement' },
  { pattern: /low-cost/i, why: 'A price claim needs the actual prices and who bills' },
  { pattern: /will never be shared/i, why: 'An absolute privacy promise the company cannot show it keeps' },
  { pattern: /encrypted/i, why: '"Encrypted" is a technical claim that needs proof of what is encrypted and how' },
  // "LegitScript certified" is allowed since 2026-10-09 (certification granted). LegitScript's language guide still
  // forbids implying endorsement or quality, or that uncertified competitors are improper.
  { pattern: /(endorsed|recommended|backed|vetted) by LegitScript|LegitScript[- ](endorsed|approved (products|treatments|medications|quality))|LegitScript guarantees/i, why: 'LegitScript certification does not imply endorsement of products or services, or their quality (LegitScript language guide)' },
  // Decided 2026-10-05: the clinician review is included in the one monthly price, so it is never "free". Only the
  // automated online questions could be called free, and the site prefers not to use the word for them at all.
  { pattern: /free\s+(online\s+)?(health\s+|personalized\s+)?(assessment|consult|evaluation|clinician|provider|doctor|review)|no charge for the assessment|(assessment|consultation) (is|are) free/i, why: 'The clinician review is part of the monthly price; never call the assessment, consultation or review free (FTC Guide, 16 CFR 251.1)' },
  // Decided 2026-10-06: there is no membership fee (not even as "no membership fee").
  // Decided 2026-10-12 (Intake-first): the patient pays the first month at checkout, before the clinician review, and
  // is refunded in full if not prescribed. The 2026-10-06 to 2026-10-12 promise ("pay only if prescribed", "you never
  // pay", "no payment is needed to start") is no longer true and must not come back until GEN Health's checkout supports
  // a $0.00 assessment or credits the assessment price against the product.
  { pattern: /member(ship)?\s+fee|membership (of|for) \$|\$\d+\s*(\/|a|per)?\s*month(ly)? membership/i, why: 'There is no membership fee; do not mention one, even to deny it' },
  { pattern: /pay today|pay now/i, why: 'No urgency language around payment' },
  { pattern: /pay(s|ing)? only (if|after|when|once)[^.]{0,40}(prescri|approv)|pay nothing unless|never pay|(charged|billed) only (if|when|after|once)[^.]{0,40}(prescri|approv)|not (be )?charged (unless|until)|no payment is needed|checkout is offered only/i, why: 'Intake-first (2026-10-12): the patient pays at checkout, before the clinician review, and is refunded in full if not prescribed' },
  { pattern: /(start|take)( your| our)? free (health |online )?assessment/i, why: 'Only the automated online questions may be called free, and the button says "See If You Qualify"' },
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

  test('released legal documents never mention a membership (dropped 2026-09-30; an AI audit still quoted it on 2026-10-11)', () => {
    const legal = resolve(root, 'data/legal');
    const hits = readdirSync(legal).filter((n) => n.endsWith('.json') && /membership/i.test(readFileSync(resolve(legal, n), 'utf8')));
    expect(hits).toEqual([]);
  });

  test('released legal documents do not promise payment only after a prescription (Intake-first since 2026-10-12)', () => {
    const legal = resolve(root, 'data/legal');
    const stale = /you never pay|pay(s)? only after (my|your|a|the) clinician|charged only (if|when) (a|your) clinician prescribes|checkout is offered only|you are not charged at all|nothing to refund/i;
    const hits = readdirSync(legal).filter((n) => n.endsWith('.json') && stale.test(readFileSync(resolve(legal, n), 'utf8')));
    expect(hits).toEqual([]);
  });

  test('removed claims are not hiding in the draft pages either: the legal drafts may quote them only to forbid them', () => {
    // The drafts live in src/data/legal and are excluded above; this just pins that the exclusion is that folder only.
    expect(files(root).some((f) => f.split('\\').join('/').includes('data/legal'))).toBe(false);
  });
});
