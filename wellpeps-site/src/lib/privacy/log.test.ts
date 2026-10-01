import { describe, expect, test, vi } from 'vitest';
import { browserFamily, buildLogEvent, createSink } from './log';
import { defaultState, reduce } from './consent';

const NOW = Date.UTC(2026, 9, 1, 12, 0, 0);
const state = reduce(defaultState(NOW, 'cid-1'), { type: 'acceptAll' }, NOW);

describe('buildLogEvent', () => {
  const ev = buildLogEvent(state, 'accept_all', {
    now: NOW,
    uuid: () => 'evt-1',
    path: '/weight-loss?utm_source=ad&email=a@b.com#pricing',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36',
  });

  test('records the fields the specification asks for', () => {
    expect(ev).toMatchObject({
      event_id: 'evt-1',
      consent_id: 'cid-1',
      occurred_at: '2026-10-01T12:00:00.000Z',
      action: 'accept_all',
      analytics: true,
      advertising: true,
      gpc_detected: false,
      notice_version: state.v,
    });
    expect(typeof ev.banner_version).toBe('string');
  });

  test('sends only a coarse page class, never the path, so a visitor id is never tied to a health-topic page', () => {
    expect(ev.page_class).toBe('health');
    expect(ev).not.toHaveProperty('page_path');
    expect(JSON.stringify(ev)).not.toContain('/weight-loss');
    expect(JSON.stringify(ev)).not.toContain('a@b.com');
    expect(JSON.stringify(ev)).not.toContain('utm_source');
  });

  test('an ordinary page is classed as other', () => {
    const e = buildLogEvent(state, 'custom', { now: NOW, uuid: () => 'x', path: '/why-wellpeps', userAgent: '' });
    expect(e.page_class).toBe('other');
  });

  test('a path written with encoding tricks is still classed as health', () => {
    const e = buildLogEvent(state, 'custom', { now: NOW, uuid: () => 'x', path: '//weight%2Dloss/', userAgent: '' });
    expect(e.page_class).toBe('health');
  });

  test('stores a coarse browser family, not the full user-agent string', () => {
    expect(ev.user_agent).toBe('Chrome');
  });

  test('has no IP address field on the client (the server decides what to keep)', () => {
    expect(ev).not.toHaveProperty('ip_address');
  });

  test('gives each event its own id', () => {
    let n = 0;
    const make = () => buildLogEvent(state, 'custom', { now: NOW, uuid: () => `e${++n}`, path: '/', userAgent: '' });
    expect(make().event_id).not.toBe(make().event_id);
  });

  test('flags a detected GPC signal', () => {
    const s = reduce(defaultState(NOW, 'c'), { type: 'gpcDetected' }, NOW);
    expect(buildLogEvent(s, 'gpc_auto_optout', { now: NOW, uuid: () => 'x', path: '/', userAgent: '' }).gpc_detected).toBe(true);
  });
});

describe('browserFamily', () => {
  test.each([
    ['Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36', 'Chrome'],
    ['Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36 Edg/120.0', 'Edge'],
    ['Mozilla/5.0 (Macintosh) AppleWebKit/605 Version/17.0 Safari/605.1.15', 'Safari'],
    ['Mozilla/5.0 (X11; Linux) Gecko/20100101 Firefox/121.0', 'Firefox'],
    ['curl/8.0', 'Other'],
    ['', 'Other'],
  ])('%s -> %s', (ua, family) => {
    expect(browserFamily(ua)).toBe(family);
  });
});

describe('createSink', () => {
  const event = buildLogEvent(state, 'accept_all', { now: NOW, uuid: () => 'e', path: '/', userAgent: '' });

  test('does nothing on the network while disabled', () => {
    const send = vi.fn();
    const fetchImpl = vi.fn();
    createSink({ enabled: false, endpoint: 'https://x.test/log', sendBeacon: send, fetchImpl })(event);
    expect(send).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('uses sendBeacon when enabled and available', () => {
    const send = vi.fn().mockReturnValue(true);
    createSink({ enabled: true, endpoint: 'https://x.test/log', sendBeacon: send })(event);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBe('https://x.test/log');
  });

  test('falls back to a keepalive fetch when sendBeacon is missing or refuses', () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    createSink({ enabled: true, endpoint: 'https://x.test/log', sendBeacon: () => false, fetchImpl })(event);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ method: 'POST', keepalive: true });
  });

  test('never throws, even when the network call fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    const sink = createSink({ enabled: true, endpoint: 'https://x.test/log', fetchImpl });
    expect(() => sink(event)).not.toThrow();
    await Promise.resolve();
  });

  test('also hands every event to a local listener for the dev inspector', () => {
    const seen = vi.fn();
    createSink({ enabled: false, endpoint: '', onEvent: seen })(event);
    expect(seen).toHaveBeenCalledWith(event);
  });
});
