import { describe, expect, test } from 'vitest';
import { cardLook, guidesPerPixel, indexAt, mod, NEAR_GAP, positionFor, releaseIndex, wrapOffset } from './strip-math';

describe('wrapping round the strip', () => {
  test('wraps indexes in both directions', () => {
    expect(mod(5, 5)).toBe(0);
    expect(mod(-1, 5)).toBe(4);
    expect(mod(7, 5)).toBe(2);
  });

  test('a cover’s distance from the centre is the short way round', () => {
    expect(wrapOffset(0, 0, 5)).toBe(0);
    expect(wrapOffset(1, 0, 5)).toBe(1);
    expect(wrapOffset(4, 0, 5)).toBe(-1);
    expect(wrapOffset(2, 0, 5)).toBe(2);
    expect(wrapOffset(3, 0, 5)).toBe(-2);
  });

  test('distances slide smoothly between guides and stay within half the strip', () => {
    expect(wrapOffset(1, 0.25, 5)).toBeCloseTo(0.75);
    expect(wrapOffset(0, 0.25, 5)).toBeCloseTo(-0.25);
    for (const p of [-7.3, -1, 0, 0.5, 2.49, 12.1]) for (let i = 0; i < 5; i++) {
      const o = wrapOffset(i, p, 5);
      expect(o >= -2.5 && o < 2.5, `${i}@${p} -> ${o}`).toBe(true);
    }
  });
});

describe('the position that centres a guide', () => {
  test('takes the short way: from the first guide to the last is one step back', () => {
    expect(positionFor(4, 5, 0)).toBe(-1);
    expect(positionFor(1, 5, 0)).toBe(1);
  });

  test('keeps going the same way past the end instead of sliding all the way back', () => {
    expect(positionFor(0, 5, 4)).toBe(5);
    expect(positionFor(1, 5, 5)).toBe(6);
  });

  test('lands on the right guide whatever the count', () => {
    for (const n of [3, 4, 5, 6, 8]) for (let k = 0; k < n; k++) expect(indexAt(positionFor(k, n, 17.2), n)).toBe(k);
  });
});

describe('how far a drag moves the strip', () => {
  test('a drag as long as the gap between covers moves one guide', () => {
    expect(300 * NEAR_GAP * guidesPerPixel(300)).toBeCloseTo(1, 6);
  });

  test('a tiny cover does not make the strip twitchy', () => {
    expect(guidesPerPixel(10)).toBe(1 / 130);
  });
});

describe('where a drag settles', () => {
  const base = { guidesPerPx: 0.004, n: 5 };

  test('with no flick it settles on the nearest guide', () => {
    expect(releaseIndex({ ...base, position: 0.3, velocity: 0, idleMs: 0 })).toBe(0);
    expect(releaseIndex({ ...base, position: 0.6, velocity: 0, idleMs: 0 })).toBe(1);
  });

  test('a leftward flick brings in the next guide, by one at most', () => {
    expect(releaseIndex({ ...base, position: 0.1, velocity: -2, idleMs: 10 })).toBe(1);
    expect(releaseIndex({ ...base, position: 0.1, velocity: -40, idleMs: 10 })).toBe(1);
    expect(releaseIndex({ ...base, position: 0.1, velocity: 40, idleMs: 10 })).toBe(4);
  });

  test('a pause before letting go cancels the flick', () => {
    expect(releaseIndex({ ...base, position: 0.1, velocity: -2, idleMs: 81 })).toBe(0);
    expect(releaseIndex({ ...base, position: 0.1, velocity: -2, idleMs: 80 })).toBe(1);
  });
});

describe('how each cover looks', () => {
  test('the centre cover is the largest, brightest and on top', () => {
    const c = cardLook(0, 5);
    expect(c).toMatchObject({ x: 0, scale: 1, opacity: 1, brightness: 1 });
    for (const o of [-2, -1, -0.4, 0.4, 1, 2]) {
      const s = cardLook(o, 5);
      expect(s.scale).toBeLessThan(1);
      expect(s.zIndex).toBeLessThan(c.zIndex);
    }
  });

  test('a cover grows as it slides into the centre and shrinks as it leaves', () => {
    const sizes = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2].map((o) => cardLook(o, 5).scale);
    for (let i = 0; i < 4; i++) expect(sizes[i]).toBeLessThan(sizes[i + 1]);
    for (let i = 4; i < 8; i++) expect(sizes[i]).toBeGreaterThan(sizes[i + 1]);
  });

  test('covers keep their order and never trade places', () => {
    const xs = [-2.4, -2, -1, -0.5, 0, 0.5, 1, 2, 2.4].map((o) => cardLook(o, 5).x);
    for (let i = 0; i < xs.length - 1; i++) expect(xs[i]).toBeLessThan(xs[i + 1]);
  });

  test('neighbours do not overlap the centre cover', () => {
    const near = cardLook(1, 5);
    expect(near.x - near.scale / 2).toBeGreaterThan(0.5);
  });

  test('all five show at rest; a cover is invisible where it wraps from one end to the other', () => {
    for (const o of [-2, -1, 0, 1, 2]) expect(cardLook(o, 5).opacity).toBe(1);
    expect(cardLook(2.5, 5).opacity).toBe(0);
    expect(cardLook(-2.5, 5).opacity).toBe(0);
  });
});
