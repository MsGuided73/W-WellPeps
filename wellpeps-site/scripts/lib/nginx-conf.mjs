/**
 * Reads wellpeps-site/nginx.conf.template so tests can check the security
 * headers WITHOUT running nginx (no nginx binary or Docker on the dev machine).
 * The template stays the single source of truth: nothing here restates a
 * header value.
 *
 * This is a small reader for the subset of nginx syntax the template uses:
 * comments, quoted strings, directives, blocks, `if (...)`, and map blocks.
 * It follows nginx's own add_header inheritance rule, which is the thing most
 * likely to go wrong: a block that has any add_header of its own drops every
 * header inherited from the block above it.
 *
 * Used by src/lib/security-headers.test.ts and scripts/security-headers-check.mjs.
 * Plain JavaScript (no TypeScript) so the node script can import it directly.
 */

/** Headers every response must carry (W4, plus the X-Frame-Options already there). */
export const REQUIRED_HEADERS = [
  'Content-Security-Policy',
  'Strict-Transport-Security',
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Referrer-Policy',
  'Permissions-Policy',
];

/** Statuses for which nginx sends an add_header header even without `always`. */
export const ADD_HEADER_DEFAULT_STATUSES = new Set([200, 201, 204, 206, 301, 302, 303, 304, 307, 308]);

/**
 * What the nginx image's envsubst step does: with NGINX_ENVSUBST_FILTER set to
 * ^SITE_GATE_, only ${SITE_GATE_*} / $SITE_GATE_* references are replaced.
 * @param {string} text
 * @param {Record<string, string>} env
 */
export function renderTemplate(text, env = {}) {
  const filter = /^SITE_GATE_/;
  return text.replace(/\$\{(\w+)\}|\$(\w+)/g, (whole, braced, bare) => {
    const name = braced ?? bare;
    return filter.test(name) ? (env[name] ?? '') : whole;
  });
}

/**
 * @typedef {{ kind: 'directive', name: string, args: string[] }} Directive
 * @typedef {{ kind: 'block', name: string, args: string[], items: Item[] }} Block
 * @typedef {Directive | Block} Item
 */

/** Splits nginx text into word, ';', '{' and '}' tokens (comments dropped). */
function tokenize(text) {
  const tokens = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    const c = text[i];
    if (/\s/.test(c)) { i += 1; continue; }
    if (c === '#') { while (i < n && text[i] !== '\n') i += 1; continue; }
    if (c === ';' || c === '{' || c === '}') { tokens.push({ type: c }); i += 1; continue; }
    if (c === '"' || c === "'") {
      let value = '';
      i += 1;
      while (i < n && text[i] !== c) {
        if (text[i] === '\\' && i + 1 < n && '"\'\\'.includes(text[i + 1])) { value += text[i + 1]; i += 2; continue; }
        value += text[i];
        i += 1;
      }
      if (i >= n) throw new Error('unterminated quoted string in nginx text');
      i += 1; // closing quote
      tokens.push({ type: 'word', value, quoted: true });
      // `if ($x = "str")`: nginx allows a ")" right after the closing quote.
      if (text[i] === ')') { tokens.push({ type: 'word', value: ')' }); i += 1; }
      continue;
    }
    let value = '';
    while (i < n && !/\s/.test(text[i]) && text[i] !== ';') {
      if (text[i] === '{' && value.endsWith('$')) { // ${var}
        while (i < n && text[i] !== '}') { value += text[i]; i += 1; }
        value += text[i] ?? '';
        i += 1;
        continue;
      }
      if (text[i] === '{' || text[i] === '}') break;
      value += text[i];
      i += 1;
    }
    tokens.push({ type: 'word', value });
  }
  return tokens;
}

/**
 * Parses nginx text into a tree. Returns a root block named "root".
 * @param {string} text
 * @returns {Block}
 */
