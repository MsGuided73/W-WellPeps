/**
 * W4: security headers in nginx.conf.template, checked WITHOUT running nginx
 * (there is no nginx or Docker on the dev machine). The template is parsed
 * with scripts/lib/nginx-conf.mjs, which follows nginx's add_header
 * inheritance rule, and requests are answered by scripts/lib/nginx-emulator.mjs,
 * which reads its behaviour from the same template.
 *
 * What this cannot prove: that the real nginx accepts the file. The headers,
 * redirect and gate are exercised through an emulator, and the CSP in a real
 * browser by scripts/security-headers-check.mjs; `nginx -t` has not been run.
 */
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import astroConfig from '../../astro.config.mjs';
import { auditCsp } from '../../scripts/lib/csp-audit.mjs';
import { scanCss, scanHtml } from '../../scripts/lib/html-scan.mjs';
import {
  REQUIRED_HEADERS,
  auditHeaders,
  auditRedirectRule,
  blocksOf,
  findServer,
  parseCsp,
  parseNginx,
  renderTemplate,
  responseScopes,
} from '../../scripts/lib/nginx-conf.mjs';
import { createNginxEmulator } from '../../scripts/lib/nginx-emulator.mjs';
import { CONSENT_LOG_ENDPOINT, PRIVACY_REQUEST_ENDPOINT } from './privacy/config';
import { NOTIFY_ENDPOINT } from './notify';

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REPO = resolve(SITE, '..');
// Unix line endings regardless of how git checked the file out: with autocrlf a Windows checkout
// has CRLF, and the mutation tests below rewrite the text by matching on "\n".
const TEMPLATE = readFileSync(join(SITE, 'nginx.conf.template'), 'utf8').replace(/\r\n/g, '\n');
const HASH = 'a'.repeat(64);
const GATE_HEADER = 'x-wp-gate';

const parseTemplate = (text = TEMPLATE, hash = HASH) => parseNginx(renderTemplate(text, { SITE_GATE_HASH: hash }));
const connectOrigins = () =>
  [NOTIFY_ENDPOINT, CONSENT_LOG_ENDPOINT, PRIVACY_REQUEST_ENDPOINT].filter(Boolean).map((u) => new URL(u).origin);

