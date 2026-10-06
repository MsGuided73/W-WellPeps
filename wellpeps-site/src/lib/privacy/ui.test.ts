import { describe, expect, test } from 'vitest';
import {
  bannerCopy,
  savedLine,
  sensitiveNote,
  showsAdsHealthSwitch,
  showsAnonymousRow,
  showsHealthSwitch,
  statusAfter,
  summarize,
} from './ui';
import { defaultState, reduce } from './consent';
import type { GateSnapshot } from './gate';
import type { Tracker } from './registry';

const NOW = Date.UTC(2026, 9, 1, 12, 0, 0);
const noop = () => {};

const tool = (over: Partial<Tracker> = {}): Tracker => ({
  id: 'counter',
  name: 'Page counter',
  vendor: 'WellPeps',
  category: 'analytics',
  description: 'Counts visits.',
  hosts: ['api.wellpeps.com'],
  cookies: [],
  storageKeys: [],
  load: noop,
  unload: noop,
  ...over,
});

const snap = (over: Partial<GateSnapshot> = {}): GateSnapshot => ({
  state: defaultState(NOW, 'cid'),
  loaded: [],
  storageBlocked: false,
  promptReason: null,
  advertisingLockedByGpc: false,
  path: '/',
  ...over,
});

describe('summarize: says what is really running, not what is switched on', () => {
  test('with nothing running it says only essential tools run', () => {
    expect(summarize(snap(), [])).toBe('Right now on this page: essential tools only.');
  });

  test('a switch that is on but has no tool behind it does not claim a tool is running', () => {
    const on = reduce(defaultState(NOW, 'c'), { type: 'set', changes: { analytics: true } }, NOW);
    const text = summarize(snap({ state: on }), []);
    expect(text).toContain('essential tools only');
    expect(text).not.toMatch(/analytics\.$/);
  });

  test('names the tools that are running', () => {
    const t = tool();
    const on = reduce(defaultState(NOW, 'c'), { type: 'set', changes: { analytics: true } }, NOW);
    const text = summarize(snap({ state: on, loaded: ['counter'] }), [t]);
    expect(text).toBe('Right now on this page: essential tools and Page counter.');
  });
});

describe('savedLine and statusAfter: say where the choice lives', () => {
  test('a saved choice is said to be saved in this browser', () => {
    const chosen = reduce(defaultState(NOW, 'c'), { type: 'rejectAll', via: 'banner' }, NOW);
    expect(savedLine(snap({ state: chosen }))).toMatch(/saved in this browser/i);
  });

  test('a confirmation says it was saved in this browser', () => {
    expect(statusAfter({ type: 'rejectAll' }, snap())).toMatch(/this browser/i);
    expect(statusAfter({ type: 'withdrawAll' }, snap())).toMatch(/this browser/i);
  });
});

describe('bannerCopy: written from the tool list, so it cannot promise what the code does not do', () => {
  test('names every tool', () => {
    const text = bannerCopy([tool(), tool({ id: 'ads', name: 'Ad pixel', category: 'advertising' })]);
    expect(text).toContain('Page counter');
    expect(text).toContain('Ad pixel');
  });

  test('says advertising runs on health-topic pages only with a separate yes that "Accept all" does not give', () => {
    const text = bannerCopy([tool({ id: 'ads', name: 'Ad pixel', category: 'advertising' })]);
    expect(text).toMatch(/advertising.*health.*separately/i);
    expect(text).toMatch(/accept all.*does not include/i);
    expect(text).not.toMatch(/never/i);
  });

  test('with only an anonymous analytics tool it says it is on by default with an opt-out, and asks nothing', () => {
    const text = bannerCopy([tool({ anonymous: true })]);
    expect(text).toMatch(/on by default/i);
    expect(text).toMatch(/no cookie/i);
    expect(text).toMatch(/turn them off/i);
    expect(text).not.toMatch(/say yes|would like/i);
  });

  test('an anonymous tool is not named among the tools that stay off until the visitor says yes', () => {
    const text = bannerCopy([tool({ anonymous: true, name: 'Anon stats' }), tool({ id: 'o', name: 'Other stats', cookies: ['_x'] })]);
    expect(text).toMatch(/would like to use Other stats/);
    expect(text).not.toMatch(/use Anon stats/);
    expect(text).toMatch(/on by default/i);
  });

  test('with an ordinary analytics tool it says health-topic pages need a separate yes', () => {
    expect(bannerCopy([tool({ cookies: ['_x'] })])).toMatch(/health.*separately|separately.*health/i);
  });
});

describe('showsHealthSwitch', () => {
  test('hidden when no analytics tool needs it', () => {
    expect(showsHealthSwitch([])).toBe(false);
    expect(showsHealthSwitch([tool({ anonymous: true })])).toBe(false);
  });

  test('shown when an ordinary analytics tool exists', () => {
    expect(showsHealthSwitch([tool({ cookies: ['_x'] })])).toBe(true);
  });

  test('an advertising tool alone does not need it', () => {
    expect(showsHealthSwitch([tool({ id: 'ads', category: 'advertising' })])).toBe(false);
  });
});

describe('the separate health-page advertising switch and the anonymous row', () => {
  test('the advertising sub-switch is shown only when an advertising tool exists', () => {
    expect(showsAdsHealthSwitch([])).toBe(false);
    expect(showsAdsHealthSwitch([tool()])).toBe(false);
    expect(showsAdsHealthSwitch([tool({ id: 'ads', category: 'advertising' })])).toBe(true);
  });

  test('the anonymous row is shown only when an anonymous tool exists', () => {
    expect(showsAnonymousRow([])).toBe(false);
    expect(showsAnonymousRow([tool({ cookies: ['_x'] })])).toBe(false);
    expect(showsAnonymousRow([tool({ anonymous: true })])).toBe(true);
  });

  test('the health-page note no longer says advertising never runs there, and states the real rule', () => {
    const ads = tool({ id: 'ads', category: 'advertising' });
    expect(sensitiveNote([])).not.toMatch(/never/i);
    expect(sensitiveNote([ads])).toMatch(/advertising.*only if you also allow/i);
    expect(sensitiveNote([tool({ anonymous: true })])).toMatch(/unless you turned them off/i);
  });

  test('a custom change reports the health-page advertising choice and, when changed, the anonymous statistics', () => {
    let s = reduce(defaultState(NOW, 'c'), { type: 'set', changes: { advertising: true, advertisingSensitive: true } }, NOW);
    expect(statusAfter({ type: 'set', changes: { advertisingSensitive: true } }, snap({ state: s }))).toMatch(
      /Advertising is on, health-topic pages included/,
    );
    s = reduce(s, { type: 'set', changes: { anonymous: false } }, NOW);
    expect(statusAfter({ type: 'set', changes: { anonymous: false } }, snap({ state: s }))).toMatch(/Anonymous usage statistics are off/);
    expect(statusAfter({ type: 'set', changes: { analytics: true } }, snap({ state: s }))).not.toMatch(/Anonymous/);
  });
});
