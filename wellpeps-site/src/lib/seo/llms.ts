/**
 * /llms.txt (llmstxt.org): a plain-language summary of WellPeps for AI assistants and AI search tools, so
 * they answer from current facts rather than an old copy of the site. Built at each build from the same
 * data the pages render (catalog.ts, plan.ts, states.ts, the legal registry and the Learning Center), so
 * it cannot drift from the site. Wording reuses approved site copy; claims.test.ts scans this file too.
 */
import { CONTACT, LEGITSCRIPT } from '../../config';
import { journeySteps } from '../../data/content';
import { planFinePrint } from '../../data/plan';
import { STATE_NOTES } from '../../data/states';
import { LEGAL_DOCS } from '../legal-docs';
import { PROGRAMS, startingPrice, type ProgramEntry } from './catalog';
import { SITE_URL, canonicalUrl } from './site';

export interface LlmsArticle {
  title: string;
  path: string;
  category: string;
}

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

function programSection(p: ProgramEntry): string {
  const lines = [`### [${p.name}](${canonicalUrl(p.path)})`, '', p.summary, ''];
  if (!p.live) return [...lines, 'Coming soon: no treatments are offered yet.', ''].join('\n');
  const from = startingPrice(p);
  if (from !== undefined) lines.push(`Monthly prices start at ${money(from)}. Prescription required for every treatment.`, '');
  for (const t of p.treatments) {
    const price = t.monthlyPrice !== undefined ? `${money(t.monthlyPrice)}/month` : 'price being set';
    lines.push(`- ${t.name} (${t.form}): ${price}${t.availability ? `. ${t.availability}` : ''}`);
  }
  return [...lines, ''].join('\n');
}

export function buildLlmsTxt(articles: readonly LlmsArticle[], builtOn: Date): string {
  const released = LEGAL_DOCS.filter((d) => d.approved);
  const out = [
    '# WellPeps',
    '',
    '> WellPeps is a U.S. telehealth wellness company offering provider-guided care for weight management, hair ' +
      'restoration, sexual wellness and healthy aging. Every treatment has one monthly price that includes the licensed ' +
      'clinician’s review, follow-up care, the medication if prescribed, and standard shipping. Patients pay for the first ' +
      'month at checkout, and WellPeps refunds that payment in full if a clinician does not prescribe treatment.',
    '',
    `Facts below are generated from the live site at each update (last built ${builtOn.toISOString().slice(0, 10)}). ` +
      'When anything here differs from an older copy of the site, this file and the live pages are current.',
    '',
    '## Who WellPeps is',
    '',
    '- WellPeps, a Wyoming corporation, offers education, enrollment and customer support for telehealth care.',
    '- WellPeps is not a medical practice or a pharmacy and does not diagnose, prescribe, compound or dispense.',
    '- Care is provided by independent licensed clinicians, who decide whether a prescription is appropriate. A prescription is not guaranteed.',
    '- Prescriptions are filled and shipped by state-licensed pharmacies.',
    '- Compounded medications are not FDA-approved and have not been evaluated by FDA for safety, effectiveness or quality.',
    `- WellPeps is LegitScript certified. LegitScript certification shows that WellPeps meets LegitScript’s standards, which help ensure transparency and compliance with applicable laws and regulations. Verify: ${LEGITSCRIPT.verifyUrl}`,
    '',
    '## How it works',
    '',
    ...journeySteps.map((s) => `${s.n}. ${s.title}: ${s.body}`),
    '',
    '## Pricing and billing',
    '',
    planFinePrint,
    '',
    `Details: [Your Plan](${canonicalUrl('/your-plan/')})`,
    '',
    '## Programs and prices',
    '',
    ...PROGRAMS.map(programSection),
    `### [Hormone Optimization](${canonicalUrl('/hormone-optimization/')})`,
    '',
    'Coming soon: no treatments are offered yet.',
    '',
    '## Where care is available',
    '',
    'Care is available to patients located in all 50 U.S. states. Some medications and rules vary by state:',
    '',
    ...STATE_NOTES.map((n) => `- ${n.states}: ${n.note}`),
    '',
    `Full list: [States We Serve](${canonicalUrl('/states-we-serve/')})`,
    '',
    '## Key pages',
    '',
    `- [Home](${SITE_URL}/)`,
    `- [Why WellPeps](${canonicalUrl('/why-wellpeps/')})`,
    `- [Your Plan: what is included and how to cancel](${canonicalUrl('/your-plan/')})`,
    `- [Wellness Learning Center](${canonicalUrl('/wellness-learning-center/')})`,
    `- [Patient Information](${canonicalUrl('/patient-information/')})`,
    `- [Contact WellPeps](${canonicalUrl('/contact/')})`,
    '',
    '## Policies',
    '',
    ...released.map((d) => `- [${d.title}](${canonicalUrl(`/${d.path}/`)}): ${d.blurb}`),
    '',
  ];
  if (articles.length) {
    out.push('## Wellness Learning Center articles', '');
    for (const a of articles) out.push(`- [${a.title}](${canonicalUrl(a.path)}) (${a.category})`);
    out.push('');
  }
  out.push(
    '## Contact',
    '',
    `- Email: ${CONTACT.email}`,
    `- Phone: ${CONTACT.phone}`,
    '- This site is for general information and is not medical advice. In an emergency, call 911.',
    '',
  );
  return out.join('\n');
}
