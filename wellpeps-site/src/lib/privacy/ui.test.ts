import { describe, expect, test } from 'vitest';
import { bannerCopy, savedLine, showsHealthSwitch, statusAfter, summarize } from './ui';
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

  test('says advertising never runs on health-topic pages, because that is enforced', () => {
    expect(bannerCopy([tool({ id: 'ads', name: 'Ad pixel', category: 'advertising' })])).toMatch(
      /advertising.*never.*health/i,
    );
  });

  test('with an anonymous analytics tool it does not claim analytics is off on health-topic pages', () => {
    const text = bannerCopy([tool({ anonymous: true })]);
    expect(text).not.toMatch(/do not use these tools on pages about specific health topics/i);
    expect(text).toMatch(/health/i);
    expect(text).toMatch(/no cookie/i);
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
