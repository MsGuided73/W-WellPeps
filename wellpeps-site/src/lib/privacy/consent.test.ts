import { describe, expect, test } from 'vitest';
import {
  CONSENT_MAX_AGE_DAYS,
  NOTICE_VERSION,
  allowed,
  defaultState,
  isSensitivePath,
  parse,
  promptReason,
  reduce,
  serialize,
  type ConsentState,
} from './consent';

const NOW = Date.UTC(2026, 9, 1, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;
const fresh = (): ConsentState => defaultState(NOW, 'cid-123');

describe('defaultState', () => {
  test('starts with every optional category off', () => {
    const s = fresh();
    expect(s.analytics).toBe(false);
    expect(s.analyticsSensitive).toBe(false);
    expect(s.advertising).toBe(false);
    expect(s.gpc).toBe(false);
    expect(s.gpcConflict).toBe(false);
    expect(s.gpcOverride).toBe(false);
  });

  test('carries the current notice version and the random consent id', () => {
    const s = fresh();
    expect(s.v).toBe(NOTICE_VERSION);
    expect(s.cid).toBe('cid-123');
    expect(s.ts).toBe(NOW);
    expect(s.source).toBe('default');
  });
});

describe('serialize / parse', () => {
  test('round-trips a state exactly', () => {
    const s = reduce(fresh(), { type: 'acceptAll' }, NOW);
    expect(parse(serialize(s))).toEqual(s);
  });

  test('round-trips a state with every flag set', () => {
    const s: ConsentState = {
      ...fresh(),
      analytics: true,
      analyticsSensitive: true,
      advertising: true,
      gpc: true,
      gpcConflict: true,
      gpcOverride: true,
      source: 'center',
    };
    expect(parse(serialize(s))).toEqual(s);
  });

  test.each([null, undefined, '', 'garbage', 'v=1', '%%%'])('rejects unusable input %p', (raw) => {
    expect(parse(raw as string | null | undefined)).toBeNull();
  });

  test('rejects a value where a flag is not 0 or 1', () => {
    const good = serialize(fresh());
    expect(parse(good.replace('a=0', 'a=2'))).toBeNull();
  });

  test('rejects a timestamp that is not a number', () => {
    const good = serialize(fresh());
    expect(parse(good.replace(/ts=\d+/, 'ts=yesterday'))).toBeNull();
  });

  test('rejects an unknown source so a tampered cookie cannot smuggle one in', () => {
    const good = serialize(fresh());
    expect(parse(good.replace('src=default', 'src=hacker'))).toBeNull();
  });

  test('never serializes an email address or any other identifier beyond the random id', () => {
    const raw = serialize(fresh());
    expect(raw).not.toMatch(/@/);
    expect(raw.length).toBeLessThan(200);
  });

  test('forces advertising off when a stored value claims advertising on with a GPC signal and no override', () => {
    const tampered = serialize({ ...fresh(), advertising: true, gpc: true, gpcOverride: false });
    const parsed = parse(tampered);
    expect(parsed?.advertising).toBe(false);
  });

  test('forces the sensitive-page analytics flag off when analytics is off', () => {
    const tampered = serialize({ ...fresh(), analytics: false, analyticsSensitive: true });
    expect(parse(tampered)?.analyticsSensitive).toBe(false);
  });
});

describe('reduce', () => {
  test('acceptAll turns analytics and advertising on but not the separate health-page consent', () => {
    const s = reduce(fresh(), { type: 'acceptAll', via: 'banner' }, NOW + 1);
    expect(s.analytics).toBe(true);
    expect(s.advertising).toBe(true);
    expect(s.analyticsSensitive).toBe(false);
    expect(s.source).toBe('banner');
    expect(s.ts).toBe(NOW + 1);
  });

  test('acceptAll cannot override a Global Privacy Control signal', () => {
    const withGpc = reduce(fresh(), { type: 'gpcDetected' }, NOW);
    const s = reduce(withGpc, { type: 'acceptAll' }, NOW);
    expect(s.analytics).toBe(true);
    expect(s.advertising).toBe(false);
  });

  test('rejectAll turns everything off', () => {
    const on = reduce(fresh(), { type: 'acceptAll' }, NOW);
    const s = reduce(on, { type: 'rejectAll', via: 'banner' }, NOW);
    expect([s.analytics, s.analyticsSensitive, s.advertising]).toEqual([false, false, false]);
    expect(s.source).toBe('banner');
  });

  test('set changes only the categories named', () => {
    const s = reduce(fresh(), { type: 'set', changes: { analytics: true } }, NOW);
    expect(s.analytics).toBe(true);
    expect(s.advertising).toBe(false);
  });

  test('turning analytics off also turns off the separate health-page consent', () => {
    let s = reduce(fresh(), { type: 'set', changes: { analytics: true } }, NOW);
    s = reduce(s, { type: 'set', changes: { analyticsSensitive: true } }, NOW);
    expect(s.analyticsSensitive).toBe(true);
    s = reduce(s, { type: 'set', changes: { analytics: false } }, NOW);
    expect(s.analytics).toBe(false);
    expect(s.analyticsSensitive).toBe(false);
  });

  test('the health-page consent is ignored while analytics is off', () => {
    const s = reduce(fresh(), { type: 'set', changes: { analyticsSensitive: true } }, NOW);
    expect(s.analyticsSensitive).toBe(false);
  });

  test('advertising cannot be switched on while a GPC signal is present', () => {
    const withGpc = reduce(fresh(), { type: 'gpcDetected' }, NOW);
    const s = reduce(withGpc, { type: 'set', changes: { advertising: true } }, NOW);
    expect(s.advertising).toBe(false);
  });

  test('withdrawAll returns to the all-off default and keeps the same consent id', () => {
    const on = reduce(fresh(), { type: 'acceptAll' }, NOW);
    const s = reduce(on, { type: 'withdrawAll' }, NOW + 5);
    expect([s.analytics, s.analyticsSensitive, s.advertising]).toEqual([false, false, false]);
    expect(s.cid).toBe('cid-123');
    expect(s.source).toBe('withdraw');
  });
});

describe('Global Privacy Control', () => {
  test('detecting GPC turns advertising off and records the signal', () => {
    const s = reduce(fresh(), { type: 'gpcDetected' }, NOW);
    expect(s.gpc).toBe(true);
    expect(s.advertising).toBe(false);
    expect(s.source).toBe('gpc');
  });

  test('GPC that conflicts with an earlier advertising opt-in follows the signal and flags the conflict', () => {
    const optedIn = reduce(fresh(), { type: 'acceptAll' }, NOW);
    const s = reduce(optedIn, { type: 'gpcDetected' }, NOW);
    expect(s.advertising).toBe(false);
    expect(s.gpcConflict).toBe(true);
  });

  test('GPC with no earlier opt-in raises no conflict', () => {
    expect(reduce(fresh(), { type: 'gpcDetected' }, NOW).gpcConflict).toBe(false);
  });

  test('"Allow anyway" re-enables advertising and remembers the override', () => {
    const optedIn = reduce(fresh(), { type: 'acceptAll' }, NOW);
    const conflict = reduce(optedIn, { type: 'gpcDetected' }, NOW);
    const s = reduce(conflict, { type: 'gpcAllowAnyway' }, NOW);
    expect(s.advertising).toBe(true);
    expect(s.gpcOverride).toBe(true);
    expect(s.gpcConflict).toBe(false);
  });

  test('"Keep it off" clears the conflict and leaves advertising off', () => {
    const optedIn = reduce(fresh(), { type: 'acceptAll' }, NOW);
    const conflict = reduce(optedIn, { type: 'gpcDetected' }, NOW);
    const s = reduce(conflict, { type: 'gpcKeepOff' }, NOW);
    expect(s.advertising).toBe(false);
    expect(s.gpcConflict).toBe(false);
    expect(s.gpcOverride).toBe(false);
  });

  test('a remembered override survives the next page load that still sends the signal', () => {
    const optedIn = reduce(fresh(), { type: 'acceptAll' }, NOW);
    const conflict = reduce(optedIn, { type: 'gpcDetected' }, NOW);
    const overridden = reduce(conflict, { type: 'gpcAllowAnyway' }, NOW);
    const again = reduce(overridden, { type: 'gpcDetected' }, NOW + DAY);
    expect(again.advertising).toBe(true);
  });

  test('when the signal disappears the flags clear but advertising does not turn itself on', () => {
    const withGpc = reduce(fresh(), { type: 'gpcDetected' }, NOW);
    const s = reduce(withGpc, { type: 'gpcAbsent' }, NOW);
    expect(s.gpc).toBe(false);
    expect(s.gpcOverride).toBe(false);
    expect(s.advertising).toBe(false);
  });
});

describe('isSensitivePath', () => {
  test.each([
    '/weight-loss',
    '/weight-loss/',
    '/hair-restoration',
    '/sexual-wellness',
    '/healthy-aging',
    '/hormone-optimization',
    '/mental-wellness',
    '/wellness-learning-center/semaglutide-basics',
    '/wellness-learning-center',
  ])('%s is a health-topic page', (p) => {
    expect(isSensitivePath(p)).toBe(true);
  });

  test.each(['/', '/why-wellpeps', '/your-plan', '/privacy-policy', '/your-privacy-choices', '/terms-of-use'])(
    '%s is not a health-topic page',
    (p) => {
      expect(isSensitivePath(p)).toBe(false);
    },
  );

  test('ignores a query string and a trailing hash', () => {
    expect(isSensitivePath('/weight-loss?utm_source=x#pricing')).toBe(true);
  });

  test('does not treat a lookalike prefix as sensitive', () => {
    expect(isSensitivePath('/weight-loss-policy-not-a-page')).toBe(false);
  });
});

describe('allowed', () => {
  const analyticsOn = reduce(fresh(), { type: 'set', changes: { analytics: true } }, NOW);
  const adsOn = reduce(fresh(), { type: 'set', changes: { advertising: true } }, NOW);

  test('nothing optional is allowed with no stored choice', () => {
    expect(allowed(fresh(), 'analytics', '/')).toBe(false);
    expect(allowed(fresh(), 'advertising', '/')).toBe(false);
  });

  test('analytics is allowed on an ordinary page once consented', () => {
    expect(allowed(analyticsOn, 'analytics', '/why-wellpeps')).toBe(true);
  });

  test('analytics is NOT allowed on a health-topic page without the separate consent', () => {
    expect(allowed(analyticsOn, 'analytics', '/weight-loss')).toBe(false);
  });

  test('analytics IS allowed on a health-topic page with the separate consent', () => {
    const s = reduce(analyticsOn, { type: 'set', changes: { analyticsSensitive: true } }, NOW);
    expect(allowed(s, 'analytics', '/weight-loss')).toBe(true);
  });

  test('advertising is allowed on an ordinary page once consented', () => {
    expect(allowed(adsOn, 'advertising', '/')).toBe(true);
  });

  test('advertising is NEVER allowed on a health-topic page, even with consent', () => {
    expect(allowed(adsOn, 'advertising', '/hair-restoration')).toBe(false);
    expect(allowed(adsOn, 'advertising', '/wellness-learning-center/x')).toBe(false);
  });
});

describe('promptReason', () => {
  test('no stored choice is a first-time prompt', () => {
    expect(promptReason(null, NOW)).toBe('first');
  });

  test('a current, unexpired choice needs no prompt', () => {
    expect(promptReason(fresh(), NOW + DAY)).toBeNull();
  });

  test('a choice made under an older notice version is asked again', () => {
    const old = { ...fresh(), v: '1999-01-01.0' };
    expect(promptReason(old, NOW)).toBe('version');
  });

  test('a choice older than twelve months is asked again', () => {
    expect(promptReason(fresh(), NOW + (CONSENT_MAX_AGE_DAYS + 1) * DAY)).toBe('expiry');
  });

  test('a choice just inside twelve months is still honored', () => {
    expect(promptReason(fresh(), NOW + (CONSENT_MAX_AGE_DAYS - 1) * DAY)).toBeNull();
  });
});

describe('parse: timestamps and time', () => {
  test('rejects a saved choice dated in the future, which would never expire', () => {
    const forged = serialize({ ...fresh(), ts: NOW + 3 * DAY });
    expect(parse(forged, NOW)).toBeNull();
  });

  test('accepts a timestamp a few hours ahead, to allow for clock drift', () => {
    const drift = serialize({ ...fresh(), ts: NOW + 2 * 60 * 60 * 1000 });
    expect(parse(drift, NOW)).not.toBeNull();
  });
});

describe('GPC and an explicit earlier choice', () => {
  test('re-detecting GPC keeps the source of an explicit choice, so the visitor is not asked again', () => {
    const chosen = reduce(fresh(), { type: 'rejectAll', via: 'banner' }, NOW);
    const withGpc = reduce(chosen, { type: 'gpcDetected' }, NOW);
    expect(withGpc.source).toBe('banner');
    const again = reduce(withGpc, { type: 'gpcDetected' }, NOW);
    expect(again.source).toBe('banner');
  });

  test('GPC on a visitor who has not chosen still marks the state as GPC-only', () => {
    expect(reduce(fresh(), { type: 'gpcDetected' }, NOW).source).toBe('gpc');
  });
});

describe('isSensitivePath: equivalent spellings of the same page', () => {
  test.each([
    '//weight-loss',
    '/weight%2Dloss',
    '/%77eight-loss/',
    '/Hair-Restoration',
    '/hair-restoration/index.html',
    '/hair-restoration.html',
    '/sexual-wellness//',
    '/wellness-learning-center/Some-Article/',
    '/peptides',
    '/peptides/',
  ])('%s is a health-topic page', (p) => {
    expect(isSensitivePath(p)).toBe(true);
  });

  test('a path that cannot be decoded is treated as a health-topic page (fail safe)', () => {
    expect(isSensitivePath('/%E0%A4%A')).toBe(true);
  });

  test('ordinary pages stay ordinary however they are written', () => {
    expect(isSensitivePath('/Why-WellPeps/')).toBe(false);
    expect(isSensitivePath('//')).toBe(false);
  });
});

describe('allowed: anonymous analytics', () => {
  const analyticsOn = reduce(fresh(), { type: 'set', changes: { analytics: true } }, NOW);

  test('an anonymous tool may run on a health-topic page with the ordinary analytics choice', () => {
    expect(allowed(analyticsOn, 'analytics', '/weight-loss', true)).toBe(true);
  });

  test('a non-anonymous analytics tool still needs the separate health-page consent', () => {
    expect(allowed(analyticsOn, 'analytics', '/weight-loss', false)).toBe(false);
  });

  test('an anonymous tool still needs the analytics choice to be on', () => {
    expect(allowed(fresh(), 'analytics', '/weight-loss', true)).toBe(false);
  });

  test('the anonymous exception never applies to advertising', () => {
    const adsOn = reduce(fresh(), { type: 'set', changes: { advertising: true } }, NOW);
    expect(allowed(adsOn, 'advertising', '/weight-loss', true)).toBe(false);
  });
});
