/**
 * A tiny stand-in for nginx that answers requests by READING
 * nginx.conf.template, so the security headers can be tested in a real browser
 * without an nginx binary. It is NOT nginx: it implements only what the
 * template uses (see nginx-conf.mjs), and the real config has never been run
 * by it. What it does take from the template, never from its own code:
 *   - which location answers a request (nginx's matching order),
 *   - the headers on each response (nginx's add_header inheritance, `always`),
 *   - the gate maps, redirects, try_files, deny, error_page and the
 *     X-Forwarded-Proto redirect.
 * The envsubst step is applied first, exactly as the nginx image does it.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  ADD_HEADER_DEFAULT_STATUSES,
  blocksOf,
  directivesOf,
  effectiveHeaders,
  constantMaps,
  findServer,
  ifCondition,
  locationLabel,
  locationSpec,
  parseNginx,
  renderTemplate,
} from './nginx-conf.mjs';

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.pdf': 'application/pdf', '.xml': 'application/xml', '.txt': 'text/plain',
};

const NOT_FOUND_BODY = '<html><head><title>404 Not Found</title></head><body><center><h1>404 Not Found</h1></center><hr><center>nginx (emulated)</center></body></html>';

/**
 * @param {{ templateText: string, root: string, env?: Record<string, string> }} options
 *   root: directory served (the build's dist/); env: values for SITE_GATE_* (envsubst)
 */
