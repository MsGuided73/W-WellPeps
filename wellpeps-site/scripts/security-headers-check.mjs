/**
 * W4: do the security headers in nginx.conf.template hold up against the real
 * built site? Run after `npm run build`:
 *
 *   node scripts/security-headers-check.mjs            run every check
 *   node scripts/security-headers-check.mjs --dist ../somewhere/dist
 *   node scripts/security-headers-check.mjs --headed   watch the browser
 *
 * There is no nginx binary or Docker on the dev machine, so this does NOT run
 * nginx. It reads the headers, redirect and gate straight out of the template
 * (scripts/lib/nginx-emulator.mjs applies nginx's own rules to it), serves the
 * build on a local port with exactly those headers, and drives Chromium over
 * every page and the interactive pieces, failing on any CSP violation or any
 * response missing a header. What stays unproven: the real nginx parsing the
 * file (run `nginx -t` against the rendered template when a container is
 * available).
 *
 * Exit code 1 if anything fails.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { auditCsp } from './lib/csp-audit.mjs';
import { scanDist, walkFiles } from './lib/html-scan.mjs';
import { auditHeaders, auditRedirectRule, parseNginx, renderTemplate, REQUIRED_HEADERS } from './lib/nginx-conf.mjs';
import { createNginxEmulator, listenEmulator } from './lib/nginx-emulator.mjs';
import { gateHash } from './gate-hash.mjs';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const distIdx = argv.indexOf('--dist');
const DIST = path.resolve(distIdx > -1 ? argv[distIdx + 1] : path.join(SITE, 'dist'));
const HEADED = argv.includes('--headed');
const TEMPLATE_TEXT = fs.readFileSync(path.join(SITE, 'nginx.conf.template'), 'utf8');
const GATE_PASSWORD = 'security-check-password';
const GATE_HASH = gateHash(GATE_PASSWORD);
const SUPABASE = 'https://kwgwbupqzpusydzflyvi.supabase.co';
const CANARY_HOST = 'csp-canary.invalid'; // never resolves, so a leak would be harmless

let passes = 0;
let failures = 0;
function check(name, ok, detail = '') {
  if (ok) {
    passes += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? `\n          -> ${detail}` : ''}`);
  }
}
const head = (list, n = 6) => (list.length > n ? [...list.slice(0, n), `... and ${list.length - n} more`] : list).join('\n          -> ');

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error(`No build found at ${DIST}. Run "npm run build" first.`);
  process.exit(2);
}

// ---------------------------------------------------------------- 1. static
console.log('\n1. The template, the policy and the build (no browser)');
const conf = parseNginx(renderTemplate(TEMPLATE_TEXT, { SITE_GATE_HASH: GATE_HASH }));
const { problems: headerProblems, canonical } = auditHeaders(conf);
check('every nginx location (and the server itself) sends all six security headers, with "always"', headerProblems.length === 0, head(headerProblems));
check('HSTS is max-age=31536000; includeSubDomains, without preload', canonical.get('Strict-Transport-Security') === 'max-age=31536000; includeSubDomains');
const redirectProblems = auditRedirectRule(conf);
check('the HTTP to HTTPS rule is present, guarded by X-Forwarded-Proto = "http", and returns 301 to https://$host$request_uri', redirectProblems.length === 0, head(redirectProblems));

const sourceOrigins = () => {
  const files = ['src/lib/notify.ts', 'src/lib/privacy/config.ts'].map((f) => fs.readFileSync(path.join(SITE, f), 'utf8'));
  return [...new Set(files.flatMap((t) => [...t.matchAll(/'(https:\/\/[a-z0-9.-]+)/g)].map((m) => m[1])))];
};
const CSP = canonical.get('Content-Security-Policy') ?? '';
const cspProblems = auditCsp(CSP, sourceOrigins());
check("the CSP is strict (default 'self', no unsafe-inline scripts or styles, connect-src limited to the hosts the source calls)", cspProblems.length === 0, head(cspProblems));

const scan = scanDist(DIST);
check(`the build has no inline script, <style>, event handler, frame or foreign host (${scan.pages} pages scanned)`, scan.problems.length === 0, head(scan.problems));

// --------------------------------------------------------------- 2. servers
const open = await listenEmulator(createNginxEmulator({ templateText: TEMPLATE_TEXT, root: DIST, env: {} }));
const gated = await listenEmulator(createNginxEmulator({ templateText: TEMPLATE_TEXT, root: DIST, env: { SITE_GATE_HASH: GATE_HASH } }));
const OPEN = `http://127.0.0.1:${open.port}`;
const GATED = `http://127.0.0.1:${gated.port}`;

const rawGet = (base, urlPath, headers = {}) =>
  new Promise((resolve, reject) => {
    const req = http.request(base + urlPath, { method: 'GET', headers: { Connection: 'close', ...headers } }, (res) => {
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });

const firstFile = (re) => {
  const f = walkFiles(DIST).find((p) => re.test(p.replace(/\\/g, '/')));
  return f ? `/${path.relative(DIST, f).replace(/\\/g, '/')}` : null;
};

async function headerProbes() {
  console.log('\n2. Real HTTP responses: every location answers with every header');
  const asset = firstFile(/\/_astro\/.*\.css$/);
  const image = firstFile(/\.webp$/);
  const svg = firstFile(/\.svg$/);
  const probes = [
    ['page', OPEN, '/', 200],
    ['page without trailing slash', OPEN, '/weight-loss', 301],
    ['unknown page (404)', OPEN, '/no-such-page', 404],
    ['fingerprinted asset', OPEN, asset, 200],
    ['missing asset (404)', OPEN, '/_astro/no-such.js', 404],
    ['image', OPEN, image, 200],
    ['svg', OPEN, svg, 200],
    ['dotfile (403)', OPEN, '/.env', 403],
    ['renamed program (301)', OPEN, '/peptides', 301],
    ['gate folder (404)', OPEN, '/preview-access/', 404],
    ['gate page when locked (401)', GATED, '/weight-loss/', 401],
    ['asset while locked', GATED, asset, 200],
    ['unlock, wrong hash (403)', GATED, '/__unlock', 403, { 'x-wp-gate': 'b'.repeat(64) }],
    ['unlock, right hash (204)', GATED, '/__unlock', 204, { 'x-wp-gate': GATE_HASH }],
    ['unlocked page', GATED, '/', 200, { cookie: `wp_gate=${GATE_HASH}` }],
    ['http redirect (301)', OPEN, '/weight-loss/?a=1', 301, { 'x-forwarded-proto': 'http' }],
  ];
  for (const [label, base, urlPath, status, headers] of probes) {
    if (!urlPath) { check(`${label}: (no such file in this build to probe)`, true); continue; }
    const res = await rawGet(base, urlPath, headers);
    const missing = REQUIRED_HEADERS.filter((h) => res.headers[h.toLowerCase()] !== canonical.get(h));
    check(`${label}: ${res.status} [${res.headers['x-emulator-scope']}] carries all headers`, res.status === status && missing.length === 0,
      res.status !== status ? `expected status ${status}` : `missing or different: ${missing.join(', ')}`);
  }

  const redirect = await rawGet(OPEN, '/weight-loss/?a=1', { 'x-forwarded-proto': 'http', host: 'Example.com:8080' });
  check('http redirect keeps the path and query and drops the port', redirect.headers.location === 'https://example.com/weight-loss/?a=1', redirect.headers.location);
  const https = await rawGet(OPEN, '/weight-loss/', { 'x-forwarded-proto': 'https' });
  const none = await rawGet(OPEN, '/', {});
  check('https, and a request with no X-Forwarded-Proto (health check), are served, not redirected', https.status === 200 && none.status === 200);
  const loop = await rawGet(OPEN, new URL(redirect.headers.location).pathname + new URL(redirect.headers.location).search, { 'x-forwarded-proto': 'https' });
  check('following the redirect through the proxy lands on the page (no loop)', loop.status === 200 && !loop.headers.location);
}

// --------------------------------------------------------------- 3. browser
/** Wires one browser context so every CSP violation, console error and stray request is recorded. */
async function instrument(browser, base, { viewport = { width: 1280, height: 900 }, blockUnknown = true } = {}) {
  const ctx = await browser.newContext({ viewport });
  const bag = { violations: [], consoleErrors: [], otherConsole: [], pageErrors: [], foreign: [], navigations: [], bad: [], supabase: [], responses: 0, headerGaps: [] };

  await ctx.exposeFunction('__wpCsp', (v) => bag.violations.push(v));
  await ctx.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__wpCsp?.({ directive: e.effectiveDirective, blocked: e.blockedURI, source: e.sourceFile, line: e.lineNumber, sample: e.sample, disposition: e.disposition });
    }, true);
  });

  const origin = new URL(base).origin;
  if (blockUnknown) {
    await ctx.route((url) => url.origin !== origin && !/^(data|blob|about):/.test(url.protocol), (route) => {
      const req = route.request();
      // Following a link or a meta-refresh to another site is not a subresource
      // load; only subresources and fetches count as something leaving the page.
      (req.isNavigationRequest() ? bag.navigations : bag.foreign).push(`${req.method()} ${req.url()}`);
      return route.abort();
    });
  }
  // Signup endpoint: answered locally. A real email must never be sent from a test.
  await ctx.route(`${SUPABASE}/**`, (route) => {
    const req = route.request();
    bag.supabase.push(`${req.method()} ${req.url()}`);
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: '{"ok":true}' });
  });

  const watch = (page) => {
    page.on('console', (m) => {
      if (m.type() !== 'error' && m.type() !== 'warning') return;
      // CSP messages fail the run. Any other console error is reported as a
      // note (the build has some that predate this check and are not about CSP).
      if (/Content Security Policy|Refused to/i.test(m.text())) bag.consoleErrors.push(`${page.url()} :: ${m.text().slice(0, 220)}`);
      else if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) bag.otherConsole.push(`${new URL(page.url()).pathname} :: ${m.text().slice(0, 140)}`);
    });
    page.on('pageerror', (e) => bag.pageErrors.push(`${page.url()} :: ${e.message}`));
    page.on('requestfailed', (r) => {
      const why = r.failure()?.errorText ?? '';
      if (r.url().startsWith(origin) && !/ERR_ABORTED/.test(why)) bag.bad.push(`${r.url()} failed: ${why}`);
    });
    page.on('response', (r) => {
      if (!r.url().startsWith(origin)) return;
      bag.responses += 1;
      if (r.status() >= 400 && !r.url().endsWith('/__unlock')) bag.bad.push(`${r.status()} ${r.url()}`);
      const h = r.headers();
      const gaps = REQUIRED_HEADERS.filter((name) => h[name.toLowerCase()] !== canonical.get(name));
      if (gaps.length) bag.headerGaps.push(`${r.url()} lacks ${gaps.join(', ')}`);
    });
  };
  return { ctx, bag, watch };
}

