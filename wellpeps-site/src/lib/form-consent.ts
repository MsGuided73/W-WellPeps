/**
 * Consent wording for the sign-up forms that tie an email address to a health topic (the free
 * guide dialogs, the program waitlists and the hair notify band).
 *
 * Washington and Nevada treat an email address linked to a health topic as consumer health data:
 * consent to collect it, and any consent to use it for marketing, must be separate, unchecked and
 * not bundled with anything else (Consumer Health Data Privacy Policy, draft A3, Appendix A.1).
 * So the form shows two boxes: one required, to save the details so we can send what was asked
 * for, and one optional, for follow-up emails. The words are short and in plain language; the
 * how-to-withdraw sentence is shown once, in small print, under both boxes. The words come from
 * this file only, and the version below is stored with each signup so we can show which text a
 * person agreed to.
 *
 * The version says "draft" until counsel approves the wording; change it when the text changes.
 */
export const FORM_CONSENT_VERSION = 'chd-form-v0.2-draft';

export interface FormConsentText {
  /** Required box: save the email (and first name, if the form asks) and the topic to send what was asked for. */
  collect: string;
  /** Optional box: follow-up emails about the topic. Unchecked by default. */
  marketing: string;
  /** Small print under both boxes: how to withdraw either consent. */
  withdraw: string;
}

export interface FormConsentOptions {
  /** Set only for a form that has a first-name field; the other forms collect an email address alone. */
  withFirstName?: boolean;
}

/** A health topic as shown inside a sentence: trimmed, no trailing punctuation. */
export function topicLabel(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().replace(/[.:;,\s]+$/, '');
}

export function formConsentText(topic: string, privacyEmail: string, options: FormConsentOptions = {}): FormConsentText {
  const t = topicLabel(topic);
  const details = options.withFirstName ? 'my email address, first name and my interest in' : 'my email address and my interest in';
  return {
    collect: `I agree that WellPeps may save ${details} ${t} so it can send me what I asked for.`,
    marketing:
      `Optional: I also agree to receive emails from WellPeps about ${t} and related wellness tips. ` +
      'Leaving this box unchecked does not change what I get.',
    withdraw: `You can withdraw either consent at any time in Your Privacy Choices or by emailing ${privacyEmail}.`,
  };
}

export interface ConsentChoice {
  collect: boolean;
  marketing: boolean;
}

/** The fields sent with a signup: what the person ticked, and which wording they saw. */
export function consentFields(choice: ConsentChoice): { consent_collect: boolean; consent_marketing: boolean; consent_text_version: string } {
  return {
    consent_collect: choice.collect === true,
    // The optional box means nothing unless the required one is also ticked.
    consent_marketing: choice.collect === true && choice.marketing === true,
    consent_text_version: FORM_CONSENT_VERSION,
  };
}