export function createNginxEmulator({ templateText, root, env = {} }) {
  const conf = parseNginx(renderTemplate(templateText, env));
  const server = findServer(conf);
  const constants = constantMaps(conf);
  const maps = new Map(blocksOf(conf, 'map').map((m) => [m.args[1].replace(/^\$/, ''), m]));
  const docRoot = path.resolve(root);

  const errorPages = new Map(
    directivesOf(server, 'error_page').map((d) => [Number(d.args[0]), d.args[d.args.length - 1]]),
  );

  function makeVars(req, uri) {
    const url = new URL(req.url, 'http://placeholder');
    const hostHeader = (req.headers.host ?? 'localhost').toLowerCase();
    const cookies = Object.fromEntries(
      (req.headers.cookie ?? '').split(';').map((c) => c.trim().split(/=(.*)/s).slice(0, 2)).filter(([k]) => k),
    );
    const cache = new Map();
    const get = (name) => {
      if (cache.has(name)) return cache.get(name);
      let value;
      if (name === 'uri') value = uri;
      else if (name === 'request_uri') value = req.url;
      else if (name === 'args') value = url.search.replace(/^\?/, '');
      else if (name === 'host') value = hostHeader.replace(/:\d+$/, '');
      else if (name === 'scheme') value = 'http';
      else if (name.startsWith('http_')) value = req.headers[name.slice(5).replace(/_/g, '-')] ?? '';
      else if (name.startsWith('cookie_')) value = cookies[name.slice(7)] ?? '';
      else if (maps.has(name)) value = evalMap(maps.get(name), get);
      else throw new Error(`emulator: unknown nginx variable $${name}`);
      cache.set(name, value);
      return value;
    };
    return get;
  }

  const expand = (text, get) =>
    text.replace(/\$\{(\w+)\}|\$(\w+)/g, (_w, braced, bare) => get(braced ?? bare));

  function evalMap(map, get) {
    const key = expand(map.args[0], get);
    const entries = directivesOf(map);
    let def;
    const regexes = [];
    for (const e of entries) {
      if (e.name === 'default') { def = e.args[0] ?? ''; continue; }
      if (e.name.startsWith('~')) { regexes.push(e); continue; }
      if (e.name === key) return expand(e.args[0] ?? '', get);
    }
    for (const e of regexes) {
      const flags = e.name.startsWith('~*') ? 'i' : '';
      if (new RegExp(e.name.replace(/^~\*?/, ''), flags).test(key)) return expand(e.args[0] ?? '', get);
    }
    return def === undefined ? '' : expand(def, get);
  }

  function matchLocation(uri) {
    const locations = blocksOf(server, 'location');
    let bestPrefix = null;
    for (const loc of locations) {
      const { mod, pattern } = locationSpec(loc);
      if (mod === '=' && uri === pattern) return loc;
      if ((mod === '' || mod === '^~') && uri.startsWith(pattern)) {
        if (!bestPrefix || pattern.length > locationSpec(bestPrefix).pattern.length) bestPrefix = loc;
      }
    }
    if (bestPrefix && locationSpec(bestPrefix).mod === '^~') return bestPrefix;
    for (const loc of locations) {
      const { mod, pattern } = locationSpec(loc);
      if ((mod === '~' || mod === '~*') && new RegExp(pattern, mod === '~*' ? 'i' : '').test(uri)) return loc;
    }
    return bestPrefix;
  }

  const isInternal = (loc) => directivesOf(loc, 'internal').length > 0;
  const statFile = (p) => { try { return fs.statSync(p); } catch { return null; } };

  /** Runs one block's directives; returns an outcome or null to fall through. */
  function run(block, chain, ctx) {
    for (const item of block.items) {
      if (item.kind === 'block' && item.name === 'if') {
        const { variable, op, value } = ifCondition(item);
        const actual = ctx.get(variable);
        if ((op === '=') === (actual === value)) {
          const out = run(item, [...chain, item], ctx);
          if (out) return out;
        }
        continue;
      }
      if (item.kind !== 'directive') continue;
      if (item.name === 'return') {
        const status = Number(item.args[0]);
        const target = item.args[1] === undefined ? undefined : expand(item.args[1], ctx.get);
        return { status, location: target, chain };
      }
      if (item.name === 'deny' && item.args[0] === 'all') return { status: 403, chain };
      if (item.name === 'try_files') {
        const out = tryFiles(item.args, chain, ctx);
        if (out) return out;
      }
    }
    return null;
  }

  function tryFiles(args, chain, ctx) {
    const uri = ctx.get('uri');
    for (const candidate of args.slice(0, -1)) {
      const rel = expand(candidate, ctx.get);
      const abs = path.join(docRoot, rel);
      const st = statFile(abs);
      if (rel.endsWith('/')) {
        if (st?.isDirectory() && fs.existsSync(path.join(abs, 'index.html'))) {
          // A directory asked for without its trailing slash gets a relative 301.
          if (!uri.endsWith('/')) return { status: 301, location: `${rel}${ctx.get('args') ? `?${ctx.get('args')}` : ''}`, chain };
          return { status: 200, file: path.join(abs, 'index.html'), chain };
        }
      } else if (st?.isFile()) {
        return { status: 200, file: abs, chain };
      }
    }
    const last = args[args.length - 1];
    if (last.startsWith('=')) return { status: Number(last.slice(1)), chain };
    if (last.startsWith('@')) {
      const named = blocksOf(server, 'location').find((l) => l.args[0] === last);
      if (!named) throw new Error(`emulator: no named location ${last}`);
      return run(named, [server, named], ctx) ?? { status: 404, chain: [server, named] };
    }
    return null;
  }

  /** The static file handler: serve docRoot + uri, 301 a directory missing its slash. */
  function serveStatic(chain, ctx) {
    const uri = ctx.get('uri');
    const abs = path.join(docRoot, uri);
    const st = statFile(abs);
    if (st?.isFile()) return { status: 200, file: abs, chain };
    if (st?.isDirectory()) {
      if (!uri.endsWith('/')) return { status: 301, location: `${uri}/${ctx.get('args') ? `?${ctx.get('args')}` : ''}`, chain };
      if (fs.existsSync(path.join(abs, 'index.html'))) return { status: 200, file: path.join(abs, 'index.html'), chain };
    }
    return { status: 404, chain };
  }

  function headersFor(chain, status, get) {
    const out = [];
    for (const h of effectiveHeaders(chain, constants)) {
      if (!h.always && !ADD_HEADER_DEFAULT_STATUSES.has(status)) continue;
      const value = expand(h.value, get);
      if (value !== '') out.push([h.name, value]);
    }
    return out;
  }

  /**
   * @param {{ method?: string, url: string, headers?: Record<string, string> }} req headers lower-cased
   * @returns {{ status: number, headers: [string, string][], file?: string, body?: string, scope: string }}
   */
  function handle(req) {
    const request = { method: 'GET', headers: {}, ...req };
    let uri;
    try {
      uri = decodeURIComponent(new URL(request.url, 'http://placeholder').pathname);
    } catch {
      uri = '/';
    }
    const ctx = { get: makeVars(request, uri) };

    // Rewrite phase at server level (the HTTP -> HTTPS redirect).
    let outcome = run(server, [server], ctx);

    if (!outcome) {
      const loc = matchLocation(uri);
      if (!loc) outcome = { status: 404, chain: [server] };
      else if (isInternal(loc)) outcome = { status: 404, chain: [server, loc] };
      else outcome = run(loc, [server, loc], ctx) ?? serveStatic([server, loc], ctx);
    }
    let errorPage = '';

    // error_page: an internal redirect to another location, status kept.
    const errorUri = errorPages.get(outcome.status);
    if (errorUri && outcome.status >= 400) {
      const loc = matchLocation(errorUri);
      if (loc) {
        const errCtx = { get: makeVars(request, errorUri) };
        const page = run(loc, [server, loc], errCtx) ?? serveStatic([server, loc], errCtx);
        if (page.file) {
          errorPage = ` (error_page ${outcome.status})`;
          outcome = { ...page, status: outcome.status, chain: page.chain };
        }
      }
    }
    // Which location finally answered (a named location, if try_files handed off).
    const answering = outcome.chain[1];
    const scope = (answering?.name === 'location' ? locationLabel(answering) : 'server') + errorPage;

    const headers = headersFor(outcome.chain, outcome.status, ctx.get);
    if (outcome.location !== undefined) headers.push(['Location', outcome.location]);
    if (outcome.file) headers.push(['Content-Type', MIME[path.extname(outcome.file).toLowerCase()] ?? 'application/octet-stream']);
    const result = { status: outcome.status, headers, scope };
    if (outcome.file) result.file = outcome.file;
    else if (outcome.status === 404) {
      result.body = NOT_FOUND_BODY;
      headers.push(['Content-Type', 'text/html']);
    }
    return result;
  }

  return { handle, conf };
}

/** Serves an emulator over HTTP (for a browser). Returns { server, port, close }. */
export async function listenEmulator(emulator, { port = 0 } = {}) {
  const http = await import('node:http');
  const server = http.createServer((req, res) => {
    const out = emulator.handle({ method: req.method, url: req.url ?? '/', headers: req.headers });
    for (const [name, value] of out.headers) res.appendHeader(name, value);
    res.setHeader('X-Emulator-Scope', out.scope);
    res.statusCode = out.status;
    if (req.method === 'HEAD' || out.status === 204 || out.status === 301 || out.status === 304) { res.end(); return; }
    if (out.file) { fs.createReadStream(out.file).on('error', () => res.end()).pipe(res); return; }
    res.end(out.body ?? '');
  });
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  const address = server.address();
  return {
    server,
    port: typeof address === 'object' && address ? address.port : port,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
