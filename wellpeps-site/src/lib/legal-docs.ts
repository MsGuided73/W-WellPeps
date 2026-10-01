/**
 * Registry of the legal and patient-information documents shown on the site, and
 * the switch that decides whether their DRAFT pages exist at all.
 *
 * The documents are the v0.1 drafts counsel is reviewing, converted to JSON in
 * src/data/legal/<id>.json (docs/Legal Docs/_build/export_site_content.py). They are
 * not approved text. So every page here is built only when draft pages are enabled:
 *   - always under `npm run dev`;
 *   - in a build only when the build variable SHOW_DRAFT_PAGES is "true" (set it on
 *     the client-preview deployment so the attorney can review the documents in the
 *     site; leave it unset on the live site so none of these pages exist there).
 * Footer links to these pages are hidden whenever the pages are not built, so a visitor
 * never meets a dead link.
 *
 * To publish a document once counsel approves it: set `approved: true` on its entry and
 * replace its JSON with the approved text. An approved document is built in every
 * deployment and its draft banner disappears.
 */

export type DocGroup = 'site' | 'patient' | 'checkout';

export interface LegalDoc {
  /** Draft id from the document index (A1..A17, B1..B8). */
  id: string;
  /** Where the page lives, without a leading slash. */
  path: string;
  /** Page heading. */
  title: string;
  /** Short text for links (footer, lists). */
  label: string;
  group: DocGroup;
  /** One line saying what the document is for. */
  blurb: string;
  /** The live page that already exists for this subject, if any (its text is not replaced by the draft). */
  existing?: string;
  /** True only after counsel has approved the text. */
  approved?: boolean;
}

export const LEGAL_DOCS: readonly LegalDoc[] = [
  { id: 'A1', path: 'legal-review/terms-of-use', title: 'Website Terms of Use', label: 'Terms of Use', group: 'site', existing: '/terms-of-use',
    blurb: 'The rules for using wellpeps.com: informational site, no medical advice, individual arbitration.' },
  { id: 'A2', path: 'legal-review/privacy-policy', title: 'Privacy Policy', label: 'Privacy Policy', group: 'site', existing: '/privacy-policy',
    blurb: 'What the site collects, why, who receives it and how to exercise privacy rights.' },
  { id: 'A3', path: 'consumer-health-data-privacy-policy', title: 'Consumer Health Data Privacy Policy', label: 'Consumer Health Data Privacy Policy', group: 'site',
    blurb: 'Stand-alone policy for health-related data outside HIPAA (required in Washington and Nevada).' },
  { id: 'A4', path: 'cookie-notice', title: 'Cookie and Tracking Technologies Notice', label: 'Cookie Notice', group: 'site',
    blurb: 'What the site stores and loads, and the consent-first rule for any analytics or advertising.' },
  { id: 'A5', path: 'legal-review/your-privacy-choices', title: 'Your Privacy Choices', label: 'Your Privacy Choices', group: 'site', existing: '/your-privacy-choices',
    blurb: 'How to opt out, limit use, withdraw consent and make a request; how Global Privacy Control is honored.' },
  { id: 'A6', path: 'legal-review/notice-of-privacy-practices', title: 'Notice of Privacy Practices', label: 'Notice of Privacy Practices', group: 'site', existing: '/notice-of-privacy-practices',
    blurb: 'The HIPAA notice of how medical information is used and disclosed, and the patient’s rights.' },
  { id: 'A7', path: 'legal-review/accessibility-statement', title: 'Accessibility Statement', label: 'Accessibility', group: 'site', existing: '/accessibility',
    blurb: 'The commitment to accessibility and how to get help.' },
  { id: 'A8', path: 'medical-disclaimer', title: 'Medical Disclaimer and Site-Wide Disclosures', label: 'Medical Disclaimer', group: 'patient',
    blurb: 'The approved disclosure copy blocks: medical disclaimer, compounded-medication statement, prescription-required lines.' },
  { id: 'A9', path: 'shipping-and-delivery', title: 'Shipping and Delivery Policy', label: 'Shipping & Delivery', group: 'patient',
    blurb: 'How medications ship, delivery timing, delays and what to do about a problem.' },
  { id: 'A10', path: 'refund-and-cancellation', title: 'Refund, Cancellation and Auto-Renewal Policy', label: 'Refund & Cancellation', group: 'patient',
    blurb: 'How plans renew, how to cancel, and when a refund is due.' },
  { id: 'A11', path: 'text-messaging-terms', title: 'Text Messaging Terms', label: 'Text Messaging Terms', group: 'site',
    blurb: 'Consent, frequency, STOP and HELP for text messages.' },
  { id: 'A12', path: 'ai-use-disclosure', title: 'AI Use Disclosure', label: 'AI Use Disclosure', group: 'site',
    blurb: 'What the site assistant is, what it can and cannot do, and what is done with chats.' },
  { id: 'A13', path: 'how-wellpeps-works', title: 'How WellPeps Works and Our Financial Relationships', label: 'How WellPeps Works', group: 'patient',
    blurb: 'Who does what (WellPeps, the medical practice, the pharmacy) and who is paid for what.' },
  { id: 'A14', path: 'safety/glp-1', title: 'GLP-1 Medication Safety Information', label: 'GLP-1 Safety Information', group: 'patient',
    blurb: 'Important safety information for GLP-1 weight-management medications.' },
  { id: 'A15', path: 'safety/sexual-health', title: 'Sexual Health Medication Safety Information', label: 'Sexual Health Safety Information', group: 'patient',
    blurb: 'Important safety information for sexual-health medications.' },
  { id: 'A16', path: 'safety/hair-loss', title: 'Hair Loss Medication Safety Information', label: 'Hair Loss Safety Information', group: 'patient',
    blurb: 'Important safety information for hair-loss medications.' },
  { id: 'A17', path: 'safety/healthy-aging', title: 'Healthy Aging and Vitality Medication Safety Information', label: 'Healthy Aging Safety Information', group: 'patient',
    blurb: 'Important safety information for healthy-aging and vitality products.' },
  { id: 'B1', path: 'legal-review/electronic-records-consent', title: 'Electronic Records, Signatures and Communications Consent', label: 'Electronic Records Consent', group: 'checkout',
    blurb: 'Agreeing to sign and receive documents electronically (first screen of checkout).' },
  { id: 'B2', path: 'patient-terms', title: 'Patient Terms of Service and Payment Agreement', label: 'Patient Terms', group: 'patient',
    blurb: 'The contract for patients: services, payment, auto-renewal consent and disputes.' },
  { id: 'B3', path: 'legal-review/patient-intake-attestations', title: 'Patient Intake Attestations', label: 'Intake Attestations', group: 'checkout',
    blurb: 'Statements the patient confirms at intake, by program.' },
  { id: 'B4', path: 'telehealth-consent', title: 'Informed Consent to Telehealth Services and Treatment', label: 'Telehealth Consent', group: 'patient',
    blurb: 'Informed consent to receive care by telehealth.' },
  { id: 'B5', path: 'compounded-medications', title: 'What Compounded Medications Mean', label: 'Compounded Medications', group: 'patient',
    blurb: 'What compounded means, that it is not FDA-approved, and the patient’s consent.' },
  { id: 'B6', path: 'legal-review/laboratory-testing-consent', title: 'Laboratory Testing Consent', label: 'Laboratory Testing Consent', group: 'checkout',
    blurb: 'Consent for lab tests when a program requires them.' },
  { id: 'B7', path: 'legal-review/hipaa-authorization-forms', title: 'HIPAA Authorization Forms', label: 'HIPAA Authorization Forms', group: 'checkout',
    blurb: 'Authorizations to use or share health information beyond treatment and payment.' },
  { id: 'B8', path: 'patient-rights', title: 'Patient Rights and Records Requests', label: 'Patient Rights', group: 'patient',
    blurb: 'How patients see, correct and receive their records, and other individual rights.' },
];