export function parseNginx(text) {
  const root = { kind: 'block', name: 'root', args: [], items: [] };
  const stack = [root];
  let words = [];
  for (const tok of tokenize(text)) {
    const top = stack[stack.length - 1];
    if (tok.type === 'word') { words.push(tok.value); continue; }
    if (tok.type === ';') {
      if (words.length === 0) continue;
      top.items.push({ kind: 'directive', name: words[0], args: words.slice(1) });
      words = [];
    } else if (tok.type === '{') {
      if (words.length === 0) throw new Error('block without a name');
      const block = { kind: 'block', name: words[0], args: words.slice(1), items: [] };
      top.items.push(block);
      stack.push(block);
      words = [];
    } else if (tok.type === '}') {
      if (words.length > 0) throw new Error(`directive without ";" before "}": ${words.join(' ')}`);
      if (stack.length === 1) throw new Error('unbalanced "}" in nginx text');
      stack.pop();
    }
  }
  if (stack.length !== 1) throw new Error('unbalanced "{" in nginx text');
  if (words.length > 0) throw new Error(`trailing text without ";": ${words.join(' ')}`);
  return root;
}

export const directivesOf = (block, name) =>
  block.items.filter((it) => it.kind === 'directive' && (name === undefined || it.name === name));

export const blocksOf = (block, name) =>
  block.items.filter((it) => it.kind === 'block' && (name === undefined || it.name === name));

/** @param {Block} root */
export function findServer(root) {
  const server = blocksOf(root, 'server')[0];
  if (!server) throw new Error('no server block');
  return server;
}

/** The pattern/modifier of a `location` block: modifier is '', '=', '^~', '~', '~*' or '@'. */
export function locationSpec(loc) {
  const [a, b] = loc.args;
  if (b === undefined) return a.startsWith('@') ? { mod: '@', pattern: a } : { mod: '', pattern: a };
  return { mod: a, pattern: b };
}

export const locationLabel = (loc) => `location ${loc.args.join(' ')}`;

/** Condition of an `if` block: { variable, op: '=' | '!=', value }. */
export function ifCondition(block) {
  const joined = block.args.join(' ').replace(/^\(\s*/, '').replace(/\s*\)$/, '');
  const m = /^(\$\w+)\s+(=|!=)\s+(.*)$/.exec(joined);
  if (!m) throw new Error(`unsupported if condition: ${block.args.join(' ')}`);
  return { variable: m[1].slice(1), op: m[2], value: m[3] };
}

/**
 * Variables defined as a map with only a `default` entry, i.e. a constant.
 * Used for the CSP and Permissions-Policy strings.
 * @returns {Map<string, string>}
 */
export function constantMaps(root) {
  const out = new Map();
  for (const map of blocksOf(root, 'map')) {
    const entries = directivesOf(map);
    if (entries.length === 1 && entries[0].name === 'default') {
      out.set(map.args[1].replace(/^\$/, ''), entries[0].args[0] ?? '');
    }
  }
  return out;
}

/** A header's resolved value: `$name` is looked up in the constant maps. */
export function resolveHeaderValue(raw, constants) {
  const m = /^\$(\w+)$/.exec(raw);
  if (!m) return raw;
  return constants.has(m[1]) ? constants.get(m[1]) : raw;
}

/**
 * nginx's rule: a block's own add_header directives replace the inherited
 * ones; with none of its own it inherits from the nearest block above that has any.
 * @param {Block[]} chain outermost first, e.g. [server, location, ifBlock]
 * @param {Map<string, string>} constants
 * @returns {{ name: string, value: string, always: boolean, rawValue: string }[]}
 */
export function effectiveHeaders(chain, constants) {
  for (let i = chain.length - 1; i >= 0; i -= 1) {
    const own = directivesOf(chain[i], 'add_header');
    if (own.length > 0) {
      return own.map((d) => ({
        name: d.args[0],
        rawValue: d.args[1] ?? '',
        value: resolveHeaderValue(d.args[1] ?? '', constants),
        always: d.args[2] === 'always',
      }));
    }
  }
  return [];
}

/**
 * Every place a response can come from, with the chain of blocks that decides
 * its headers: the server itself (redirect and error answers), each location,
 * and each `if` block that carries add_header of its own.
 * @param {Block} root
 * @returns {{ label: string, chain: Block[] }[]}
 */
