/**
 * The guide funnel works, and the current flow is untouched.
 *
 *   node scripts/guide-flow-check.mjs [landingBaseUrl] [dialogBaseUrl]
 *
 * Needs two dev servers (or two previews of a build) of the same code:
 *   landing  PUBLIC_GUIDE_FLOW=landing npx astro dev --port 4325      (default http://localhost:4325)
 *   dialog   npx astro dev                                           (default http://localhost:4321)
 * The sign-up endpoint is intercepted, so nothing is really sent.
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const LANDING = process.argv.find((a, i) => i === 2 && a.startsWith('http')) || 'http://localhost:4325';
const DIALOG = process.argv.find((a, i) => i === 3 && a.startsWith('http')) || 'http://localhost:4321';
const GUIDES = ['glp-1-weight-loss', 'sexual-wellness', 'hair-restoration', 'healthy-aging-vitality', 'nad-therapy'];
const PROGRAMS = [
  ['/weight-loss', 'glp-1-weight-loss', 'weight-loss'],
  ['/hair-restoration', 'hair-restoration', 'hair-restoration'],
  ['/sexual-wellness', 'sexual-wellness', 'sexual-wellness'],
  ['/healthy-aging', 'healthy-aging-vitality', 'healthy-aging'],
];
const hide = '.pbanner{display:none!important} astro-dev-toolbar{display:none!important} .wa{display:none!important}';

let fails = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`); if (!ok) fails++; };

const browser = await chromium.launch();
const sent = [];
async function newContext(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  await ctx.route('**/functions/v1/notify-signup', async (route) => {
    sent.push(JSON.parse(route.request().postData() || '{}'));
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' });
  });
  return ctx;
}
async function open(ctx, base, path) {
  const page = await ctx.newPage();
  const response = await page.goto(base + path, { waitUntil: 'load' });
  await page.addStyleTag({ content: hide });
  return { page, status: response?.status() };
}
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
async function articleLinks(ctx, base) {
  const { page } = await open(ctx, base, '/wellness-learning-center');
  const hrefs = await page.locator('a[href^="/wellness-learning-center/"]').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href')))]);
  await page.close();
  return hrefs;
}

// ====================================================================== the current (dialog) flow is untouched
{
  console.log(`\n== dialog flow (${DIALOG})`);
  const ctx = await newContext();
  const home = await open(ctx, DIALOG, '/');
  check('home still has the email-dialog carousel', (await home.page.locator('[data-ebook-offer].ebook--carousel').count()) === 1);
  check('home has no ring', (await home.page.locator('[data-guide-ring]').count()) === 0);
  check('footer has no Smart Patient Guides link', (await home.page.locator('footer a[href="/smart-patient-guides"]').count()) === 0);
  for (const path of ['/smart-patient-guides', '/smart-patient-guides/glp-1-weight-loss', '/smart-patient-guides/glp-1-weight-loss/thank-you']) {
    const r = await open(ctx, DIALOG, path);
    check(`${path} does not exist`, r.status === 404, String(r.status));
    await r.page.close();
  }
  const wl = await open(ctx, DIALOG, '/weight-loss');
  check('Weight Loss keeps its dialog band and has no guide band', (await wl.page.locator('.ebook--band').count()) === 1 && (await wl.page.locator('[data-guide-band]').count()) === 0);
  const hrefs = await articleLinks(ctx, DIALOG);
  const art = await open(ctx, DIALOG, hrefs.find((h) => h.includes('semaglutide')) || hrefs[0]);
  check('an article keeps its sidebar guide card and has no guide calls to action', (await art.page.locator('.ebook-rail').count()) === 1 && (await art.page.locator('[data-guide-cta]').count()) === 0);
  await ctx.close();
}

