/**
 * Virtual assistant knowledge base — MOCK DATA.
 *
 * This stands in for the production corpus so the assistant is fully
 * functional for demos. In production these documents are pulled from
 * Supabase instead of this file:
 *
 *   - `source: 'article'`  → the blog / Wellness Learning Center corpus,
 *                            which grows as articles are published.
 *   - `source: 'protocol'` → facility, pharmacy and clinical protocols.
 *   - `source: 'program'`  → program, pricing and eligibility information.
 *   - `source: 'faq'`      → the site FAQs.
 *
 * Only the loader in `src/lib/assistant.ts` needs to change to swap this out
 * (see `getKnowledgeBase()`); nothing in the UI depends on where docs come from.
 */

export type KnowledgeSource = 'article' | 'protocol' | 'program' | 'faq';

export interface KnowledgeDoc {
  id: string;
  /** Human-readable title, shown as the citation label. */
  title: string;
  source: KnowledgeSource;
  /** Where the citation links to, when the doc has a page of its own. */
  href?: string;
  /** Extra retrieval terms that may not appear in the body text. */
  tags: string[];
  /** The answer the assistant gives when this doc is the best match. */
  answer: string;
  /** Full text — retrieval scores against this. */
  body: string;
}

export const knowledgeBase: KnowledgeDoc[] = [
  /* ---------------- Blog / Learning Center articles ---------------- */
  {
    id: 'glp1-basics',
    title: 'Understanding GLP-1 Weight Management',
    source: 'article',
    href: '/weight-loss',
    tags: ['glp-1', 'glp1', 'semaglutide', 'tirzepatide', 'weight loss', 'ozempic', 'wegovy', 'appetite'],
    answer:
      'GLP-1 medications work with your body’s natural processes to reduce hunger, slow stomach emptying so you feel full longer, and support sustainable weight loss alongside healthy lifestyle changes. At WellPeps they are prescribed only after a licensed provider reviews your health history and goals.',
    body: `GLP-1 receptor agonists such as semaglutide and tirzepatide mimic a hormone your body already
      produces. They help regulate appetite signals so you feel less hungry throughout the day, slow
      stomach emptying so you stay satisfied longer, and support healthy, sustainable weight loss when
      combined with lifestyle changes. A licensed provider monitors progress and personalizes treatment.
      Oral semaglutide and oral tirzepatide are not available to California residents. Weight management plans start at $179/month, one monthly price. Results vary from person to person.`,
  },
  {
    id: 'peptide-basics',
    title: 'What Are Peptides? Understanding Peptide Therapy',
    source: 'article',
    href: '/healthy-aging',
    tags: ['peptide', 'peptides', 'sermorelin', 'nad', 'glutathione', 'longevity', 'energy', 'recovery'],
    answer:
      'Peptide therapies are designed to support your body at the cellular level. Depending on the therapy, patients pursue them for improved energy, recovery, healthy aging, mental focus, metabolic health, sleep, lean muscle support, and skin health. Every plan is personalized by a licensed provider.',
    body: `Peptides are short chains of amino acids that act as signaling molecules. WellPeps offers
      provider-guided peptide therapies including Sermorelin, NAD+, Glutathione, MIC, Lipo-C and
      Methylene Blue. Potential wellness benefits these therapies may help support include improved
      energy, healthy aging, recovery and cellular health, mental focus, metabolic health, healthy
      weight management, better sleep, lean muscle support, and collagen and skin health. Every
      treatment plan is personalized based on your health history, goals and ongoing progress.`,
  },
  {
    id: 'hair-basics',
    title: 'Understanding Hair Loss Treatment Options',
    source: 'article',
    href: '/hair-restoration',
    tags: ['hair', 'hair loss', 'minoxidil', 'finasteride', 'thinning', 'balding', 'regrow'],
    answer:
      'WellPeps offers five prescription hair loss treatments: oral finasteride, oral minoxidil, topical minoxidil, a topical minoxidil + finasteride foam, and a topical finasteride + minoxidil + tretinoin foam. Your provider recommends an option based on your hair loss pattern, medical history, goals and lifestyle. Plans start at $49/month.',
    body: `Hair loss treatments work in different ways: finasteride lowers DHT, a hormone involved in
      male-pattern hair loss, and minoxidil supports blood flow to hair follicles. WellPeps offers oral
      finasteride and oral minoxidil from $49/month, topical minoxidil at $99/month, and a topical
      minoxidil 6% + finasteride 0.3% foam at $139/month, and a finasteride + minoxidil + tretinoin foam
      at $149/month (tretinoin can cause scalp irritation or sun sensitivity). Results vary and take consistent use; your
      provider decides which option, if any, is appropriate for you.`,
  },
  {
    id: 'sexual-wellness-basics',
    title: 'Understanding Sexual Wellness',
    source: 'article',
    href: '/sexual-wellness',
    tags: ['sexual wellness', 'ed', 'erectile', 'libido', 'intimacy', 'tadalafil', 'sildenafil', 'performance'],
    answer:
      'Changes in sexual wellness are common and affect both men and women at any stage of life — aging, hormones, stress, medical conditions, medications and lifestyle can all play a role. Many concerns are treatable, and a licensed provider can recommend evidence-based options after a personalized evaluation.',
    body: `Sexual wellness is an important part of overall health. Treatment options are designed to help
      improve healthy blood flow, support the body's natural sexual function, and build confidence.
      WellPeps offers daily tadalafil at $79/month, as-needed tadalafil at $85/month and
      as-needed sildenafil at $79/month (15 tablets each); a licensed provider decides which is appropriate. These conversations should be
      private, judgment-free, and focused on helping you feel your best.`,
  },

  /* ---------------- Facility & clinical protocols ---------------- */
  {
    id: 'protocol-pharmacy',
    title: 'Pharmacy & Medication Sourcing Protocol',
    source: 'protocol',
    tags: ['pharmacy', 'compounded', 'medication', 'made in america', 'fda', 'sourcing', 'quality'],
    answer:
      'When prescribed, medications are dispensed through licensed U.S. pharmacy partners that meet applicable quality and regulatory standards. Compounded medications are prepared by state-licensed U.S. pharmacies when clinically appropriate. Compounded medications are not FDA-approved.',
    body: `WellPeps partners only with licensed United States pharmacies. Depending on your treatment plan a
      provider may prescribe FDA-approved medications, compounded medications, or a combination of both
      when clinically appropriate. Compounded medications are prepared by state-licensed U.S. pharmacies in
      accordance with applicable regulations and are not FDA-approved. Medications are made in America when
      clinically appropriate and available.`,
  },
  {
    id: 'protocol-labs',
    title: 'Laboratory Testing Protocol',
    source: 'protocol',
    tags: ['lab', 'labs', 'labcorp', 'quest', 'blood work', 'testing', 'diagnostics'],
    answer:
      'Lab testing is available when your provider recommends it. Initial and follow-up tests may be part of your plan; lab fees are billed separately.',
    body: `Lab testing is available where clinically appropriate, for initial and follow-up testing. Lab fees are
      billed separately. Your provider will tell you whether lab work is needed as part of your plan.`,
  },
  {
    id: 'protocol-shipping',
    title: 'Shipping & Delivery Protocol',
    source: 'protocol',
    tags: ['shipping', 'delivery', 'discreet', 'packaging', 'arrive', 'tracking'],
    answer:
      'If prescribed, medication is shipped directly to your home in discreet, secure packaging. Delivery is included in your program cost.',
    body: `Medications are prepared by licensed U.S. pharmacies and shipped directly to your home in
      discreet, secure packaging. Discreet home delivery is step four of the WellPeps wellness journey,
      following your assessment, provider review, and custom treatment plan.`,
  },
  {
    id: 'protocol-privacy',
    title: 'Privacy & HIPAA Protocol',
    source: 'protocol',
    tags: ['privacy', 'hipaa', 'secure', 'data', 'confidential', 'information'],
    answer:
      'We take your privacy seriously and use secure technology to protect your information. Our Privacy Policy explains what we collect, why, and the choices you have.',
    /* LegitScript-certified sentence removed until the certification application
       is approved. Original body — restore once approved:
    body: `Privacy is protected using secure technology and HIPAA-compliant safeguards. Personal health
      information is encrypted in transit and at rest. WellPeps is LegitScript certified, reflecting a
      commitment to transparency, compliance and patient protection.`,
    */
    body: `Privacy is protected using secure technology. The Privacy Policy explains what WellPeps collects, why, and the choices you have.`,
  },

  /* ---------------- Programs, pricing, eligibility ---------------- */
  {
    id: 'program-overview',
    title: 'WellPeps Programs',
    source: 'program',
    tags: ['programs', 'offer', 'services', 'treatments', 'what do you offer'],
    answer:
      'WellPeps offers Weight Management, Hair Restoration, Sexual Wellness, and Healthy Aging & Vitality today. Hormone Optimization is coming soon — you can join the waitlist.',
    body: `Available programs: Weight Management (personalized medical weight management), Hair Restoration
      (provider-guided regrowth treatments), Sexual Wellness (performance, confidence and intimacy), and
      Healthy Aging & Vitality. Coming soon: Hormone Optimization.`,
  },
  {
    id: 'program-assessment',
    title: 'The Free Health Assessment',
    source: 'program',
    tags: ['assessment', 'get started', 'sign up', 'consultation', 'begin', 'start', 'onboarding'],
    answer:
      'Every treatment begins with a free online health assessment that takes most patients less than 10 minutes. A licensed provider reviews your health history, symptoms and goals, then recommends a personalized plan — if clinically appropriate.',
    body: `The WellPeps wellness journey: 1) Complete your free health assessment — a few quick questions
      about your health and goals. 2) A licensed medical provider reviews your information. 3) If
      approved, you receive a custom treatment plan. 4) Discreet home delivery if medication is
      prescribed. 5) Ongoing provider support as your needs evolve. Most patients complete the
      assessment in under 10 minutes. There is no charge for the assessment.`,
  },
  {
    id: 'program-cost',
    title: 'Pricing & What’s Included',
    source: 'program',
    tags: ['price', 'pricing', 'cost', 'how much', 'fees', 'payment', 'insurance', 'expensive'],
    answer:
      'Pricing is transparent and upfront — you know your full program cost before you begin, with no hidden fees. Sexual Wellness starts at $79/month, Hair Restoration at $49/month, and Weight Management at $179/month. Each is one monthly price covering medication, if prescribed, provider care, messaging with your care team and standard shipping. Lab testing is available when your provider recommends it; lab fees are billed separately. No insurance is required; WellPeps is self-pay. We accept Visa, Mastercard, FSA/HSA, Apple Pay and Google Pay.',
    body: `Every program includes transparent pricing, a licensed healthcare provider review, ongoing
      provider support, and the ability to cancel anytime. No insurance required — affordable self-pay
      programs make personalized wellness accessible. Accepted payment methods: Visa, Mastercard,
      American Express, Discover, FSA/HSA cards, Apple Pay, Google Pay. Provider follow-ups are included in your monthly price.`,
  },
  {
    id: 'program-cancel',
    title: 'Cancellation & Refunds',
    source: 'program',
    tags: ['cancel', 'cancellation', 'refund', 'subscription', 'commitment', 'quit', 'stop'],
    answer:
      'You can cancel anytime — there is no long-term commitment. Patients may cancel and request a refund, except for medication that has already been ordered or processed for that month’s shipment.',
    body: `Cancel anytime. You are never locked into a long-term commitment. Patients may cancel anytime and
      request a refund, except for medications that have already been ordered or processed for that
      month's shipment.`,
  },
  {
    id: 'program-states',
    title: 'Where WellPeps Operates',
    source: 'program',
    tags: ['states', 'available', 'location', 'where', '50 states', 'nationwide', 'near me'],
    answer:
      'Availability varies by state and by program. Care is available only where an independent licensed provider can treat you and a state-licensed pharmacy can ship to you.',
    body: `Care is available only in states where an independent licensed provider can treat you and a pharmacy can ship to you. Care is delivered
      remotely, so you can complete your assessment, provider review and follow-ups from home.`,
  },

  /* ---------------- FAQs ---------------- */
  {
    id: 'faq-providers',
    title: 'Are your healthcare providers licensed?',
    source: 'faq',
    tags: ['licensed', 'provider', 'doctor', 'real doctor', 'physician', 'qualified'],
    answer:
      'Yes. Every treatment recommendation is made by a licensed healthcare provider practicing in the state where they are authorized to provide care.',
    body: `All treatment recommendations come from licensed healthcare providers. WellPeps was founded by a
      physician and experienced pharmacy professionals, and its founders bring decades of clinical
      experience to every patient journey.`,
  },
  {
    id: 'faq-candidate',
    title: 'How do I know if I’m a candidate for treatment?',
    source: 'faq',
    tags: ['candidate', 'eligible', 'qualify', 'right for me', 'suitable'],
    answer:
      'Most adults may be candidates. During your free online health assessment a licensed provider reviews your medical history, symptoms and goals to determine whether treatment is appropriate and which options fit your situation.',
    body: `Eligibility is determined by a licensed provider based on your assessment. Treatment is only
      recommended when clinically appropriate. The assessment is free and takes about 10 minutes.`,
  },
  {
    id: 'faq-results',
    title: 'How long does it take to see results?',
    source: 'faq',
    /* Tags must be topic words, not generic phrasing — a tag like "how long"
       would hijack every "how long does shipping take?" question. */
    tags: ['results', 'timeline', 'improvement', 'progress', 'months'],
    answer:
      'It varies by program and by person. Hair restoration patients often begin noticing improvements within 3 to 6 months of consistent use. Your provider monitors progress and adjusts your plan as needed.',
    body: `Results vary from person to person and depend on the program, consistency of use, and individual
      health factors. Providers monitor progress over time and adjust treatment plans when needed.`,
  },
];
