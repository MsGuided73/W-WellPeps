import { describe, expect, test } from 'vitest';
import {
  BANNED_TRACKER_IDS,
  hasNonEssential,
  inventory,
  inventoryDiff,
  productionTrackers,
  validateRegistry,
  type Tracker,
} from './registry';

const noop = () => {};
const tracker = (over: Partial<Tracker> = {}): Tracker => ({
  id: 'example-analytics',
  name: 'Example Analytics',
  vendor: 'Example Inc.',
  category: 'analytics',
  description: 'Counts visits.',
  hosts: ['analytics.example.com'],
  cookies: ['_ex'],
  storageKeys: [],
  load: noop,
  unload: noop,
  ...over,
});

describe('production registry', () => {
  test('passes its own validation', () => {
    expect(() => validateRegistry(productionTrackers())).not.toThrow();
  });

  test('lists exactly the tools the published notice names: Curve advert measurement, in the advertising category', () => {
    const tools = productionTrackers();
    expect(tools.map((t) => `${t.category}:${t.id}`)).toEqual(['advertising:curve-compliance']);
    expect(hasNonEssential(tools)).toBe(true);
  });

  test('the Curve entry makes no claim it cannot keep, and lists what the gate must clear', () => {
    const curve = productionTrackers().find((t) => t.id === 'curve-compliance')!;
    // Session replay is blocked by the Content-Security-Policy, not by this entry, so it must not claim it.
    expect(curve.sessionReplay).toBeUndefined();
    expect(curve.anonymous).toBeUndefined();
    expect(curve.hosts).toEqual(['t.curvecompliance.com']);
    expect(curve.cookies).toContain('_ct_xd');
    for (const key of ['phi_tracker_state', 'complytrack_session', 'complytrack_idmt', 'complytrack_consent']) expect(curve.storageKeys).toContain(key);
  });
});

describe('validateRegistry', () => {
  test('accepts a well-formed tool', () => {
    expect(() => validateRegistry([tracker()])).not.toThrow();
  });

  test('rejects duplicate ids', () => {
    expect(() => validateRegistry([tracker(), tracker()])).toThrow(/duplicate/i);
  });

  test('rejects an unknown category', () => {
    expect(() => validateRegistry([tracker({ category: 'essential' as never })])).toThrow(/category/i);
  });

  test('rejects a tool with no listed hosts, because the notice must name where data goes', () => {
    expect(() => validateRegistry([tracker({ hosts: [] })])).toThrow(/hosts/i);
  });

  test.each(BANNED_TRACKER_IDS)('rejects session-replay tool %s', (id) => {
    expect(() => validateRegistry([tracker({ id })])).toThrow(/session-replay tool/i);
  });

  test('the banned list covers the common session-replay vendors', () => {
    for (const v of ['hotjar', 'fullstory', 'logrocket', 'microsoft-clarity', 'mouseflow', 'smartlook']) {
      expect(BANNED_TRACKER_IDS).toContain(v);
    }
  });
});

describe('hasNonEssential / inventory', () => {
  test('is true once any optional tool exists', () => {
    expect(hasNonEssential([tracker()])).toBe(true);
  });

  test('does not count an anonymous tool: an anonymous-only setup needs no consent banner', () => {
    const anon = tracker({ anonymous: true, cookies: [] });
    expect(hasNonEssential([anon])).toBe(false);
    expect(hasNonEssential([anon, tracker({ id: 'ads', category: 'advertising' })])).toBe(true);
  });

  test('groups tools by category for the on-screen list', () => {
    const inv = inventory([tracker(), tracker({ id: 'ads', category: 'advertising', name: 'Ads' })]);
    expect(inv.analytics.map((t) => t.id)).toEqual(['example-analytics']);
    expect(inv.advertising.map((t) => t.id)).toEqual(['ads']);
  });
});

describe('inventoryDiff', () => {
  test('is empty when the notice and the registry agree', () => {
    const diff = inventoryDiff({ analytics: ['example-analytics'], advertising: [] }, [tracker()]);
    expect(diff).toEqual({ missingFromNotice: [], missingFromRegistry: [] });
  });

  test('flags a tool in the code that the notice does not list', () => {
    const diff = inventoryDiff({ analytics: [], advertising: [] }, [tracker()]);
    expect(diff.missingFromNotice).toEqual(['example-analytics']);
  });

  test('flags a tool the notice lists that the code does not have', () => {
    const diff = inventoryDiff({ analytics: ['ghost'], advertising: [] }, []);
    expect(diff.missingFromRegistry).toEqual(['ghost']);
  });
});

describe('validateRegistry: stricter rules', () => {
  test('rejects a replay tool whose id merely contains a banned name', () => {
    expect(() => validateRegistry([tracker({ id: 'hotjar-analytics' })])).toThrow(/replay|banned/i);
  });

  test('rejects a replay tool by its vendor name', () => {
    expect(() => validateRegistry([tracker({ vendor: 'Hotjar Ltd.' })])).toThrow(/replay|banned/i);
  });

  test('rejects a replay tool by the host it contacts', () => {
    expect(() => validateRegistry([tracker({ hosts: ['static.hotjar.com'] })])).toThrow(/replay|banned/i);
  });

  test('an anonymous tool may not set cookies', () => {
    expect(() => validateRegistry([tracker({ anonymous: true, cookies: ['_x'] })])).toThrow(/anonymous/i);
  });

  test('an anonymous tool may not use browser storage', () => {
    expect(() => validateRegistry([tracker({ anonymous: true, cookies: [], storageKeys: ['k'] })])).toThrow(/anonymous/i);
  });

  test('an anonymous tool with no cookies and no storage is accepted', () => {
    expect(() => validateRegistry([tracker({ anonymous: true, cookies: [], storageKeys: [] })])).not.toThrow();
  });
});

describe('validateRegistry: aggregate heatmaps and session replay', () => {
  test('accepts an analytics tool that makes aggregate heatmaps', () => {
    expect(() => validateRegistry([tracker({ heatmaps: 'aggregate' })])).not.toThrow();
  });

  test('accepts an anonymous analytics tool that makes aggregate heatmaps', () => {
    expect(() => validateRegistry([tracker({ heatmaps: 'aggregate', anonymous: true, cookies: [] })])).not.toThrow();
  });

  test('rejects heatmaps on an advertising tool', () => {
    expect(() => validateRegistry([tracker({ id: 'ads', category: 'advertising', heatmaps: 'aggregate' })])).toThrow(/heatmaps/i);
  });

  test('rejects any heatmap mode other than aggregate', () => {
    expect(() => validateRegistry([tracker({ heatmaps: 'per-visitor' as never })])).toThrow(/aggregate/i);
  });

  test('accepts a tool that says it records no sessions', () => {
    expect(() => validateRegistry([tracker({ sessionReplay: false })])).not.toThrow();
  });

  test('rejects a tool that says it records sessions', () => {
    expect(() => validateRegistry([tracker({ sessionReplay: true as never })])).toThrow(/session/i);
  });

  test('a heatmap tool from a banned session-replay vendor is still rejected', () => {
    expect(() => validateRegistry([tracker({ id: 'hotjar', heatmaps: 'aggregate' })])).toThrow(/session-replay/i);
    expect(() => validateRegistry([tracker({ heatmaps: 'aggregate', hosts: ['script.crazyegg.com'] })])).toThrow(/session-replay/i);
  });
});
