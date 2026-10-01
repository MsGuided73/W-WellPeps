import { describe, expect, test } from 'vitest';
import {
  ANALYTICS_ENABLED,
  ANALYTICS_ENDPOINT,
  ANALYTICS_PATH_DETAIL,
  CONSENT_LOG_ENDPOINT,
  PRIVACY_REQUEST_ENDPOINT,
} from '../privacy/config';
import { NOTICE_TOOL_IDS } from '../privacy/cookie-notice-inventory';
import { createGate } from '../privacy/gate';
import { productionTrackers, validateRegistry } from '../privacy/registry';
import { ANALYTICS_TRACKER_ID } from './tracker';

/**
 * The analytics tool is built but registered OFF. These checks hold in BOTH
 * states of the switch: they describe what must be true while it is off (the
 * state shipped today) and what must also be true before it is turned on.
 */
describe('the analytics tool in the production registry', () => {
  test('is registered exactly when ANALYTICS_ENABLED is true, and not otherwise', () => {
    expect(productionTrackers().map((t) => t.id)).toEqual(ANALYTICS_ENABLED ? [ANALYTICS_TRACKER_ID] : []);
  });

  test('while it is off, the registry is empty, so the first-visit bar never appears', () => {
    const gate = createGate({
      now: () => Date.UTC(2026, 9, 1),
      uuid: () => '00000000-0000-4000-8000-000000000001',
      cookies: { read: () => null, write: () => {}, removeConsent: () => {}, remove: () => {} },
      readGpc: () => false,
      path: () => '/',
      trackers: productionTrackers(),
      log: () => {},
    });
    gate.init();
    expect(gate.hasNonEssential()).toBe(ANALYTICS_ENABLED);
    expect(gate.promptReason()).toBe(ANALYTICS_ENABLED ? 'first' : null);
  });

  test('the production registry is valid in either state', () => {
    expect(() => validateRegistry(productionTrackers())).not.toThrow();
  });

  test('turning the switch on is refused by this test until an endpoint is set and the Cookie notice names the tool', () => {
    if (!ANALYTICS_ENABLED) {
      expect(NOTICE_TOOL_IDS.analytics).not.toContain(ANALYTICS_TRACKER_ID);
      return;
    }
    expect(ANALYTICS_ENDPOINT).toMatch(/^https:\/\/[^\s]+\/functions\/v1\/analytics-event$/);
    expect(NOTICE_TOOL_IDS.analytics).toContain(ANALYTICS_TRACKER_ID);
  });

  test('every endpoint is empty (not deployed) or an https function URL, never anything else', () => {
    for (const url of [ANALYTICS_ENDPOINT, PRIVACY_REQUEST_ENDPOINT]) expect(url === '' || /^https:\/\//.test(url)).toBe(true);
    expect(CONSENT_LOG_ENDPOINT).toMatch(/^https:\/\//);
  });

  test('the health-page path detail is one of the two values counsel can choose', () => {
    expect(['full', 'section']).toContain(ANALYTICS_PATH_DETAIL);
  });
});