export function responseScopes(root) {
  const server = findServer(root);
  const scopes = [{ label: 'server', chain: [server] }];
  for (const it of server.items) {
    if (it.kind === 'block' && it.name === 'if' && directivesOf(it, 'add_header').length > 0) {
      scopes.push({ label: 'server > if', chain: [server, it] });
    }
  }
  for (const loc of blocksOf(server, 'location')) {
    scopes.push({ label: locationLabel(loc), chain: [server, loc] });
    for (const inner of blocksOf(loc, 'if')) {
      if (directivesOf(inner, 'add_header').length > 0) {
        scopes.push({ label: `${locationLabel(loc)} > if ${inner.args.join(' ')}`, chain: [server, loc, inner] });
      }
    }
  }
  return scopes;
}

/**
 * Checks every response scope carries every required header, with `always`,
 * exactly once, and that all scopes agree on each header's value.
 * @param {Block} root
 * @returns {{ problems: string[], canonical: Map<string, string> }}
 */
export function auditHeaders(root) {
  const constants = constantMaps(root);
  const problems = [];
  const seen = new Map(); // header -> Set of values
  for (const scope of responseScopes(root)) {
    const effective = effectiveHeaders(scope.chain, constants);
    for (const required of REQUIRED_HEADERS) {
      const matches = effective.filter((h) => h.name.toLowerCase() === required.toLowerCase());
      if (matches.length === 0) { problems.push(`${scope.label}: missing ${required}`); continue; }
      if (matches.length > 1) problems.push(`${scope.label}: ${required} is set ${matches.length} times`);
      const h = matches[0];
      if (!h.always) problems.push(`${scope.label}: ${required} lacks "always" (error pages would not get it)`);
      if (h.value.trim() === '' || h.value.startsWith('$')) {
        problems.push(`${scope.label}: ${required} has an empty or unresolved value (${h.rawValue})`);
        continue;
      }
      if (!seen.has(required)) seen.set(required, new Set());
      seen.get(required).add(h.value);
    }
  }
  const canonical = new Map();
  for (const [name, values] of seen) {
    if (values.size > 1) problems.push(`${name} differs between locations: ${[...values].join(' | ')}`);
    canonical.set(name, [...values][0]);
  }
  return { problems, canonical };
}

/**
 * The HTTP -> HTTPS rule: server-level, guarded by X-Forwarded-Proto being
 * exactly "http", answering 301 to https://$host$request_uri. Nothing may
 * redirect without that guard (the proxy-facing port only ever sees http).
 * @param {Block} root
 * @returns {string[]} problems
 */
export function auditRedirectRule(root) {
  const server = findServer(root);
  const problems = [];
  const guard = blocksOf(server, 'if').filter((b) => {
    try {
      const c = ifCondition(b);
      return c.variable === 'http_x_forwarded_proto' && c.op === '=' && c.value === 'http';
    } catch {
      return false;
    }
  });
  if (guard.length !== 1) {
    problems.push('expected exactly one server-level `if ($http_x_forwarded_proto = "http")` block');
  } else {
    const ret = directivesOf(guard[0], 'return');
    const ok = ret.length === 1 && ret[0].args[0] === '301' && ret[0].args[1] === 'https://$host$request_uri';
    if (!ok) problems.push('the guarded block must be exactly `return 301 https://$host$request_uri;`');
  }
  // No unguarded server-level return, and no redirect keyed on $scheme (always "http" here).
  for (const d of directivesOf(server, 'return')) problems.push(`unguarded server-level return: ${d.args.join(' ')}`);
  const text = JSON.stringify(root);
  if (/\$scheme/.test(text)) problems.push('$scheme must not be used: behind the proxy it is always "http"');
  return problems;
}

/**
 * Splits a CSP into { directive: sources[] }.
 * @param {string} csp
 * @returns {Record<string, string[]>}
 */
export function parseCsp(csp) {
  /** @type {Record<string, string[]>} */
  const out = {};
  for (const part of csp.split(';')) {
    const words = part.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    out[words[0].toLowerCase()] = words.slice(1);
  }
  return out;
}