const settle = (page, ms = 250) => page.waitForTimeout(ms);

/** Every page in the build, as URLs. */
function pageUrls() {
  return walkFiles(DIST)
    .filter((f) => f.endsWith('.html'))
    .map((f) => {
      const rel = path.relative(DIST, f).replace(/\\/g, '/');
      return rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? `/${rel.slice(0, -'index.html'.length)}` : `/${rel}`;
    })
    // The gate page is not a public route (nginx answers 404 for it, and serves
    // it only as the 401 page): section 5 covers it.
    .filter((url) => url !== '/preview-access/')
    .sort();
}

async function crawl(browser) {
  const urls = pageUrls();
  console.log(`\n3. Every page in the build (${urls.length}) loads under the policy`);
  const { ctx, bag, watch } = await instrument(browser, OPEN);
  const page = await ctx.newPage();
  watch(page);
  const notOk = [];
  for (const url of urls) {
    const res = await page.goto(OPEN + url, { waitUntil: 'networkidle' });
    // Scroll through the page so lazy images and scroll-reveal code run.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
      window.scrollTo(0, 0);
    });
    await settle(page, 120);
    if (!res || res.status() !== 200) notOk.push(`${url} -> ${res?.status()}`);
  }
  check(`all ${urls.length} pages answer 200`, notOk.length === 0, head(notOk));
  check('no Content-Security-Policy violation on any page', bag.violations.length === 0, head(bag.violations.map((v) => `${v.directive} blocked ${v.blocked} (${v.sample || v.source || ''})`)));
  check('no CSP message in the console, and no uncaught script exception', bag.consoleErrors.length + bag.pageErrors.length === 0, head([...bag.consoleErrors, ...bag.pageErrors]));
  check('no request left for another host (fonts, analytics or anything else)', bag.foreign.length === 0, head(bag.foreign));
  const notes = [...new Set(bag.otherConsole)];
  if (notes.length) console.log(`  NOTE  ${notes.length} console error(s) unrelated to CSP, present in the build:\n          ${head(notes, 3)}`);
  if (bag.navigations.length) console.log(`  NOTE  pages that send the visitor to another site by redirect stub: ${[...new Set(bag.navigations)].join(', ')}`);
  check('no failed request and no 4xx/5xx for a resource of the site', bag.bad.length === 0, head([...new Set(bag.bad)]));
  check(`every response (${bag.responses}: pages, scripts, styles, images, fonts) carries all six headers`, bag.headerGaps.length === 0, head([...new Set(bag.headerGaps)]));
  await ctx.close();
}