/** Pages that are not a converted document but are still held back with the drafts. */
export interface CustomPage { kind: 'hub' | 'contact' | 'states' | 'review'; path: string; title: string; label: string }
export const CUSTOM_PAGES: readonly CustomPage[] = [
  { kind: 'hub', path: 'patient-information', title: 'Patient Information', label: 'All Patient Information' },
  { kind: 'contact', path: 'contact', title: 'Contact WellPeps', label: 'Contact Us' },
  { kind: 'states', path: 'states-we-serve', title: 'States We Serve', label: 'States We Serve' },
  { kind: 'review', path: 'legal-review', title: 'Draft documents for review', label: 'Draft documents' },
];

export interface DraftEnv {
  /** True under `astro dev`. */
  dev?: boolean;
  /** The SHOW_DRAFT_PAGES build variable. Astro turns "true" into a real boolean, so accept both. */
  flag?: string | boolean | undefined;
}

/** Whether draft pages exist in this build. */
export function draftPagesEnabled(env: DraftEnv): boolean {
  return env.dev === true || env.flag === true || /^(true|1|yes)$/i.test(String(env.flag ?? '').trim());
}

/** Reads the switch from the build environment (works in Astro frontmatter and in Node). */
export function draftPagesEnabledNow(): boolean {
  const flag = (import.meta.env?.SHOW_DRAFT_PAGES as string | boolean | undefined) ?? (typeof process !== 'undefined' ? process.env.SHOW_DRAFT_PAGES : undefined);
  return draftPagesEnabled({ dev: import.meta.env?.DEV === true, flag });
}

export const docUrl = (d: LegalDoc) => `/${d.path}`;

export function findDoc(path: string): LegalDoc | undefined {
  return LEGAL_DOCS.find((d) => d.path === path);
}

/** Every path that is held back with the drafts (document pages and the custom pages). */
export function gatedPaths(docs: readonly LegalDoc[] = LEGAL_DOCS): Set<string> {
  return new Set([...docs.filter((d) => !d.approved).map((d) => `/${d.path}`), ...CUSTOM_PAGES.map((p) => `/${p.path}`)]);
}

/** True when a link may be shown: it is not a held-back draft page, or draft pages are enabled. */
export function linkVisible(href: string, enabled: boolean, docs: readonly LegalDoc[] = LEGAL_DOCS): boolean {
  return enabled || !gatedPaths(docs).has(href);
}

export function docsByGroup(group: DocGroup): LegalDoc[] {
  return LEGAL_DOCS.filter((d) => d.group === group);
}

/** The pages Astro should build for the catch-all route: nothing unless drafts are enabled (or the doc is approved). */
export function pagesToBuild(enabled: boolean, docs: readonly LegalDoc[] = LEGAL_DOCS): { docs: LegalDoc[]; custom: CustomPage[] } {
  return {
    docs: docs.filter((d) => enabled || d.approved),
    custom: enabled ? [...CUSTOM_PAGES] : [],
  };
}
