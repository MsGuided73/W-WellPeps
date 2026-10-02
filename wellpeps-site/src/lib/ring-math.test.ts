import { describe, expect, test } from 'vitest';
import { angleFor, degreesPerPixel, indexAt, mod, releaseIndex } from './ring-math';

describe('wrapping an index round the ring', () => {
  test('wraps in both directions', () => {
    expect(mod(5, 5)).toBe(0);
    expect(mod(-1, 5)).toBe(4);
    expect(mod(7, 5)).toBe(2);
    expect(mod(0, 5)).toBe(0);
  });
});

describe('the angle that puts a guide at the front', () => {
  test('guide k sits at -k steps from the start', () => {
    expect(angleFor(0, 5, 0)).toBe(0);
    expect(angleFor(1, 5, 0)).toBe(-72);
    expect(angleFor(2, 5, 0)).toBe(-144);
  });

  test('takes the short way round: from the first guide to the last is one step back, not four forward', () => {
    expect(angleFor(4, 5, 0)).toBe(72);
  });

  test('keeps turning the same way past a full circle instead of spinning back', () => {
    // After four steps forward the ring is at -288; the next guide (0) is one more step on, at -360.
    expect(angleFor(0, 5, -288)).toBe(-360);
    expect(angleFor(1, 5, -360)).toBe(-432);
  });

  test('every target is within half a turn of where the ring is, however far it has gone', () => {
    for (const current of [-1000, -361, -72, 0, 33, 400, 1234]) {
      for (let k = 0; k < 5; k++) expect(Math.abs(angleFor(k, 5, current) - current), `${current} -> ${k}`).toBeLessThanOrEqual(180);
    }
  });

  test('lands on the right guide whatever the count', () => {
    for (const n of [3, 4, 5, 6, 8]) for (let k = 0; k < n; k++) expect(indexAt(angleFor(k, n, 0), n)).toBe(k);
  });
});

describe('which guide is at the front for an angle', () => {
  test('rounds to the nearest guide', () => {
    expect(indexAt(0, 5)).toBe(0);
    expect(indexAt(-30, 5)).toBe(0);
    expect(indexAt(-40, 5)).toBe(1);
    expect(indexAt(-72, 5)).toBe(1);
  });

  test('wraps past a full circle either way', () => {
    expect(indexAt(-360, 5)).toBe(0);
    expect(indexAt(-288, 5)).toBe(4);
    expect(indexAt(72, 5)).toBe(4);
    expect(indexAt(432, 5)).toBe(mod(-6, 5));
  });
});

describe('how far a drag turns the ring', () => {
  test('a drag about as long as a cover is wide moves about one guide', () => {
    const cover = 316;
    const degrees = 0.85 * cover * degreesPerPixel(cover, 5);
    expect(degrees).toBeCloseTo(72, 5);
  });

  test('is steady: it depends only on the cover’s layout width and the count', () => {
    expect(degreesPerPixel(316, 5)).toBe(degreesPerPixel(316, 5));
    expect(degreesPerPixel(316, 5)).toBeLessThan(degreesPerPixel(200, 5));
  });

  test('a tiny cover does not make the ring twitchy', () => {
    expect(degreesPerPixel(10, 5)).toBe(72 / 130);
    expect(degreesPerPixel(0, 5)).toBe(72 / 130);
  });
});

describe('where a drag settles when the pointer lets go', () => {
  const base = { degPerPx: 0.3, n: 5 };

  test('with no flick it settles on the nearest guide', () => {
    expect(releaseIndex({ ...base, angle: -10, velocity: 0, idleMs: 0 })).toBe(0);
    expect(releaseIndex({ ...base, angle: -40, velocity: 0, idleMs: 0 })).toBe(1);
  });

  test('a flick carries on by one guide, no more, however fast', () => {
    expect(releaseIndex({ ...base, angle: -10, velocity: -2, idleMs: 10 })).toBe(1);
    expect(releaseIndex({ ...base, angle: -10, velocity: -40, idleMs: 10 })).toBe(1);
    expect(releaseIndex({ ...base, angle: -10, velocity: 40, idleMs: 10 })).toBe(4);
  });

  test('a pause before letting go cancels the flick', () => {
    expect(releaseIndex({ ...base, angle: -10, velocity: -2, idleMs: 500 })).toBe(0);
    expect(releaseIndex({ ...base, angle: -10, velocity: -2, idleMs: 81 })).toBe(0);
    expect(releaseIndex({ ...base, angle: -10, velocity: -2, idleMs: 80 })).toBe(1);
  });

  test('always returns a guide that exists', () => {
    for (const angle of [-1000, -72, 0, 500]) for (const velocity of [-9, 0, 9]) {
      const k = releaseIndex({ ...base, angle, velocity, idleMs: 0 });
      expect(Number.isInteger(k) && k >= 0 && k < 5, `${angle}/${velocity} -> ${k}`).toBe(true);
    }
  });
});
