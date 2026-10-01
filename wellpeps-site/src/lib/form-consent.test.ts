import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { FORM_CONSENT_VERSION, consentFields, formConsentText, topicLabel } from './form-consent';
import { submitSignup } from './notify';
import { EBOOKS } from '../data/ebooks';

describe('consent wording', () => {
  const text = formConsentText('GLP-1 Weight Loss.', 'privacy@wellpeps.com');

  test('the required box names what is saved, the topic and the purpose', () => {
    expect(text.collect).toContain('my email address');
    expect(text.collect).toContain('my interest in GLP-1 Weight Loss');
    expect(text.collect).toContain('so WellPeps can send me what I asked for');
  });

  test('a guide form names its own guide in both boxes', () => {
    for (const book of EBOOKS) {
      const g = formConsentText(book.title, 'privacy@wellpeps.com', { forGuide: true });
      const guide = `the Smart Patient’s Guide to ${book.title}`;
      expect(g.collect, book.slug).toBe(`I agree that WellPeps may save my email address and my interest in ${book.title} so WellPeps can send me ${guide}.`);
      expect(g.marketing, book.slug).toContain(`I understand that I do not need to select this option in order to receive ${guide}.`);
    }
  });

  test('a form that is not for a guide keeps the general words', () => {
    expect(text.marketing).toContain('I understand that I do not need to select this option in order to receive what I asked for.');
    expect(text.collect).not.toContain('Smart Patient');
    expect(text.marketing).not.toContain('Smart Patient');
  });

  test('a form with no name field does not mention a first name', () => {
    expect(text.collect).not.toMatch(/first name/i);
    expect(text.marketing).not.toMatch(/first name/i);
    expect(text.withdraw).not.toMatch(/first name/i);
  });

  test('a form that asks for a first name says so in the required box only', () => {
    const named = formConsentText('Hormone Optimization', 'privacy@wellpeps.com', { withFirstName: true });
    expect(named.collect).toContain('my email address, first name and my interest in Hormone Optimization');
    expect(named.marketing).not.toMatch(/first name/i);
  });

  test('the optional box is clearly optional and says it is not needed to receive what was asked for', () => {
    expect(text.marketing.startsWith('Optional:')).toBe(true);
    expect(text.marketing).toContain('emails from WellPeps about GLP-1 Weight Loss and related wellness tips');
    expect(text.marketing).toContain('I do not need to select this option in order to receive');
  });

  test('the withdrawal sentence covers both consents and gives the email', () => {
    expect(text.withdraw).toContain('withdraw either consent at any time in Your Privacy Choices or by emailing privacy@wellpeps.com');
  });

  test('the two consents are separate sentences, not one bundled agreement', () => {
    expect(text.collect).not.toContain('wellness tips');
    expect(text.collect).not.toContain('emails from WellPeps');
    expect(text.marketing).not.toContain('save my email');
    expect(text.marketing).not.toContain('may save');
  });

  test('each box stays a reasonable length for every real topic, in every form variant', () => {
    for (const topic of [...EBOOKS.map((b) => b.title), 'Hormone Optimization', 'hair restoration']) {
      for (const withFirstName of [false, true]) {
        for (const forGuide of [false, true]) {
          const t = formConsentText(topic, 'privacy@wellpeps.com', { withFirstName, forGuide });
          expect(t.collect.length, `${topic} collect`).toBeLessThan(200);
          expect(t.marketing.length, `${topic} marketing`).toBeLessThan(270);
        }
      }
    }
  });

  test('no draft placeholder is left in the text', () => {
    expect(text.collect + text.marketing + text.withdraw).not.toMatch(/\[[A-Z ]+\]/);
  });

  test('a topic is tidied for use inside a sentence', () => {
    expect(topicLabel('  Hormone   Optimization. ')).toBe('Hormone Optimization');
    expect(topicLabel('hair restoration')).toBe('hair restoration');
  });
});

describe('what is sent with a signup', () => {
  test('the optional consent counts only when the required one is also given', () => {
    expect(consentFields({ collect: true, marketing: true })).toEqual({ consent_collect: true, consent_marketing: true, consent_text_version: FORM_CONSENT_VERSION });
    expect(consentFields({ collect: true, marketing: false }).consent_marketing).toBe(false);
    expect(consentFields({ collect: false, marketing: true }).consent_marketing).toBe(false);
    expect(consentFields({ collect: false, marketing: false }).consent_collect).toBe(false);
  });

  test('the wording version says draft until counsel approves it', () => {
    expect(FORM_CONSENT_VERSION).toMatch(/draft/);
  });
});

describe('submitSignup carries the consent', () => {
  const sent: any[] = [];
  const fakeFetch = (async (_url: string, init: RequestInit) => {
    sent.push(JSON.parse(String(init.body)));
    return { ok: true } as Response;
  }) as unknown as typeof fetch;

  test('sends the consent fields when given, and none when not', async () => {
    const real = globalThis.fetch;
    globalThis.fetch = fakeFetch;
    try {
      await submitSignup({ email: 'a@b.co', source: 'waitlist', consent: { collect: true, marketing: false } });
      await submitSignup({ email: 'a@b.co', source: 'footer_newsletter' });
    } finally {
      globalThis.fetch = real;
    }
    expect(sent[0]).toMatchObject({ email: 'a@b.co', source: 'waitlist', consent_collect: true, consent_marketing: false, consent_text_version: FORM_CONSENT_VERSION });
    expect(sent[1]).not.toHaveProperty('consent_collect');
  });
});

describe('every health-topic form asks for it', () => {
  const root = resolve(__dirname, '../..');
  const read = (p: string) => readFileSync(resolve(root, p), 'utf8');
  for (const f of ['src/components/EbookOffer.astro', 'src/components/sections/WaitlistSection.astro', 'src/components/sections/hair/HairComingSoon.astro']) {
    test(`${f.split('/').pop()} uses the consent component and sends the choice`, () => {
      const src = read(f);
      expect(src).toContain('FormConsent');
      expect(src).toMatch(/consent:/);
    });
  }

  test('the withdrawal sentence is shown and tied to both boxes', () => {
    const src = read('src/components/legal/FormConsent.astro');
    expect(src).toContain('{text.withdraw}');
    expect(src.match(/aria-describedby=\{`\$\{idPrefix\}-fine`\}/g)).toHaveLength(2);
  });

  test('only the guide dialog names a guide, on first load and when it changes topic', () => {
    const src = read('src/components/EbookOffer.astro');
    expect(src).toMatch(/<FormConsent[^>]*forGuide/);
    expect(src).toContain('{ forGuide: true }');
    expect(read('src/components/sections/WaitlistSection.astro')).not.toContain('forGuide');
    expect(read('src/components/sections/hair/HairComingSoon.astro')).not.toContain('forGuide');
  });

  test('only the form that has a first-name field says so in its consent', () => {
    expect(read('src/components/sections/WaitlistSection.astro')).toMatch(/<FormConsent[^>]*withFirstName/);
    expect(read('src/components/EbookOffer.astro')).not.toContain('withFirstName');
    expect(read('src/components/sections/hair/HairComingSoon.astro')).not.toContain('withFirstName');
  });

  test('the required box is a real required checkbox and the optional one is not pre-checked', () => {
    const src = read('src/components/legal/FormConsent.astro');
    expect(src).toMatch(/name="consentCollect"[^>]*required/);
    expect(src).not.toMatch(/name="consentMarketing"[^>]*\bchecked\b/);
  });
});