// ====================================================================== the home ring
{
  console.log(`\n== ring (${LANDING})`);
  const ctx = await newContext();
  const { page } = await open(ctx, LANDING, '/');
  const ring = page.locator('[data-guide-ring]');
  await ring.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  check('home shows the ring, not the email dialog', (await ring.count()) === 1 && (await page.locator('[data-ebook-dialog]').count()) === 0);
  check('the ring has all five guides, each linking to its landing page', JSON.stringify(await page.locator('[data-ring-card]').evaluateAll((els) => els.map((e) => e.dataset.href))) === JSON.stringify(GUIDES.map((g) => `/smart-patient-guides/${g}`)));
  check('the section carries Derek’s copy', (await page.locator('.gring-title').innerText()).trim() === 'What Every Smart Patient Should Know.');
  check('there is one FREE coin, beside the ring, and none on the covers', (await page.locator('.gring__star').count()) === 1 && (await page.locator('[data-ring-card] .gbook__star, [data-ring-card] .book__star').count()) === 0);
  check('the first guide is at the front', (await page.locator('[data-ring-name]').innerText()) === 'GLP-1 Weight Loss' && (await page.locator('[data-ring-card]').first().getAttribute('data-pos')) === 'front');
  check('"Explore all" goes to the index', (await page.locator('.gring__all a').getAttribute('href')) === '/smart-patient-guides');

  await page.locator('[data-ring-next]').click();
  await page.waitForTimeout(300);
  check('next turns the ring to the next guide and updates the button', (await page.locator('[data-ring-name]').innerText()) === 'Sexual Wellness' && (await page.locator('[data-ring-cta]').getAttribute('href')) === '/smart-patient-guides/sexual-wellness');
  check('the turn is real 3D (the track carries the new angle)', (await page.locator('[data-ring-track]').evaluate((el) => el.style.getPropertyValue('--angle'))) === '-72');
  await page.locator('[data-ring-prev]').click();
  await page.waitForTimeout(200);
  check('previous turns it back', (await page.locator('[data-ring-name]').innerText()) === 'GLP-1 Weight Loss');
  await page.locator('[data-ring-prev]').click();
  await page.waitForTimeout(200);
  check('previous from the first wraps round to the last', (await page.locator('[data-ring-name]').innerText()) === 'NAD+ Therapy');
  await page.locator('[data-ring-dot="2"]').click();
  await page.waitForTimeout(200);
  check('a dot goes straight to its guide', (await page.locator('[data-ring-name]').innerText()) === 'Hair Restoration');
  await ring.focus();
  await page.locator('[data-ring-next]').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  check('the arrow key turns it', (await page.locator('[data-ring-name]').innerText()) === 'Healthy Aging & Vitality');

  const pause = page.locator('[data-ring-pause]');
  check('automatic turning was handed over to the visitor', (await pause.getAttribute('aria-pressed')) === 'true');
  await pause.click();
  check('the pause button switches it back on', (await pause.getAttribute('aria-pressed')) === 'false');
  await pause.click();

  // a drag turns it, and the click after a drag does not open a guide
  const box = await page.locator('[data-ring-viewport]').boundingBox();
  const before = await page.locator('[data-ring-name]').innerText();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5 - 140, box.y + box.height * 0.5, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  check('dragging turns the ring and it stays on the page', (await page.locator('[data-ring-name]').innerText()) !== before && new URL(page.url()).pathname === '/');

  // a side cover comes round before it opens; the front cover opens its guide
  await page.locator('[data-ring-dot="0"]').click();
  await page.waitForTimeout(1100);
  const side = page.locator('[data-ring-card][data-pos="near"] a').first();
  const sideTitle = await side.getAttribute('aria-label');
  // Find a point where the side cover really is the top element (a skewed card's box is not its shape).
  const point = await side.evaluate((a) => {
    const card = a.closest('[data-ring-card]'), box = a.getBoundingClientRect();
    for (let fx = 0.5; fx <= 0.95; fx += 0.1) for (let fy = 0.3; fy <= 0.7; fy += 0.1) {
      const x = box.left + box.width * fx, y = box.top + box.height * fy;
      if (document.elementFromPoint(x, y)?.closest('[data-ring-card]') === card) return { x, y };
    }
    return null;
  });
  check('a side cover can be hit with the pointer', point !== null);
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(400);
  check('clicking a side cover brings it to the front without leaving the page', new URL(page.url()).pathname === '/' && (await page.locator('[data-ring-card][data-pos="front"] a').getAttribute('aria-label')) === sideTitle, sideTitle);
  const front = await page.locator('[data-ring-card][data-pos="front"] a').boundingBox();
  await page.mouse.click(front.x + front.width / 2, front.y + front.height / 2);
  await page.waitForURL('**/smart-patient-guides/**', { timeout: 8000 });
  check('clicking the front cover opens that guide’s landing page', /\/smart-patient-guides\/[a-z0-9-]+$/.test(new URL(page.url()).pathname), page.url());
  await ctx.close();

  const reduced = await newContext({ reducedMotion: 'reduce' });
  const r = await open(reduced, LANDING, '/');
  check('with reduced motion the ring does not turn on its own', (await r.page.locator('[data-ring-pause]').getAttribute('aria-pressed')) === 'true');
  await reduced.close();

  const phone = await newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const p = await open(phone, LANDING, '/');
  check('the ring fits a phone with no sideways scroll', await noSideways(p.page));
  await phone.close();
}

