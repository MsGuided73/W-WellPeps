/** /llms.txt: the AI-assistant summary of WellPeps, generated at build time (src/lib/seo/llms.ts). */
import type { APIRoute } from 'astro';
import { getArticles } from '../lib/blog';
import { buildLlmsTxt } from '../lib/seo/llms';

export const GET: APIRoute = async () => {
  const articles = (await getArticles()).map((a) => ({
    title: a.title,
    path: `/wellness-learning-center/${a.slug}/`,
    category: a.category.name,
  }));
  return new Response(buildLlmsTxt(articles, new Date()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