async function step(name, bag, fn) {
  const before = bag.violations.length + bag.consoleErrors.length + bag.pageErrors.length;
  try {
    await fn();
    const after = bag.violations.length + bag.consoleErrors.length + bag.pageErrors.length;
    check(name, after === before, head([...bag.violations.slice(before), ...bag.consoleErrors, ...bag.pageErrors].map((v) => (typeof v === 'string' ? v : `${v.directive} blocked ${v.blocked}`)), 3));
  } catch (err) {
    check(name, false, String(err.message).split('\n')[0]);
  }
}

async function interactions(browser) {
  console.log('\n4. Interactive pieces work under the policy (no violation while used)');
  const { ctx, bag, watch } = await instrument(browser, OPEN);
  const page = await ctx.newPage();
  watch(page);

  await page.goto(`${OPEN}/`, { waitUntil: 'networkidle' });
  await step('privacy panel: opens from the footer, a switch changes, Escape closes', bag, async () => {
    const link = page.locator('footer a[data-privacy-open]').first();
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await page.locator('dialog[data-privacy-dialog][open]').waitFor({ timeout: 5000 });
    await page.locator('dialog[data-privacy-dialog] [data-pc-toggle="analytics"]').check();
    await settle(page);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[data-privacy-dialog]')?.open);
  });

  await step('assistant: opens, answers a suggested question and a typed one', bag, async () => {
    await page.locator('[data-wa-toggle]').click();
    await page.locator('[data-wa-panel]:not([hidden])').waitFor();
    const messages = () => page.locator('[data-wa-log] .wa__msg').count();
    const start = await messages();
    await page.locator('[data-wa-chip]').first().click();
    await page.waitForFunction((n) => document.querySelectorAll('[data-wa-log] .wa__msg').length > n, start);
    const afterChip = await messages();
    await page.locator('[data-wa-input]').fill('How does the free health assessment work?');
    await page.locator('[data-wa-form] button[type="submit"]').click();
    await page.waitForFunction((n) => document.querySelectorAll('[data-wa-log] .wa__msg').length > n, afterChip);
    await page.locator('[data-wa-close]').click();
  });

  await step('footer newsletter: submits to the Supabase signup function (answered locally) and confirms', bag, async () => {
    const before = bag.supabase.length;
    const form = page.locator('form[data-newsletter]').first();
    await form.scrollIntoViewIfNeeded();
    await form.locator('input[name="email"]').fill('csp-check@example.com');
    await form.locator('button[type="submit"]').click();
    await page.locator('[data-newsletter-success]:not([hidden])').first().waitFor({ timeout: 5000 });
    if (!bag.supabase.slice(before).some((r) => r.startsWith('POST') && r.includes('/functions/v1/notify-signup'))) throw new Error('the signup request never left the page');
  });

  await step('FAQ accordion and scroll reveal run', bag, async () => {
    const faq = page.locator('[data-faq] button').first();
    await faq.scrollIntoViewIfNeeded();
    await faq.click();
    await page.waitForFunction(() => document.querySelector('[data-faq] button')?.getAttribute('aria-expanded') === 'true');
  });

  await page.goto(`${OPEN}/wellness-learning-center/`, { waitUntil: 'networkidle' });
  await step('learning center: the search box finds articles (script moved out of the page)', bag, async () => {
    await page.locator('[data-search]').fill('glp');
    await page.locator('[data-results]:not([hidden]) [data-results-list] li').first().waitFor({ timeout: 5000 });
    const form = page.locator('form.lc-search');
    await page.locator('[data-search]').press('Enter'); // must not reload or navigate
    await settle(page, 150);
    if (!page.url().endsWith('/wellness-learning-center/')) throw new Error(`Enter navigated to ${page.url()}`);
    if (await form.count() !== 1) throw new Error('search form disappeared');
  });
  await step('eBook dialog: opens, takes an email, submits to the signup function and shows the confirmation', bag, async () => {
    const before = bag.supabase.length;
    const open = page.locator('[data-ebook-open]:visible').first();
    await open.scrollIntoViewIfNeeded();
    await open.click();
    await page.locator('dialog[data-ebook-dialog][open]').waitFor({ timeout: 5000 });
    await page.locator('dialog[data-ebook-dialog] input[name="email"]').fill('csp-check@example.com');
    await page.locator('dialog[data-ebook-dialog] [data-ebook-form] button[type="submit"]').click();
    await page.locator('[data-ebook-done]:not([hidden])').waitFor({ timeout: 5000 });
    if (!bag.supabase.slice(before).some((r) => r.startsWith('POST'))) throw new Error('the signup request never left the page');
    await page.locator('dialog[data-ebook-dialog] [data-ebook-close]').click();
  });

  await page.goto(`${OPEN}/weight-loss/`, { waitUntil: 'networkidle' });
  await step('checkout lock: the assessment button opens the password box, a wrong password shows the error', bag, async () => {
    const button = page.locator('a[data-checkout-lock]:visible').first();
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await page.locator('dialog[data-checkout-dialog][open]').waitFor({ timeout: 5000 });
    await page.locator('dialog[data-checkout-dialog] input[name="password"]').fill('not-the-password');
    await page.locator('dialog[data-checkout-dialog] [data-checkout-submit]').click();
    await page.locator('[data-checkout-error]:not([hidden])').waitFor({ timeout: 10000 });
    await page.locator('[data-checkout-close]').click();
  });

  await page.goto(`${OPEN}/hormone-optimization/`, { waitUntil: 'networkidle' });
  await step('waitlist form: submits to the signup function and confirms', bag, async () => {
    const before = bag.supabase.length;
    const form = page.locator('form[data-waitlist]').first();
    await form.scrollIntoViewIfNeeded();
    await form.locator('input[name="firstName"]').fill('Csp');
    await form.locator('input[name="email"]').fill('csp-check@example.com');
    await form.locator('button[type="submit"]').click();
    await page.locator('[data-waitlist-success]:not([hidden])').first().waitFor({ timeout: 5000 });
    if (!bag.supabase.slice(before).some((r) => r.startsWith('POST'))) throw new Error('the signup request never left the page');
  });

  await page.goto(`${OPEN}/your-privacy-choices/`, { waitUntil: 'networkidle' });
  await step('Your Privacy Choices page: switches work and the request form validates and offers the email fallback', bag, async () => {
    await page.locator('[data-variant="page"] [data-pc-toggle="analytics"]').check();
    await page.locator('#request-form input[name="types"]').first().check();
    await page.locator('#pr-name').fill('Test Person');
    await page.locator('#pr-email').fill('csp-check@example.com');
    await page.locator('#request-form button[type="submit"]').click();
    await settle(page, 500);
  });
  check('the signup and consent calls only ever went to the one Supabase project', bag.supabase.every((r) => r.includes(SUPABASE)), head(bag.supabase));
  check('nothing else tried to leave the browser during the interactions', bag.foreign.length === 0, head(bag.foreign));
  check('every response during the interactions carried all six headers', bag.headerGaps.length === 0, head([...new Set(bag.headerGaps)]));
  await ctx.close();

  // A phone-width window: the menu button opens the menu.
  const phone = await instrument(browser, OPEN, { viewport: { width: 390, height: 844 } });
  const mobile = await phone.ctx.newPage();
  phone.watch(mobile);
  await mobile.goto(`${OPEN}/`, { waitUntil: 'networkidle' });
  await step('phone width: the menu button opens and closes the navigation', phone.bag, async () => {
    await mobile.locator('[data-nav-toggle]').click();
    await mobile.waitForFunction(() => document.querySelector('[data-nav]')?.classList.contains('nav-open'));
    await mobile.locator('[data-nav-toggle]').click();
    await mobile.waitForFunction(() => !document.querySelector('[data-nav]')?.classList.contains('nav-open'));
  });
  await phone.ctx.close();
}

