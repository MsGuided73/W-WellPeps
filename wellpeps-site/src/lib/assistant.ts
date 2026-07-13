/**
 * Virtual assistant — retrieval, guardrails and answer composition.
 *
 * The assistant is deliberately *grounded*: it only answers from documents in
 * the knowledge base and cites them. If nothing matches well enough it says so
 * rather than guessing — an assistant on a healthcare site must never invent
 * clinical claims.
 *
 * PRODUCTION SWAP: replace `getKnowledgeBase()` with a Supabase call
 * (vector search over the blog corpus + facility protocols). The scoring here
 * is lexical because it runs entirely in the browser with no API key; server
 * side it becomes an embedding similarity search. Everything downstream of
 * `answerQuestion()` stays the same.
 */
import { knowledgeBase, type KnowledgeDoc } from '../data/knowledge';

export interface Citation {
  title: string;
  href?: string;
  source: KnowledgeDoc['source'];
}

export interface AssistantReply {
  text: string;
  citations: Citation[];
  /** Set when a guardrail fired, so the UI can show the assessment CTA. */
  cta?: 'assessment' | 'emergency';
}

/** Swap this for a Supabase query when the blog + protocols go live. */
function getKnowledgeBase(): KnowledgeDoc[] {
  return knowledgeBase;
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'can', 'do', 'does', 'for', 'from',
  'get', 'have', 'how', 'i', 'if', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'that',
  'the', 'their', 'there', 'this', 'to', 'was', 'what', 'when', 'where', 'which', 'who',
  'will', 'with', 'you', 'your', 'am', 'we', 'us', 'our', 'about', 'tell',
]);

/**
 * Light stemmer — folds plurals and -ing forms so "medications" matches
 * "medication" and "shipping" matches "ship". Without this, obvious questions
 * miss their document entirely.
 */
function stem(token: string): string {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith('ing')) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith('es')) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
    .map(stem);
}

/**
 * Questions we must not answer. A virtual assistant on a healthcare site is a
 * compliance surface: it routes clinical decisions to a licensed provider
 * instead of answering them, and routes emergencies to 911.
 */
const EMERGENCY_PATTERNS = [
  /chest pain/i, /can'?t breathe/i, /trouble breathing/i, /suicid/i, /kill myself/i,
  /overdose/i, /allergic reaction/i, /anaphyla/i, /stroke/i, /heart attack/i, /emergency/i,
];

const CLINICAL_ADVICE_PATTERNS = [
  /should i (take|stop|start|use|switch|increase|decrease)/i,
  /what dose|dosage|how much should i|how many mg|mg should/i,
  /is it safe for me/i,
  /can i take .* (with|and) /i,
  /(interact|interaction) with/i,
  /diagnose|do i have/i,
  /am i (allergic|pregnant)/i,
  /instead of my/i,
];

const EMERGENCY_REPLY =
  'This may be a medical emergency. Please call 911 or go to your nearest emergency room right away. ' +
  'I’m not able to help with urgent medical situations.';

const CLINICAL_REPLY =
  'That’s a clinical question, and only a licensed healthcare provider who knows your history can answer ' +
  'it safely — I’m not able to give medical advice or recommend a dose. The good news is that a provider ' +
  'review is included: start the free health assessment and a licensed provider will evaluate your ' +
  'situation and recommend what’s appropriate for you.';

const NO_MATCH_REPLY =
  'I don’t have information on that yet. I can answer questions about our programs (weight management, ' +
  'hair restoration, sexual wellness, and peptide therapies), pricing, the assessment process, shipping, ' +
  'privacy, and how our pharmacy and lab partners work. You can also start a free assessment and a ' +
  'licensed provider will follow up with you directly.';

/** Score a document against the query. Term overlap, weighted by field. */
function scoreDoc(doc: KnowledgeDoc, queryTerms: string[]): number {
  const titleTerms = new Set(tokenize(doc.title));
  const tagTerms = new Set(doc.tags.flatMap((t) => tokenize(t)));
  const bodyTerms = tokenize(`${doc.body} ${doc.answer}`);
  const bodyCounts = new Map<string, number>();
  for (const t of bodyTerms) bodyCounts.set(t, (bodyCounts.get(t) ?? 0) + 1);

  let score = 0;
  for (const term of queryTerms) {
    // Tags are the strongest signal: they are the curated topic of the doc.
    // Titles are weighted lightly — generic title words ("how long does it
    // take") otherwise hijack questions that are really about another topic.
    if (tagTerms.has(term)) score += 6;
    if (titleTerms.has(term)) score += 2;
    const inBody = bodyCounts.get(term) ?? 0;
    if (inBody) score += Math.min(inBody, 3);
  }

  // Multi-word tags ("weight loss", "hair loss") are strong signals.
  const q = queryTerms.join(' ');
  for (const tag of doc.tags) {
    if (tag.includes(' ') && q.includes(tag)) score += 6;
  }
  return score;
}

const MIN_SCORE = 4;

export function answerQuestion(question: string): AssistantReply {
  const q = question.trim();
  if (!q) return { text: NO_MATCH_REPLY, citations: [] };

  if (EMERGENCY_PATTERNS.some((re) => re.test(q))) {
    return { text: EMERGENCY_REPLY, citations: [], cta: 'emergency' };
  }
  if (CLINICAL_ADVICE_PATTERNS.some((re) => re.test(q))) {
    return { text: CLINICAL_REPLY, citations: [], cta: 'assessment' };
  }

  const terms = tokenize(q);
  const ranked = getKnowledgeBase()
    .map((doc) => ({ doc, score: scoreDoc(doc, terms) }))
    .filter((r) => r.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return { text: NO_MATCH_REPLY, citations: [], cta: 'assessment' };
  }

  const best = ranked[0].doc;
  // Cite the doc we answered from, plus any close runners-up.
  const citations: Citation[] = ranked
    .slice(0, 3)
    .filter((r) => r.score >= ranked[0].score * 0.5)
    .map((r) => ({ title: r.doc.title, href: r.doc.href, source: r.doc.source }));

  return { text: best.answer, citations, cta: 'assessment' };
}

export const SUGGESTED_QUESTIONS = [
  'What programs do you offer?',
  'How much does it cost?',
  'How do GLP-1 medications work?',
  'Where do your medications come from?',
  'Can I cancel anytime?',
];

export const ASSISTANT_GREETING =
  'Hi! I’m the WellPeps assistant. I can answer questions about our programs, pricing, the assessment ' +
  'process, and how our care works — and I’ll point you to the source. I can’t give medical advice.';