describe('security headers: every response scope in the template', () => {
  test('every location, and the server itself, is audited', () => {
    const root = parseTemplate();
    const labels = responseScopes(root).map((s) => s.label);
    const locations = blocksOf(findServer(root), 'location');
    expect(locations.length).toBeGreaterThanOrEqual(8);
    for (const loc of locations) expect(labels).toContain(`location ${loc.args.join(' ')}`);
    expect(labels).toContain('server');
    // The unlock reply sets a cookie from an `if` block with its own headers.
    expect(labels.some((l) => l.startsWith('location @gate_unlock > if'))).toBe(true);
  });

  test('each carries every required header, with "always", and all agree on the value', () => {
    expect(auditHeaders(parseTemplate()).problems).toEqual([]);
  });

  test('the five headers named by W4 are all required', () => {
    for (const name of [
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
    ]) {
      expect(REQUIRED_HEADERS).toContain(name);
    }
  });

  test('HSTS is one year with subdomains and has no preload', () => {
    const hsts = auditHeaders(parseTemplate()).canonical.get('Strict-Transport-Security') ?? '';
    expect(hsts).toBe('max-age=31536000; includeSubDomains');
    expect(hsts.toLowerCase()).not.toContain('preload');
  });

  test('the simple headers keep their values', () => {
    const { canonical } = auditHeaders(parseTemplate());
    expect(canonical.get('X-Content-Type-Options')).toBe('nosniff');
    expect(canonical.get('X-Frame-Options')).toBe('DENY');
    expect(canonical.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    const permissions = canonical.get('Permissions-Policy') ?? '';
    for (const feature of ['camera=()', 'microphone=()', 'geolocation=()']) expect(permissions).toContain(feature);
  });

  describe('the audit is not vacuous (broken copies of the template are caught)', () => {
    const problemsFor = (mutate: (t: string) => string) => auditHeaders(parseTemplate(mutate(TEMPLATE))).problems;
    const CSP_LINE = '        add_header Content-Security-Policy $wp_csp always;\n';

    test('a missing header in a location that replaces the inherited set', () => {
      // The /_astro/ block is the first one carrying the line after its Cache-Control.
      const broken = (t: string) => t.replace(`add_header Cache-Control "public, immutable";\n${CSP_LINE}`, 'add_header Cache-Control "public, immutable";\n');
      expect(broken(TEMPLATE)).not.toBe(TEMPLATE);
      const problems = problemsFor(broken);
      expect(problems).toContain('location /_astro/: missing Content-Security-Policy');
    });

    test('a location that adds a header of its own and forgets the rest', () => {
      const broken = (t: string) => t.replace('location = /peptides {\n', 'location = /peptides {\n        add_header Cache-Control "no-store" always;\n');
      expect(broken(TEMPLATE)).not.toBe(TEMPLATE);
      const problems = problemsFor(broken);
      expect(problems.filter((p) => p.startsWith('location = /peptides:'))).toHaveLength(REQUIRED_HEADERS.length);
    });

    test('a header without "always"', () => {
      const broken = (t: string) => t.replace('add_header X-Content-Type-Options "nosniff" always;', 'add_header X-Content-Type-Options "nosniff";');
      expect(problemsFor(broken).some((p) => p.includes('X-Content-Type-Options lacks "always"'))).toBe(true);
    });

    test('a value that differs between locations', () => {
      const broken = (t: string) => t.replace('"max-age=31536000; includeSubDomains" always;', '"max-age=300" always;');
      expect(problemsFor(broken).some((p) => p.startsWith('Strict-Transport-Security differs'))).toBe(true);
    });

    test('an add_header inside an `if` that drops the others', () => {
      const broken = (t: string) => t.replace('if ($gate_ok = 0) { return 401; }\n\n        try_files', 'if ($gate_ok = 0) { add_header X-Test "1" always; return 401; }\n\n        try_files');
      expect(broken(TEMPLATE)).not.toBe(TEMPLATE);
      expect(problemsFor(broken).some((p) => p.startsWith('location / > if'))).toBe(true);
    });
  });
});

describe('Content-Security-Policy', () => {
  const csp = () => auditHeaders(parseTemplate()).canonical.get('Content-Security-Policy') ?? '';

  test('passes the strictness rules, and connect-src names exactly the hosts the source calls', () => {
    expect(auditCsp(csp(), connectOrigins())).toEqual([]);
  });

  test('the Supabase host the site calls is on the allow-list, and nothing else is', () => {
    const policy = parseCsp(csp());
    expect(policy['connect-src']).toEqual(["'self'", ...new Set(connectOrigins())]);
    expect(connectOrigins().length).toBeGreaterThan(0);
  });

  test('scripts and styles are same-origin only, with no inline escape hatch', () => {
    const policy = parseCsp(csp());
    expect(policy['script-src']).toEqual(["'self'"]);
    expect(policy['style-src']).toEqual(["'self'"]);
    expect(policy['default-src']).toEqual(["'self'"]);
    expect(policy['object-src']).toEqual(["'none'"]);
    expect(policy['base-uri']).toEqual(["'self'"]);
    expect(policy['frame-ancestors']).toEqual(["'none'"]);
    expect(policy['upgrade-insecure-requests']).toEqual([]);
  });

  test('the only unsafe-inline is for style attributes', () => {
    const offenders = Object.entries(parseCsp(csp())).filter(([d, s]) => s.includes("'unsafe-inline'") && d !== 'style-src-attr');
    expect(offenders).toEqual([]);
  });

  describe('the strictness rules catch a loosened policy', () => {
    const base = () => csp();
    test.each([
      ["script-src 'self' 'unsafe-inline'", base().replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")],
      ["style-src 'unsafe-inline'", base().replace("style-src 'self';", "style-src 'self' 'unsafe-inline';")],
      ['a wildcard', base().replace('img-src', 'img-src *')],
      ['a whole scheme', base().replace("img-src 'self'", "img-src 'self' data:")],
      ['an extra connect host', base().replace('connect-src', 'connect-src https://tracker.example')],
      ['unsafe-eval', base().replace("script-src 'self'", "script-src 'self' 'unsafe-eval'")],
      ['framing allowed', base().replace("frame-ancestors 'none'", "frame-ancestors 'self'")],
      ['no upgrade directive', base().replace('; upgrade-insecure-requests', '')],
    ])('%s', (_name, loosened) => {
      expect(loosened).not.toBe(base());
      expect(auditCsp(loosened, connectOrigins()).length).toBeGreaterThan(0);
    });

    test('a connect origin the source calls but the policy omits', () => {
      expect(auditCsp(csp(), [...connectOrigins(), 'https://other.supabase.co']).length).toBeGreaterThan(0);
    });
  });
});

describe('HTTP to HTTPS redirect rule', () => {
  test('is server-level, guarded by X-Forwarded-Proto = "http", and returns 301 to https://$host$request_uri', () => {
    expect(auditRedirectRule(parseTemplate())).toEqual([]);
    expect(TEMPLATE).toContain('if ($http_x_forwarded_proto = "http") {');
    expect(TEMPLATE).toContain('return 301 https://$host$request_uri;');
  });

  test('an unguarded redirect, or one keyed on $scheme, is caught', () => {
    const unguarded = TEMPLATE.replace('if ($http_x_forwarded_proto = "http") {\n        return 301 https://$host$request_uri;\n    }', 'return 301 https://$host$request_uri;');
    expect(unguarded).not.toBe(TEMPLATE);
    expect(auditRedirectRule(parseTemplate(unguarded)).length).toBeGreaterThan(0);

    const scheme = TEMPLATE.replace('$http_x_forwarded_proto = "http"', '$scheme = "http"');
    expect(auditRedirectRule(parseTemplate(scheme)).length).toBeGreaterThan(0);

    const wrongValue = TEMPLATE.replace('$http_x_forwarded_proto = "http"', '$http_x_forwarded_proto != "https"');
    expect(auditRedirectRule(parseTemplate(wrongValue)).length).toBeGreaterThan(0);
  });
});

describe('answers from the emulated server (built from the template)', () => {
  let dist: string;
  const emulator = (hash = '') => createNginxEmulator({ templateText: TEMPLATE, root: dist, env: { SITE_GATE_HASH: hash } });
  const canonical = auditHeaders(parseTemplate()).canonical;

  beforeAll(() => {
    dist = mkdtempSync(join(tmpdir(), 'wp-dist-'));
    const put = (rel: string, body = 'x') => {
      mkdirSync(dirname(join(dist, rel)), { recursive: true });
      writeFileSync(join(dist, rel), body);
    };
    put('index.html', '<html>home</html>');
    put('weight-loss/index.html', '<html>wl</html>');
    put('preview-access/index.html', '<html>gate</html>');
    put('_astro/app.abc.js', 'console.log(1)');
    put('images/a.webp');
    put('images/b.svg', '<svg/>');
  });
  afterAll(() => rmSync(dist, { recursive: true, force: true }));

  const headerMap = (res: { headers: [string, string][] }) =>
    new Map(res.headers.map(([k, v]) => [k.toLowerCase(), v]));

  function expectAllSecurityHeaders(res: { headers: [string, string][]; scope: string }, label: string) {
    const got = headerMap(res);
    for (const name of REQUIRED_HEADERS) {
      expect(got.get(name.toLowerCase()), `${label} [${res.scope}] ${name}`).toBe(canonical.get(name));
    }
  }

  test.each([
    ['home page', '/', 200, 'location /'],
    ['directory page', '/weight-loss/', 200, 'location /'],
    ['directory without slash', '/weight-loss', 301, 'location /'],
    ['unknown page (404)', '/nope', 404, 'location /'],
    ['fingerprinted asset', '/_astro/app.abc.js', 200, 'location /_astro/'],
    ['missing asset (404)', '/_astro/gone.js', 404, 'location /_astro/'],
    ['image', '/images/a.webp', 200, 'location ~* \\.(?:jpg|jpeg|png|webp|avif|gif|svg|ico|woff2?|ttf)$'],
    ['svg', '/images/b.svg', 200, 'location ~* \\.(?:jpg|jpeg|png|webp|avif|gif|svg|ico|woff2?|ttf)$'],
    ['dotfile (403)', '/.env', 403, 'location ~ /\\.'],
    ['gate page, direct hit (404)', '/preview-access/index.html', 404, 'location = /preview-access/index.html'],
    ['gate folder (404)', '/preview-access/', 404, 'location ^~ /preview-access/'],
    ['renamed program (301)', '/peptides', 301, 'location = /peptides'],
    ['renamed program with slash (301)', '/peptides/', 301, 'location = /peptides/'],
    ['unlock without the header (403)', '/__unlock', 403, 'location @gate_unlock'],
  ])('gate off: %s carries every security header', (label, url, status, scope) => {
    const res = emulator().handle({ url, headers: { host: 'wellpeps.com' } });
    expect(res.status).toBe(status);
    expect(res.scope).toBe(scope);
    expectAllSecurityHeaders(res, label);
  });

  test('gate on: the locked page, the unlock replies and the public assets all carry them', () => {
    const e = emulator(HASH);
    const locked = e.handle({ url: '/weight-loss/', headers: { host: 'wellpeps.com' } });
    expect(locked.status).toBe(401);
    expect(locked.scope).toContain('error_page 401');
    expect(locked.file?.endsWith(join('preview-access', 'index.html'))).toBe(true);
    expectAllSecurityHeaders(locked, 'gate page');

    const asset = e.handle({ url: '/_astro/app.abc.js', headers: { host: 'wellpeps.com' } });
    expect(asset.status).toBe(200);
    expectAllSecurityHeaders(asset, 'asset behind the gate');

    const wrong = e.handle({ url: '/__unlock', headers: { host: 'wellpeps.com', [GATE_HEADER]: 'b'.repeat(64) } });
    expect(wrong.status).toBe(403);
    expectAllSecurityHeaders(wrong, 'unlock, wrong password');

    const right = e.handle({ url: '/__unlock', headers: { host: 'wellpeps.com', [GATE_HEADER]: HASH } });
    expect(right.status).toBe(204);
    expect(headerMap(right).get('set-cookie')).toContain(`wp_gate=${HASH}`);
    expectAllSecurityHeaders(right, 'unlock, right password');

    const unlocked = e.handle({ url: '/weight-loss/', headers: { host: 'wellpeps.com', cookie: `wp_gate=${HASH}` } });
    expect(unlocked.status).toBe(200);
    expect(headerMap(unlocked).get('cache-control')).toBe('private, no-cache');
    expectAllSecurityHeaders(unlocked, 'unlocked page');

    const peptides = e.handle({ url: '/peptides', headers: { host: 'wellpeps.com' } });
    expect(peptides.status).toBe(401);
  });

  describe('HTTP to HTTPS', () => {
    const get = (url: string, headers: Record<string, string>, hash = '') =>
      emulator(hash).handle({ url, headers: { host: 'wellpeps.com', ...headers } });

    test('X-Forwarded-Proto: http gets a 301 to the same URL on https, headers included', () => {
      const res = get('/weight-loss/?utm_source=x&a=1', { 'x-forwarded-proto': 'http' });
      expect(res.status).toBe(301);
      expect(headerMap(res).get('location')).toBe('https://wellpeps.com/weight-loss/?utm_source=x&a=1');
      expectAllSecurityHeaders(res, 'http redirect');
    });

    test('every kind of path is redirected, even with the gate on', () => {
      for (const url of ['/', '/_astro/app.abc.js', '/images/a.webp', '/__unlock', '/peptides', '/nope']) {
        expect(get(url, { 'x-forwarded-proto': 'http' }, HASH).status, url).toBe(301);
      }
    });

    test('the host is taken without its port and lower-cased', () => {
      const res = get('/', { host: 'WellPeps.com:8080', 'x-forwarded-proto': 'http' });
      expect(headerMap(res).get('location')).toBe('https://wellpeps.com/');
    });

    test('https, and a request with no header at all (health check, docker run), are served normally', () => {
      expect(get('/', { 'x-forwarded-proto': 'https' }).status).toBe(200);
      expect(get('/', {}).status).toBe(200);
    });

    test('only the exact value "http" redirects', () => {
      for (const value of ['HTTP', 'https,http', 'http,https', '', 'ws', 'httpx']) {
        expect(get('/', { 'x-forwarded-proto': value }).status, JSON.stringify(value)).toBe(200);
      }
    });

    test('there is no redirect loop: following the redirect as the proxy would (https) ends at the page', () => {
      const first = get('/weight-loss/', { 'x-forwarded-proto': 'http' });
      const target = new URL(headerMap(first).get('location') ?? '');
      expect(target.protocol).toBe('https:');
      const second = get(target.pathname + target.search, { 'x-forwarded-proto': 'https' });
      expect(second.status).toBe(200);
      expect(headerMap(second).has('location')).toBe(false);
    });
  });
});

describe('the template and the Dockerfiles', () => {
  const dockerfiles = [join(SITE, 'Dockerfile'), join(REPO, 'Dockerfile')];

  test('NGINX_ENVSUBST_FILTER is still ^SITE_GATE_ in both Dockerfiles', () => {
    for (const file of dockerfiles) expect(readFileSync(file, 'utf8'), file).toMatch(/NGINX_ENVSUBST_FILTER="\^SITE_GATE_"/);
  });

  test('both Dockerfiles install the template, and copy the same runtime files', () => {
    const copies = (file: string) => {
      const text = readFileSync(file, 'utf8');
      const runtime = text.slice(text.indexOf('AS runtime'));
      return [...runtime.matchAll(/^COPY\s+(?!--from)(\S+)\s+(\S+)/gm)].map(([, from, to]) => `${from.replace(/^wellpeps-site\//, '')} -> ${to}`);
    };
    const [site, root] = dockerfiles.map(copies);
    expect(site).toContain('nginx.conf.template -> /etc/nginx/templates/default.conf.template');
    expect(root).toEqual(site);
  });

  test('envsubst can only touch SITE_GATE_* : no other ${...} or $SITE_ reference exists', () => {
    for (const m of TEMPLATE.matchAll(/\$\{([^}]*)\}/g)) expect(m[1]).toMatch(/^SITE_GATE_[A-Z_]+$/);
    // nginx variables are fine; an env-style name with no braces would not be (and would not be substituted).
    expect(TEMPLATE).not.toMatch(/\$[A-Z][A-Z0-9_]*\b/);
  });

  test('rendering leaves nginx variables alone and fills only the gate hash', () => {
    const rendered = renderTemplate(TEMPLATE, { SITE_GATE_HASH: HASH, OTHER: 'nope' });
    expect(rendered).not.toContain('${');
    expect(rendered).toContain('$wp_csp');
    expect(rendered).toContain('$http_x_forwarded_proto');
    expect(rendered).toContain(HASH);
  });
});

describe('the build stays compatible with the policy', () => {
  test('Astro writes scripts and stylesheets as files, never inline', () => {
    const config = astroConfig as { build?: { inlineStylesheets?: string }; vite?: { build?: { assetsInlineLimit?: number } } };
    expect(config.build?.inlineStylesheets).toBe('never');
    expect(config.vite?.build?.assetsInlineLimit).toBe(0);
  });

  const sourceFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      return statSync(p).isDirectory() ? sourceFiles(p) : p.endsWith('.astro') ? [p] : [];
    });

  test('no page or component uses an inline event handler, or an inline script outside the dev-only panel', () => {
    const handlers = /<[a-zA-Z][^>]*\son(?:click|submit|change|input|load|error|focus|blur|keydown|keyup|mouseover|mouseout|toggle|close|cancel)\s*=/;
    const offenders: string[] = [];
    for (const file of sourceFiles(join(SITE, 'src'))) {
      const text = readFileSync(file, 'utf8');
      const rel = file.slice(SITE.length + 1).replace(/\\/g, '/');
      if (handlers.test(text)) offenders.push(`${rel}: inline event handler`);
      if (/<script[^>]*\bis:inline\b/.test(text) && rel !== 'src/components/dev/TweakPanel.astro') offenders.push(`${rel}: is:inline script`);
      if (/<style[^>]*\bis:inline\b/.test(text)) offenders.push(`${rel}: is:inline style`);
    }
    expect(offenders).toEqual([]);
  });

  test('the dev-only inline script is wrapped in import.meta.env.DEV', () => {
    const text = readFileSync(join(SITE, 'src/components/dev/TweakPanel.astro'), 'utf8');
    expect(text).toMatch(/import\.meta\.env\.DEV\s*&&\s*<script is:inline/);
  });

  describe('the page scanner used on the real build', () => {
    test('allows external scripts, JSON data blocks, style attributes and ordinary links', () => {
      const html = `<!doctype html><html><head><link rel="stylesheet" href="/_astro/a.css"><script type="module" src="/_astro/a.js"></script></head>
        <body><div style="left:1%"></div><a href="https://portal.wellpeps.com/x">go</a>
        <script type="application/json">{"a":"<b>"}</script><script type="application/ld+json">{}</script><img src="/images/a.webp" srcset="/images/a.webp 1x"></body></html>`;
      expect(scanHtml(html)).toEqual([]);
    });

    test('allows the LegitScript seal image, which must load from LegitScript itself', () => {
      const html = '<html><body><a href="https://www.legitscript.com/websites/wellpeps.com/?"><img src="https://static.legitscript.com/seals/51837021.png" width="73" height="79"></a></body></html>';
      expect(scanHtml(html)).toEqual([]);
    });

    test.each([
      ['a script from the seal host', '<script src="https://static.legitscript.com/x.js"></script>', /another host/],
      ['a seal image over a protocol-relative URL', '<img src="//static.legitscript.com/seals/1.png">', /another host/],
      ['a lookalike host', '<img src="https://static.legitscript.com.evil.example/a.png">', /another host/],
      ['an image srcset from the seal host', '<img src="/a.png" srcset="https://static.legitscript.com/a.png 2x">', /srcset/],
    ])('the seal exception covers only <img src> from that exact host: flags %s', (_name, html, pattern) => {
      expect(scanHtml(`<html><body>${html}</body></html>`).join('\n')).toMatch(pattern);
    });

    test.each([
      ['an inline script', '<script>alert(1)</script>', /inline script/],
      ['an inline module script', '<script type="module">import("/x")</script>', /inline script/],
      ['a style element', '<style>a{}</style>', /<style>/],
      ['an event handler', '<button onclick="go()">x</button>', /event handler/],
      ['a javascript: link', '<a href="javascript:void(0)">x</a>', /javascript:/],
      ['an iframe', '<iframe src="/x"></iframe>', /iframe/],
      ['a script from another host', '<script src="https://cdn.example/x.js"></script>', /another host/],
      ['a stylesheet from another host', '<link rel="stylesheet" href="https://fonts.googleapis.com/css">', /another host/],
      ['an image from another host', '<img src="//cdn.example/a.png">', /another host/],
      ['a form posting to another host', '<form action="https://x.example/p"></form>', /another host/],
    ])('flags %s', (_name, html, pattern) => {
      const found = scanHtml(`<html><body>${html}</body></html>`);
      expect(found.length).toBeGreaterThan(0);
      expect(found.join('\n')).toMatch(pattern);
    });

    test('flags CSS that the policy would block', () => {
      expect(scanCss('a{background:url(data:image/png;base64,AAAA)}').length).toBe(1);
      expect(scanCss('@import url("https://fonts.googleapis.com/css");').length).toBeGreaterThan(0);
      expect(scanCss('a{background:url(/images/a.webp)} @font-face{src:url(./f.woff2)}')).toEqual([]);
    });
  });
});