async function gatePage(browser) {
  console.log('\n5. The locked-preview page (gate on) renders and its script runs under the policy');
  const { ctx, bag, watch } = await instrument(browser, GATED);
  const page = await ctx.newPage();
  watch(page);
  const res = await page.goto(`${GATED}/weight-loss/`, { waitUntil: 'networkidle' });
  check('a locked URL answers 401 with the gate page, at the visitor\'s own URL', res?.status() === 401 && page.url().endsWith('/weight-loss/') && (await page.locator('[data-gate-form]').count()) === 1);
  const unlockSeen = [];
  page.on('response', (r) => { if (r.url().endsWith('/__unlock')) unlockSeen.push(r.status()); });
  await page.locator('#gate-password').fill('wrong-password');
  await page.locator('[data-gate-submit]').click();
  await page.waitForFunction(() => /isn.t right/.test(document.querySelector('[data-gate-status]')?.textContent ?? ''), null, { timeout: 8000 }).catch(() => {});
  check('the gate script runs (inline script is gone) and a wrong password is refused with 403', unlockSeen.includes(403), `unlock statuses: ${unlockSeen.join(',') || 'none'}`);
  await page.locator('#gate-password').fill(GATE_PASSWORD);
  await page.locator('[data-gate-submit]').click();
  await settle(page, 800);
  check('the right password is accepted (204) and sets the cookie header', unlockSeen.includes(204), `unlock statuses: ${unlockSeen.join(',') || 'none'}`);
  check('no CSP violation or script error on the gate page', bag.violations.length + bag.consoleErrors.length + bag.pageErrors.length === 0, head([...bag.violations.map((v) => `${v.directive} blocked ${v.blocked}`), ...bag.consoleErrors, ...bag.pageErrors]));
  check('every response on the gate page carried all six headers', bag.headerGaps.length === 0, head([...new Set(bag.headerGaps)]));
  await ctx.close();
}