// ====================================================================== things the code review found
{
  console.log(`\n== regressions from the review (${LANDING})`);

  // The form must never put a visitor's details in the address bar, even if JavaScript did not run.
  const noJs = await newContext({ javaScriptEnabled: false });
  const nj = { page: await noJs.newPage() }; // no script can run here, so no helper that injects styles
  await nj.page.goto(LANDING + '/smart-patient-guides/hair-restoration', { waitUntil: 'load' });
  check('the landing form posts (never GETs) and tells a no-JavaScript visitor what to do', (await nj.page.locator('[data-guide-form]').getAttribute('method')) === 'post' && /needs JavaScript/.test(await nj.page.locator('[data-guide-form] noscript').evaluate((e) => e.textContent || e.innerHTML)));
  await nj.page.locator('[data-guide-form] input[name=email]').fill('sam@example.com');
  await nj.page.locator('[data-guide-form] input[name=consentCollect]').check();
  await Promise.all([nj.page.waitForLoadState('load').catch(() => {}), nj.page.locator('[data-guide-form] button[type=submit]').click()]);
  await nj.page.waitForTimeout(500);
  check('a native submit leaves no email in the URL', !/[?&]email=/i.test(nj.page.url()) && !nj.page.url().includes('sam%40'), nj.page.url());
  await noJs.close();

  // The thank-you headline must not say "Ready" while the guide is not published.
  const ty = await newContext();
  const t = await open(ty, LANDING, '/smart-patient-guides/glp-1-weight-loss/thank-you');
  const headline = (await t.page.locator('main h1').innerText()).trim();
  check('with no PDF yet, the thank-you headline does not say the guide is ready', !/ready/i.test(headline) && /request/i.test(headline), headline);
  await ty.close();

  const ctx = await newContext();
  const { page } = await open(ctx, LANDING, '/');
  const ring = page.locator('[data-guide-ring]');
  await ring.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  check('every ring dot is at least 24px square (WCAG 2.2 target size)', (await page.locator('[data-ring-dot]').evaluateAll((els) => els.every((e) => { const b = e.getBoundingClientRect(); return b.width >= 24 && b.height >= 24; }))));
  check('the ring covers are not extra tab stops, and the pause button keeps one fixed label', (await page.locator('.gring__link').evaluateAll((els) => els.every((e) => e.getAttribute('tabindex') === '-1'))) && (await page.locator('[data-ring-pause]').getAttribute('aria-label')) === 'Pause automatic turning');

  // Dragging turns the ring by the same amount whichever guide is in front.
  async function degreesPer60px(dot) {
    await page.locator(`[data-ring-dot="${dot}"]`).click();
    await page.waitForTimeout(1100);
    const box = await page.locator('[data-ring-viewport]').boundingBox();
    const y = box.y + box.height * 0.5, x = box.x + box.width * 0.5;
    const read = () => page.locator('[data-ring-track]').evaluate((el) => Number(el.style.getPropertyValue('--angle')));
    const start = await read();
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 60, y, { steps: 12 });
    await page.waitForTimeout(250); // let the pointer rest, so it is a drag and not a flick
    const turned = start - (await read());
    await page.mouse.up();
    await page.waitForTimeout(300);
    return turned;
  }
  const turns = [];
  for (const dot of [0, 1, 2, 3, 4]) turns.push(await degreesPer60px(dot));
  check('a drag turns the ring the same amount whichever guide is in front', Math.max(...turns) - Math.min(...turns) < 1.5 && turns.every((d) => d > 10), turns.map((d) => d.toFixed(1)).join(', '));

  // A pointer that rests before letting go does not flick the ring on.
  await page.locator('[data-ring-dot="0"]').click();
  await page.waitForTimeout(1100);
  const vp = await page.locator('[data-ring-viewport]').boundingBox();
  await page.mouse.move(vp.x + vp.width / 2, vp.y + vp.height / 2);
  await page.mouse.down();
  await page.mouse.move(vp.x + vp.width / 2 - 40, vp.y + vp.height / 2, { steps: 10 });
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.waitForTimeout(500);
  check('a short drag, a rest, then letting go settles back on the same guide', (await page.locator('[data-ring-name]').innerText()) === 'GLP-1 Weight Loss');

  // A very fast flick moves at most one guide.
  await page.mouse.move(vp.x + vp.width / 2, vp.y + vp.height / 2);
  await page.mouse.down();
  await page.mouse.move(vp.x + vp.width / 2 - 400, vp.y + vp.height / 2, { steps: 3 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const afterFlick = await page.locator('[data-ring-name]').innerText();
  check('a hard flick moves the ring by at most a couple of guides, never a lap', ['Sexual Wellness', 'Hair Restoration', 'Healthy Aging & Vitality'].includes(afterFlick), afterFlick);

  // "Turn automatically" really does turn it, even though the button still has focus.
  const pause = page.locator('[data-ring-pause]');
  if ((await pause.getAttribute('aria-pressed')) !== 'true') await pause.click(); // make sure it is paused
  await page.locator('[data-ring-dot="0"]').click();
  await page.waitForTimeout(1000);
  await pause.click(); // resume
  check('after resuming, the pause button reports it is not paused', (await pause.getAttribute('aria-pressed')) === 'false');
  const resumedFrom = await page.locator('[data-ring-name]').innerText();
  await page.waitForTimeout(6500);
  check('and the ring then turns on its own', (await page.locator('[data-ring-name]').innerText()) !== resumedFrom);
  await ctx.close();

  // Reviewer's point on the current flow: it must not carry any of the new flow's CSS or script.
  const dctx = await newContext();
  const d = await open(dctx, DIALOG, '/');
  check('the dialog flow’s home page carries none of the ring’s styles or script', await d.page.evaluate(() => ![...document.querySelectorAll('style')].some((s) => /gring|gband|gcta/.test(s.textContent || '')) && ![...document.scripts].some((s) => /GuideRing|ring-math/.test(s.src || ''))));
  await dctx.close();
}

// ====================================================================== program pages
{
  console.log('\n== program pages');
  const ctx = await newContext();
  for (const [path, guide, program] of PROGRAMS) {
    const { page } = await open(ctx, LANDING, path);
    const band = page.locator(`[data-guide-band="${program}"]`);
    check(`${path}: the guide band links to its landing page`, (await band.count()) === 1 && (await band.locator('.gband__btn').getAttribute('href')) === `/smart-patient-guides/${guide}`);
    check(`${path}: the old dialog band is gone`, (await page.locator('.ebook--band').count()) === 0);
    check(`${path}: the band is high on the page (first third of the sections)`, await page.evaluate(() => { const b = document.querySelector('[data-guide-band]').getBoundingClientRect().top + scrollY; return b < document.documentElement.scrollHeight * 0.4; }));
    check(`${path}: the band says what Derek wrote`, (await band.locator('.gband__title').innerText()).trim() === 'Become a Smart Patient. Download Our Free eBook.' && /^Want to learn more before choosing/i.test(await band.locator('.gband__question').innerText()));
    check(`${path}: no sideways scroll`, await noSideways(page));
  }
  const { page: aging } = await open(ctx, LANDING, '/healthy-aging');
  check('/healthy-aging: also offers the NAD+ guide', (await aging.locator('.gband__also a').getAttribute('href')) === '/smart-patient-guides/nad-therapy');
  await ctx.close();
}

// ====================================================================== articles
{
  console.log('\n== articles');
  const ctx = await newContext();
  const hrefs = await articleLinks(ctx, LANDING);
  const cases = [
    [hrefs.find((h) => h.includes('semaglutide-vs-tirzepatide')), 'glp-1-weight-loss', /GLP-1 Treatment/],
    [hrefs.find((h) => h.includes('nad-explained')), 'nad-therapy', /NAD\+/],
    [hrefs.find((h) => h.includes('understanding-erectile-dysfunction')), 'sexual-wellness', /Sexual Wellness/],
    [hrefs.find((h) => h.includes('understanding-hair-loss')), 'hair-restoration', /Hair Loss and Restoration/],
    [hrefs.find((h) => h.includes('glutathione-explained')), 'healthy-aging-vitality', /Healthy Aging and Vitality/],
  ];
  for (const [href, guide, titleRe] of cases) {
    if (!href) { console.log('SKIP  an article for', guide, 'was not found in the Learning Center'); continue; }
    const { page } = await open(ctx, LANDING, href);
    const ctas = await page.locator('[data-guide-cta]').evaluateAll((els) => els.map((e) => ({ place: e.dataset.guideCta, href: e.querySelector('.gcta__btn').getAttribute('href'), title: e.querySelector('.gcta__title').textContent })));
    check(`${href}: one call to action inside and one at the end, both to ${guide}`, ctas.length === 2 && ctas[0].place === 'inline' && ctas[1].place === 'end' && ctas.every((c) => c.href === `/smart-patient-guides/${guide}` && titleRe.test(c.title)), JSON.stringify(ctas.map((c) => c.place + ':' + c.href)));
    check(`${href}: the inline one is between sections, the end one after the article`, await page.evaluate(() => {
      const inline = document.querySelector('[data-guide-cta="inline"]'), end = document.querySelector('[data-guide-cta="end"]');
      return inline.previousElementSibling?.classList.contains('prose') && inline.nextElementSibling?.classList.contains('prose--cont') && end.compareDocumentPosition(document.querySelector('.related') || document.querySelector('.endcta')) & Node.DOCUMENT_POSITION_FOLLOWING;
    }));
    check(`${href}: the sidebar guide card is gone, every section heading is still there`, (await page.locator('.ebook-rail').count()) === 0 && (await page.locator('.prose h2').count()) === (await page.locator('.toc__list li').count()));
    await page.close();
  }
  await ctx.close();
}

// ====================================================================== index, landing, thank-you
{
  console.log('\n== index, landing and thank-you pages');
  const ctx = await newContext();
  const idx = await open(ctx, LANDING, '/smart-patient-guides');
  check('the index lists all five guides, each linking to its landing page', JSON.stringify(await idx.page.locator('.gidx-card__link').evaluateAll((els) => els.map((e) => e.getAttribute('href')))) === JSON.stringify(GUIDES.map((g) => `/smart-patient-guides/${g}`)));
  check('the index is never behind a form', (await idx.page.locator('form, input').count()) === 0 || (await idx.page.locator('main form').count()) === 0);
  check('the index says what Derek wrote', (await idx.page.locator('main h1').innerText()).replace(/\s+/g, ' ').trim() === 'Better Information. Better Healthcare Decisions.');
  check('the index is indexable', (await idx.page.locator('meta[name="robots"]').count()) === 0);

  for (const slug of GUIDES) {
    const { page, status } = await open(ctx, LANDING, `/smart-patient-guides/${slug}`);
    // The series words are visually hidden (screen readers and search only), so they read as their own line.
    const title = (await page.locator('main h1').innerText()).replace(/\s+/g, ' ').trim();
    check(`${slug}: landing page loads with its title`, status === 200 && /^The Smart Patient’s Guide to /.test(title), title.replace(/\n/g, ' '));
    check(`${slug}: email is the only field (plus the hidden trap and the two consent boxes)`, JSON.stringify(await page.locator('[data-guide-form] input:not([type=hidden])').evaluateAll((els) => els.map((e) => e.name))) === JSON.stringify(['email', 'company', 'consentCollect', 'consentMarketing']));
    check(`${slug}: eight "inside" points and six topic cards`, (await page.locator('.glp-inside li').count()) === 8 && (await page.locator('.glp-card').count()) === 6);
    check(`${slug}: no link to the PDF anywhere on the page`, (await page.locator('a[href$=".pdf"]').count()) === 0);
    check(`${slug}: both consent boxes name this guide and start unchecked`, await page.evaluate((t) => { const f = document.querySelector('[data-guide-form]'); return [...f.querySelectorAll('[data-fconsent-collect], [data-fconsent-marketing]')].every((s) => s.textContent.includes(`the Smart Patient’s Guide to ${t}`)) && ![...f.querySelectorAll('input[type=checkbox]')].some((c) => c.checked); }, (await page.locator('main h1').innerText()).replace(/\s+/g, ' ').trim().replace(/^The Smart Patient’s Guide to\s*/, '')));
    await page.close();
  }

  // the form: required consent blocks it; with consent it sends the signup and opens the thank-you page
  const { page } = await open(ctx, LANDING, '/smart-patient-guides/hair-restoration');
  const form = page.locator('[data-guide-form]');
  await form.scrollIntoViewIfNeeded();
  const before = sent.length;
  await form.locator('input[name=email]').fill('sam@example.com');
  await form.locator('button[type=submit]').click();
  await page.waitForTimeout(500);
  check('without the required consent box nothing is sent', sent.length === before && new URL(page.url()).pathname.endsWith('/hair-restoration'));
  await form.locator('input[name=consentCollect]').check();
  await form.locator('button[type=submit]').click();
  await page.waitForURL('**/thank-you', { timeout: 8000 });
  const last = sent[sent.length - 1];
  check('with the required box it sends email (no name), the guide’s source and consent', sent.length === before + 1 && last.first_name == null && last.email === 'sam@example.com' && last.source === 'ebook_hair_restoration' && last.consent_collect === true && last.consent_marketing === false, JSON.stringify(last));
  check('it then opens that guide’s thank-you page', new URL(page.url()).pathname === '/smart-patient-guides/hair-restoration/thank-you');
  check('the thank-you page is kept out of search results', (await page.locator('meta[name="robots"]').getAttribute('content')) === 'noindex,nofollow');
  check('the thank-you page offers the assessment', (await page.locator('.gthanks__next').innerText()).includes('Ready to Explore Hair Restoration Treatment?') && /Start Free Health Assessment|Opening Soon/.test(await page.locator('.gthanks__next').innerText()));
  check('until the PDF is approved the page says it will be emailed, with no download button and no "copy sent" claim', (await page.locator('[data-guide-download]').count()) === 0 && /finishing touches/.test(await page.locator('.gthanks__card').innerText()) && !/already sent|we.ve sent|sent a copy/i.test(await page.locator('.gthanks__card').innerText()));
  await ctx.close();

  for (const [w, h, label] of [[1440, 900, 'laptop'], [390, 844, 'phone']]) {
    const c = await newContext({ viewport: { width: w, height: h } });
    for (const path of ['/smart-patient-guides', '/smart-patient-guides/nad-therapy', '/smart-patient-guides/nad-therapy/thank-you']) {
      const { page: pg } = await open(c, LANDING, path);
      check(`${label}: ${path} has no sideways scroll`, await noSideways(pg));
      await pg.close();
    }
    await c.close();
  }
}

// ====================================================================== accessibility
{
  console.log('\n== accessibility (axe: serious and critical only)');
  const ctx = await newContext();
  for (const path of ['/', '/smart-patient-guides', '/smart-patient-guides/glp-1-weight-loss', '/smart-patient-guides/glp-1-weight-loss/thank-you', '/weight-loss']) {
    const { page } = await open(ctx, LANDING, path);
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page }).exclude('astro-dev-toolbar').analyze();
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    check(`${path}`, bad.length === 0, bad.map((v) => `${v.id} (${v.nodes.length})`).join(', '));
    await page.close();
  }
  await ctx.close();
}

await browser.close();
console.log(fails ? `\n${fails} failed` : '\nAll passed');
process.exit(fails ? 1 : 0);
