/**
 * Tells Bing, Yandex, Seznam and Naver (the IndexNow engines) that every page in the live sitemap is current, so
 * they recrawl it now instead of whenever they next pass by. Bing's index is the one ChatGPT search and Copilot
 * read from. Run after a deploy has finished:  npm run indexnow
 *
 * The key is public by design: the engines confirm ownership by fetching https://wellpeps.com/<key>.txt, which
 * ships from public/. Changing the key means renaming that file too.
 */
const SITE = 'https://wellpeps.com';
const KEY = '7fc6d9571a5773669020be841c971951';

const keyRes = await fetch(`${SITE}/${KEY}.txt`);
if (!keyRes.ok || (await keyRes.text()).trim() !== KEY) {
  console.error(`IndexNow: ${SITE}/${KEY}.txt is not live yet. Deploy first, then run this again.`);
  process.exit(1);
}

const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
if (!urlList.length) { console.error('IndexNow: the live sitemap lists no pages.'); process.exit(1); }

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
});
// 200 = accepted, 202 = accepted and the key is still being checked.
if (res.status !== 200 && res.status !== 202) {
  console.error(`IndexNow: ${res.status} ${await res.text()}`);
  process.exit(1);
}
console.log(`IndexNow: ${urlList.length} URLs submitted (${res.status}).`);
