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
 *
 * Free-guide forms are different (counsel agreed 2026-10-16, ATT-038). Sending a guide the person asked
 * for is collection "necessary to provide a product or service the consumer requested" (RCW 19.373.030),
 * which needs no consent. So a guide form has no required box: a short notice says the email address is
 * used to send the requested guide, and one optional, unchecked box asks for follow-up emails. Those
 * emails use the person's guide choice, so the box says so (MHMDA consent must name the data and the
 * purpose). See guideConsentText below.
 *
 * Since 2026-10-19 the optional box on every form is labelled "FREE BONUS:" instead of "Optional:" (owner);
 * it stays unchecked and separate from everything else.
 */
export const FORM_CONSENT_VERSION = 'chd-form-v0.5-draft';

/** The wording version recorded with a free-guide signup (notice + optional box). */
export const GUIDE_FORM_VERSION = 'chd-guide-v2';

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
    collect: `I agree that WellPeps may save ${details} ${t} so WellPeps can send me what I asked for.`,
    marketing:
      `FREE BONUS: I also agree to receive emails from WellPeps about ${t} and related wellness tips. ` +
      'I understand that I do not need to select this option in order to receive what I asked for.',
    withdraw:
      `You can unsubscribe from WellPeps emails or withdraw either consent at any time in Your Privacy Choices ` +
      `or by emailing ${privacyEmail}.`,
  };
}

export interface GuideConsentText {
  /** The optional box's sentence, after the bold "FREE BONUS:" label. Unchecked by default. */
  marketing: string;
  /** Small print: what the email address is used for, and how to unsubscribe or withdraw. */
  notice: string;
}

/** The free-guide form's words (Derek's layout, counsel-approved approach, 2026-10-16). */
export function guideConsentText(privacyEmail: string): GuideConsentText {
  return {
    marketing: 'Email me health and wellness tips, educational resources, and updates from WellPeps, based on the guide I requested.',
    notice:
      'We’ll use your email address to send the guide you requested. You can unsubscribe or withdraw consent ' +
      `at any time in Your Privacy Choices or by emailing ${privacyEmail}.`,
  };
}

export interface ConsentChoice {
  collect: boolean;
  marketing: boolean;
}

/** The fields sent with a free-guide signup: the optional choice and which wording they saw. No collection
 *  consent is sent, because sending the requested guide needs none. */
export function guideConsentFields(marketing: boolean): { consent_marketing: boolean; consent_text_version: string } {
  return { consent_marketing: marketing === true, consent_text_version: GUIDE_FORM_VERSION };
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
