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

// ---------------------------------------------------------------- guide dialog
{
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.addStyleTag({ content: hide });
  const openers = page.locator('[data-ebook-open]');
  const slugs = await openers.evaluateAll((els) => [...new Set(els.map((e) => e.dataset.ebookOpen))]);
  check('the home page offers more than one guide', slugs.length > 1, slugs.join(','));

  await page.locator(`[data-ebook-open="${slugs[0]}"]`).first().click();
  const dialog = page.locator('[data-ebook-dialog][open]');
  await dialog.waitFor();
  const title = (await dialog.locator('[data-ebook-name]').innerText()).trim();
  const collect = await dialog.locator('[data-fconsent-collect]').innerText();
  const marketing = await dialog.locator('[data-fconsent-marketing]').innerText();
  check('required consent names the guide topic and no first name', collect.includes(title) && !/first name/i.test(collect), collect.slice(0, 120));
  check('optional consent names the topic and says declining costs nothing', marketing.includes(title) && /does not change what I get/.test(marketing));
  check('both boxes start unchecked', !(await dialog.locator('input[name=consentCollect]').isChecked()) && !(await dialog.locator('input[name=consentMarketing]').isChecked()));
  check('the old bundled "by continuing you agree" line is gone', !/By continuing you agree/i.test(await dialog.innerText()));
  check('the dialog links the Privacy Policy and Your Privacy Choices', (await dialog.locator('a[href="/privacy-policy"]').count()) > 0 && (await dialog.locator('a[href="/your-privacy-choices"]').count()) > 0);

  await dialog.locator('input[name=email]').fill('person@example.com');
  await dialog.locator('button[type=submit]').click();
  await page.waitForTimeout(400);
  check('without the required box nothing is sent', sent.length === 0, String(sent.length));

  await dialog.locator('input[name=consentCollect]').check();
  await dialog.locator('button[type=submit]').click();
  await page.waitForFunction(() => document.querySelector('[data-ebook-done]:not([hidden])'), null, { timeout: 8000 });
  check('with only the required box, the optional consent is sent as false', sent.length === 1 && sent[0].consent_collect === true && sent[0].consent_marketing === false, JSON.stringify(sent[0]));
  check('the wording version is sent', /draft/.test(sent[0]?.consent_text_version || ''), sent[0]?.consent_text_version);

  await dialog.locator('[data-ebook-close]').click();
  await page.locator(`[data-ebook-open="${slugs[1]}"]`).first().click();
  const dialog2 = page.locator('[data-ebook-dialog][open]');
  await dialog2.waitFor();
  const title2 = (await dialog2.locator('[data-ebook-name]').innerText()).trim();
  check('another guide changes the topic in the consent text', title2 !== title && (await dialog2.locator('[data-fconsent-collect]').innerText()).includes(title2), title2);
  check('and the boxes start unchecked again', !(await dialog2.locator('input[name=consentCollect]').isChecked()));
  await dialog2.locator('input[name=email]').fill('person2@example.com');
  await dialog2.locator('input[name=consentCollect]').check();
  await dialog2.locator('input[name=consentMarketing]').check();
  await dialog2.locator('button[type=submit]').click();
  await page.waitForFunction(() => sessionStorage && true);
  await page.waitForTimeout(500);
  check('with both boxes, both are sent as true', sent.length === 2 && sent[1].consent_marketing === true && sent[1].consent_collect === true, JSON.stringify(sent[1]));
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