/** The check itself must be able to fail: things the policy forbids must be reported by the browser. */
async function canaries(browser) {
  console.log('\n6. Canaries: the browser really enforces the policy (so a green run means something)');
  const { ctx, bag, watch } = await instrument(browser, OPEN, { blockUnknown: true });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(`${OPEN}/`, { waitUntil: 'networkidle' });
  const before = bag.violations.length;
  const out = await page.evaluate((canaryHost) => {
    const result = {};
    window.__ran = false;
    const s = document.createElement('script');
    s.textContent = 'window.__ran = true';
    document.head.appendChild(s);
    result.inlineScriptRan = window.__ran === true;

    window.__handler = false;
    const b = document.createElement('button');
    b.setAttribute('onclick', 'window.__handler = true');
    document.body.appendChild(b);
    b.click();
    result.inlineHandlerRan = window.__handler === true;

    // A direct eval() here would run with the DevTools protocol's own
    // exemption, so string-to-code goes through setTimeout like page code would.
    window.__evalRan = false;
    setTimeout('window.__evalRan = true', 0);

    const st = document.createElement('style');
    st.textContent = 'body { outline: 9px solid red; }';
    document.head.appendChild(st);
    result.styleElementApplied = getComputedStyle(document.body).outlineStyle === 'solid';

    const d = document.createElement('div');
    d.setAttribute('style', 'width:7px;height:7px;position:fixed;left:0;top:0');
    document.body.appendChild(d);
    result.styleAttributeApplied = d.getBoundingClientRect().width === 7;

    fetch(`https://${canaryHost}/x`).catch(() => {});
    new Image().src = `https://${canaryHost}/a.png`;
    const f = document.createElement('iframe');
    f.src = '/';
    document.body.appendChild(f);
    const form = document.createElement('form');
    form.action = `https://${canaryHost}/post`;
    form.method = 'post';
    document.body.appendChild(form);
    try { form.submit(); } catch { /* blocked */ }
    const base = document.createElement('base');
    base.href = `https://${canaryHost}/`;
    document.head.appendChild(base);
    return result;
  }, CANARY_HOST);
  // Violation reports reach Node asynchronously: wait until all nine are in, or give up.
  const EXPECTED = ['script-src-elem', 'script-src-attr', 'script-src', 'style-src-elem', 'connect-src', 'img-src', 'frame-src', 'form-action', 'base-uri'];
  const seenNow = () => new Set(bag.violations.slice(before).map((v) => v.directive));
  for (let i = 0; i < 40 && !EXPECTED.every((d) => seenNow().has(d)); i += 1) await settle(page, 100);
  await settle(page, 200);
  out.evalRan = await page.evaluate(() => window.__evalRan === true);
  const seen = seenNow();
  const expectBlocked = (what, directive) => check(`blocked: ${what} (${directive})`, seen.has(directive), `violations seen: ${[...seen].join(', ') || 'none'}`);
  expectBlocked('an inline <script> added by script', 'script-src-elem');
  expectBlocked('an inline onclick handler', 'script-src-attr');
  expectBlocked('a string run as code (setTimeout with a string, the eval family)', 'script-src');
  expectBlocked('an injected <style> element', 'style-src-elem');
  expectBlocked('a fetch to another host', 'connect-src');
  expectBlocked('an image from another host', 'img-src');
  expectBlocked('an iframe', 'frame-src');
  expectBlocked('a form posting to another host', 'form-action');
  expectBlocked('an injected <base> tag', 'base-uri');
  check('the blocked inline script, handler, eval and style element did not run', !out.inlineScriptRan && !out.inlineHandlerRan && !out.evalRan && !out.styleElementApplied, JSON.stringify(out));
  check('allowed on purpose: a style="" attribute still applies, with no violation', out.styleAttributeApplied && !seen.has('style-src-attr'), JSON.stringify(out));
  check('nothing reached the canary host (the browser stopped every request itself)', bag.foreign.length === 0, head(bag.foreign));
  await ctx.close();
}

// -------------------------------------------------------------------- main
let exit = 0;
try {
  await headerProbes();
  const browser = await chromium.launch({ headless: !HEADED });
  try {
    await crawl(browser);
    await interactions(browser);
    await gatePage(browser);
    await canaries(browser);
  } finally {
    await browser.close();
  }
} catch (err) {
  console.error(err);
  exit = 1;
} finally {
  await open.close();
  await gated.close();
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(exit || (failures ? 1 : 0));
