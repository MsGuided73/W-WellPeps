/**
 * "Do I pay if I'm not prescribed?" One source for the visible Q&A and the FAQPage
 * JSON-LD, so the answer text cannot drift. Refund wording follows the released
 * Refund, Cancellation and Auto-Renewal Policy (src/data/legal/A10.json).
 */
import { PATIENT_PORTAL_URL } from '../config';

export const REFUND_FAQ_PATH = '/do-i-pay-if-im-not-prescribed/';

export const REFUND_FAQ_TITLE = "Do I Pay If I'm Not Prescribed? | WellPeps Refund FAQ";

/** 156 characters. The draft was 177, over the SEO check's 160-character aim, and it called the reviewer a "WellPeps clinician". */
export const REFUND_FAQ_DESCRIPTION =
  'You pay at checkout before a clinician review. If a clinician does not prescribe, you are refunded in full, including tax. A prescription is not guaranteed.';

/** dateModified for this page, which the sitemap writes as lastmod. The page was added on this day. */
export const REFUND_FAQ_UPDATED = '2026-11-09';

/** The phrase the non-refund answer and the closing line link to the policy. The words stay inside the answer text. */
export const POLICY_HREF = '/refund-and-cancellation';
export const POLICY_PHRASE = 'Refund, Cancellation and Auto-Renewal Policy';

export interface RefundFaqItem {
  q: string;
  /** Visible paragraphs, in order. The JSON-LD answer is these joined with one space. */
  paragraphs: readonly string[];
}

export function refundFaqAnswer(item: RefundFaqItem): string {
  return item.paragraphs.join(' ');
}

export const REFUND_FAQS: readonly RefundFaqItem[] = [
  {
    q: "Do I pay if I'm not prescribed?",
    paragraphs: [
      'You pay for your first month at checkout, before a licensed clinician reviews your answers. If your clinician does not prescribe, the medical practice declines your request, or the clinician cannot finish the review, WellPeps refunds that checkout charge in full, including any tax, to the card you used. You do not need to ask. A prescription is not guaranteed.',
      "A licensed clinician decides whether treatment is medically appropriate. WellPeps does not practice medicine or pharmacy and cannot change a clinician's decision.",
    ],
  },
  {
    q: 'When am I charged?',
    paragraphs: [
      'You answer the online health questions first. Then you check out and pay for your first month. That charge happens at checkout, before a clinician reviews your answers. The online health questions do not require a card.',
    ],
  },
  {
    q: "Do I need to request the refund if I'm not prescribed?",
    paragraphs: [
      'No. If your clinician does not prescribe, the medical practice declines your request, or the clinician cannot finish the review (including when you do not send information they asked for within 14 days, after a reminder), WellPeps starts the refund without a separate request. WellPeps starts the refund within 2 business days after the decision. It usually appears on your statement within several business days, depending on your bank or card issuer.',
    ],
  },
  {
    q: 'What if I change my mind before a prescription?',
    paragraphs: [
      'If you cancel after checkout but before your clinician prescribes, WellPeps refunds your checkout charge in full. There is no cancellation fee.',
    ],
  },
  {
    q: 'When is a charge not refundable?',
    paragraphs: [
      'Once the pharmacy has started preparing your medication, that charge generally cannot be refunded, except in the cases listed in the Refund, Cancellation and Auto-Renewal Policy (for example certain pharmacy errors, lost or damaged shipments, charges made after you cancel, or billing errors). Compounded medication that was prepared and shipped as ordered generally cannot be returned. Talk to your clinician before you stop a prescribed medicine.',
    ],
  },
];

/** Visible, but not a FAQPage question: it only points at the policy and the related pages. */
export const POLICY_CLOSING = {
  q: 'Where can I read the full policy?',
  before: 'See the ',
  after: ' for renewal timing, how to cancel, refund cases, and contact details.',
};

export const MORE_LINKS = [
  { href: '/your-plan', label: "What's included and how to cancel" },
  { href: '/how-wellpeps-works', label: 'How WellPeps works' },
  { href: PATIENT_PORTAL_URL, label: 'Patient portal (cancel / messages)' },
] as const;
