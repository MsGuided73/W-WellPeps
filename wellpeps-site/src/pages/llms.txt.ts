/** /llms.txt: the AI-assistant summary of WellPeps, generated at build time (src/lib/seo/llms.ts). */
import type { APIRoute } from 'astro';
import { getArticles } from '../lib/blog';
import { buildLlmsTxt } from '../lib/seo/llms';
import { reviewForArticle, reviewerName, reviewerPath } from '../data/medical-review';

export const GET: APIRoute = async () => {
  const articles = (await getArticles()).map((a) => {
    const review = reviewForArticle(a.slug);
    return {
      title: a.title,
      path: `/wellness-learning-center/${a.slug}/`,
      category: a.category.name,
      ...(review ? { review: { by: reviewerName(review.reviewer), on: review.reviewedOn, profile: reviewerPath(review.reviewer) } } : {}),
    };
  });
  return new Response(buildLlmsTxt(articles, new Date()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
