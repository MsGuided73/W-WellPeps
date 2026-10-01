/**
 * Consent wording for the sign-up forms that tie an email address to a health topic (the free
 * guide dialogs, the program waitlists and the hair notify band).
 *
 * Washington and Nevada treat an email address linked to a health topic as consumer health data:
 * consent to collect it, and any consent to use it for marketing, must be separate, unchecked and
 * not bundled with anything else (Consumer Health Data Privacy Policy, draft A3, Appendix A.1).
 * So the form shows two boxes: one required, to collect and keep the details so we can send what
 * was asked for, and one optional, for follow-up emails. The words come from this file only, and
 * the version below is stored with each signup so we can show which text a person agreed to.
 *
 * The version says "draft" until counsel approves the wording; change it when the text changes.
 */
export const FORM_CONSENT_VERSION = 'chd-form-v0.1-draft';

export interface FormConsentText {
  /** Required box: collect and keep the email, first name and topic to send what was asked for. */
  collect: string;
  /** Optional box: follow-up emails about the topic. Unchecked by default. */
  marketing: string;
}

/** A health topic as shown inside a sentence: trimmed, no trailing punctuation. */
export function topicLabel(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().replace(/[.:;,\s]+$/, '');
}

export function formConsentText(topic: string, privacyEmail: string): FormConsentText {
  const t = topicLabel(topic);
  const withdraw = `I can withdraw this consent at any time through Your Privacy Choices or by emailing ${privacyEmail}.`;
  return {
    collect:
      `I agree that WellPeps may collect and keep my email address, my first name (if I give it) and the health topic I chose (${t}) ` +
      `so it can send me what I asked for. ${withdraw}`,
    marketing:
      `Optional: I also agree that WellPeps may use them to send me emails about ${t} and related wellness tips. ` +
      `If I leave this box unchecked, I still get what I asked for. ${withdraw}`,
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
