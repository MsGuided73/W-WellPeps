/**
 * The health-topic sign-up forms ask for consent properly (W9). The sign-up endpoint is
 * intercepted, so nothing is really sent.   node scripts/forms-consent-check.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv.find((a) => a.startsWith('http')) || 'http://localhost:4321';
let fails = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); if (!ok) fails++; };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const sent = [];
await ctx.route('**/functions/v1/notify-signup', async (route) => {
  sent.push(JSON.parse(route.request().postData() || '{}'));
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' });
});
const hide = '.pbanner{display:none!important} astro-dev-toolbar{display:none!important} .wa{display:none!important}';

// ---------------------------------------------------------------- guide landing forms
// The guide funnel's form is the only guide sign-up since the email dialog was removed (2026-10-12).
for (const [slug, title] of [['glp-1-weight-loss', 'GLP-1 Weight Loss'], ['hair-restoration', 'Hair Restoration']]) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/smart-patient-guides/${slug}`, { waitUntil: 'load' });
  await page.addStyleTag({ content: hide });
  const form = page.locator('form[data-guide-form]');
  await form.scrollIntoViewIfNeeded();
  // No required box since 2026-10-16 (counsel, ATT-038): one optional box and a short notice.
  const marketing = await form.locator('[data-fconsent-marketing]').innerText();
  const notice = await form.locator('[data-fconsent-notice]').innerText();
  check(`${slug}: no required consent box`, (await form.locator('input[name=consentCollect]').count()) === 0);
  check(`${slug}: the optional box is marked optional, says what it is for, and starts unchecked`, marketing.startsWith('Optional:') && marketing.includes('based on the guide I requested') && !(await form.locator('input[name=consentMarketing]').isChecked()), marketing);
  check(`${slug}: the notice says what the email is for and how to unsubscribe, without asking for agreement`, notice.includes('send the guide you requested') && /unsubscribe/.test(notice) && !/agree/i.test(notice), notice);
  check(`${slug}: the form links the Privacy Policy and Your Privacy Choices`, (await form.locator('a[href^="/privacy-policy"]').count()) > 0 && (await form.locator('a[href^="/your-privacy-choices"]').count()) > 0);
  const before = sent.length;
  await form.locator('input[name=email]').fill(`${slug}@example.com`);
  const wantMarketing = slug === 'hair-restoration';
  if (wantMarketing) await form.locator('input[name=consentMarketing]').check();
  await form.locator('button[type=submit]').click();
  await page.waitForURL('**/thank-you**', { timeout: 8000 });
  const last = sent[sent.length - 1];
  check(`${slug}: it sends once with the optional choice as given and no collection consent`, sent.length === before + 1 && !('consent_collect' in last) && last.consent_marketing === wantMarketing, JSON.stringify(last));
  await page.close();
}

// ---------------------------------------------------------------- waitlist and hair notify
for (const [path, selector, label, topicRe] of [
  ['/hormone-optimization', 'form[data-waitlist]', 'waitlist', /Hormone Optimization/],
  ['/hair-restoration', 'form[data-hair-notify]', 'hair notify', /hair restoration/],
]) {
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'load' });
  await page.addStyleTag({ content: hide });
  const form = page.locator(selector).first();
  if ((await form.count()) === 0) {
    // The hair notify band only renders while HAIR_COMING_SOON is on; the unit test still pins that it carries the consent.
    console.log(`SKIP  ${label}: not shown on ${path} (its coming-soon flag is off)`);
    await page.close();
    continue;
  }
  await form.scrollIntoViewIfNeeded();
  const collect = await form.locator('[data-fconsent-collect]').innerText();
  check(`${label}: required consent names the topic`, topicRe.test(collect), collect.slice(0, 110));
  check(`${label}: both boxes start unchecked`, !(await form.locator('input[name=consentCollect]').isChecked()) && !(await form.locator('input[name=consentMarketing]').isChecked()));
  const before = sent.length;
  await form.locator('input[name=email]').fill('someone@example.com');
  if (await form.locator('input[name=firstName]').count()) await form.locator('input[name=firstName]').fill('Sam');
  await form.locator('button[type=submit]').click();
  await page.waitForTimeout(400);
  check(`${label}: without the required box nothing is sent`, sent.length === before);
  await form.locator('input[name=consentCollect]').check();
  await form.locator('button[type=submit]').click();
  await page.waitForTimeout(700);
  const last = sent[sent.length - 1];
  check(`${label}: with the required box it is sent, optional consent false`, sent.length === before + 1 && last.consent_collect === true && last.consent_marketing === false, JSON.stringify(last));
  await page.close();
}

// ---------------------------------------------------------------- footer newsletter and phone layout
{
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  const note = await page.locator('footer .newsletter__consent').innerText();
  check('footer newsletter states what subscribing means and links the policies', /monthly email/.test(note) && (await page.locator('footer .newsletter__consent a[href="/privacy-policy"]').count()) === 1, note.replace(/\n/g, ' ').slice(0, 120));
  await page.setViewportSize({ width: 390, height: 844 });
  for (const p of ['/', '/hormone-optimization', '/hair-restoration']) {
    await page.goto(BASE + p, { waitUntil: 'load' });
    check(`phone: ${p} has no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  }
  await page.close();
}

await browser.close();
console.log(fails ? `\n${fails} failed` : '\nAll passed');
process.exit(fails ? 1 : 0);
