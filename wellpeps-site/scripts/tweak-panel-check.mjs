/**
 * Drives the dev-only Tweak panel in a real browser (needs `npm run dev`).
 *   node scripts/tweak-panel-check.mjs [baseUrl]
 * Exit code 1 if anything fails.
 */
import { chromium } from 'playwright';

const BASE = process.argv.find((a) => a.startsWith('http')) || 'http://localhost:4321';
let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  if (!ok) fails++;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
// Astro's own dev toolbar logs "Error while running audit's match function" when
// it cannot fetch; that is not this panel, so it is left out.
page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource|Error while running audit/.test(m.text()) && errors.push(m.text()));

const open = () => page.keyboard.press('Alt+t');
const panel = page.locator('[data-panel]');
const css = (sel, prop) => page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s))[p], [sel, prop]);
const out = () => page.locator('[data-out]').inputValue();
const pick = async (selector) => {
  await page.locator('[data-pick]').click();
  await page.locator(selector).first().hover();
  await page.locator(selector).first().click({ force: true });
};

await page.goto(`${BASE}/weight-loss`, { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await page.addStyleTag({ content: '.pbanner{display:none!important}' });

// ---- opening ----------------------------------------------------------------
check('starts closed: only a small button is visible', (await panel.isHidden()) && (await page.locator('[data-pill]').isVisible()));
const widthBefore = await page.evaluate(() => document.documentElement.scrollWidth);
const sheetsBefore = await page.evaluate(() => document.styleSheets.length);
await open();
check('Alt+T opens the panel', await panel.isVisible());
check('opening it adds no sideways scroll to the page', (await page.evaluate(() => document.documentElement.scrollWidth)) === widthBefore);
check('the panel adds no style sheet to the page (it is isolated)', (await page.evaluate(() => document.styleSheets.length)) === sheetsBefore);

// ---- picking and the source stamp -------------------------------------------
const hrefBefore = page.url();
await pick('.nav__links > a:first-child');
check('picking a link selects it instead of following it', page.url() === hrefBefore);
const card = await page.locator('[data-selected] .card').innerText();
check('shows the source file and line', /NavBar\.astro:\d+/.test(card), card.replace(/\n/g, ' | '));
const selText = await page.locator('[data-selected] code').innerText();
check('the selector matches exactly one element', (await page.locator(selText).count()) === 1, selText);

// ---- changing things ---------------------------------------------------------
const linkSel = selText;
const fsBefore = await css(linkSel, 'fontSize');
await page.locator('[data-f="font-size"]').fill('26');
check('font size changes live', (await css(linkSel, 'fontSize')) === '26px', `${fsBefore} -> 26px`);
await page.locator('[data-f="color"]').fill('#e5484d');
check('text colour changes live', (await css(linkSel, 'color')) === 'rgb(229, 72, 77)');
await page.locator('[data-f="padding-top"]').fill('12');
check('spacing changes live', (await css(linkSel, 'paddingTop')) === '12px');
await page.locator('[data-hide]').check();
check('hide removes it from the page', (await css(linkSel, 'display')) === 'none');
await page.locator('[data-hide]').uncheck();
check('un-hide brings it back', (await css(linkSel, 'display')) !== 'none');
check('a put-back arrow appears on a changed field', await page.locator('[data-rv="font-size"]').isVisible());
check('the changed list names the element and the badge counts it', /1/.test(await page.locator('[data-badge]').innerText()) || (await page.locator('[data-changes]').innerText()).includes('1 change'));

// ---- wording ------------------------------------------------------------------
const original = (await page.evaluate((s) => document.querySelector(s).textContent, linkSel)).trim();
await page.locator('[data-text]').fill('Tweaked wording');
check('wording changes live', (await page.evaluate((s) => document.querySelector(s).textContent, linkSel)) === 'Tweaked wording');

// ---- the change list ------------------------------------------------------------
await page.locator('[data-f="font-size"]').fill('14');
const list = await (async () => {
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  await page.locator('[data-copy]').click();
  return out();
})();
check('change list names the page and the window width', /# Site tweaks for \/weight-loss/.test(list) && /1500px/.test(list));
check('change list names the source file', /Source: src\/components\/NavBar\.astro:\d+/.test(list));
check('change list has each value, old and new', list.includes('→ #e5484d') && list.includes('→ 14px') && list.includes('padding-top:'));
check('change list has the wording change', list.includes(`Text: "${original}" → "Tweaked wording"`));
check('change list warns about going under the 19px floor', list.includes('WARNING: below the site'));
check('change list notes wording needs the claims scan', list.includes('LegitScript claims scan'));
const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => null);
// Windows stores line breaks as CRLF on the clipboard.
check('Copy puts the list on the clipboard', clip !== null && clip.replace(/\r\n/g, '\n') === list, clip === null ? 'clipboard unavailable' : '');

// ---- survives a reload --------------------------------------------------------------
await page.reload({ waitUntil: 'load' });
await page.addStyleTag({ content: '.pbanner{display:none!important}' });
check('a reload keeps the preview', (await css(linkSel, 'fontSize')) === '14px' && (await page.evaluate((s) => document.querySelector(s).textContent, linkSel)) === 'Tweaked wording');
check('the badge shows what was restored', (await page.locator('[data-badge]').innerText()) === '1');

// ---- reset ----------------------------------------------------------------------------
await open();
await page.locator('[data-reset-all]').click();
check('Reset all puts the wording back', (await page.evaluate((s) => document.querySelector(s).textContent, linkSel)).trim() === original);
check('Reset all puts the size back', (await css(linkSel, 'fontSize')) === fsBefore);
check('Reset all leaves no inline style behind', (await page.evaluate((s) => document.querySelector(s).getAttribute('style'), linkSel)) === null);
await page.reload({ waitUntil: 'load' });
check('after a reset a reload brings nothing back', (await css(linkSel, 'fontSize')) === fsBefore);

// ---- undo one element + edit on the page ----------------------------------------------------
await page.addStyleTag({ content: '.pbanner{display:none!important}' });
await open();
await pick('.nav__links > a:nth-child(2)');
const sel2 = await page.locator('[data-selected] code').innerText();
await page.locator('[data-f="font-size"]').fill('30');
await page.locator('[data-undo]').click();
check('Undo this element restores it', (await css(sel2, 'fontSize')) === fsBefore);
await page.locator('[data-edit]').click();
await page.keyboard.type('Typed on page');
await page.keyboard.press('Enter');
check('typing on the page changes the words', (await page.evaluate((s) => document.querySelector(s).textContent, sel2)) === 'Typed on page');
check('contenteditable is removed afterwards', (await page.evaluate((s) => document.querySelector(s).getAttribute('contenteditable'), sel2)) === null);
await page.locator('[data-copy]').click();
check('the on-page edit shows in the change list', (await out()).includes('Text: "') && (await out()).includes('→ "Typed on page"'));

// ---- elements with markup inside ----------------------------------------------------------------
// Clicking a heading selects the element under the pointer (a span inside it);
// "Select parent" climbs to the heading, which holds other elements.
await pick('h1');
check('clicking a heading selects what is under the pointer', /^span/.test(await page.locator('[data-selected] .lbl').innerText()));
await page.locator('[data-parent]').click();
check('Select parent climbs to the heading', /^h1/.test(await page.locator('[data-selected] .lbl').innerText()));
check(
  'a heading holding other elements gets on-page editing only',
  (await page.locator('[data-text]').count()) === 0 && /holds other elements/.test(await page.locator('[data-selected]').innerText()),
);
await page.locator('[data-f="font-size"]').fill('44');
check('the heading can be restyled', (await css('h1', 'fontSize')) === '44px');
await page.locator('[data-undo]').click();

// ---- closing --------------------------------------------------------------------------------------------
await page.keyboard.press('Escape');
await open();
check('Alt+T closes the panel again', await panel.isHidden());
await page.locator('[data-pill]').click();
await page.locator('[data-reset-all]').click();

check('no script errors', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();
console.log(fails ? `\n${fails} failed` : '\nAll passed');
process.exit(fails ? 1 : 0);
