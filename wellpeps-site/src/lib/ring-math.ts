/**
 * The arithmetic of the home page's guide ring (src/components/guides/GuideRing.astro), kept apart
 * from the page script so it can be tested. Angles are in degrees; guide k is at the front when the
 * ring is turned to -k * step, where step = 360 / the number of guides.
 */

/** An index wrapped into 0..n-1, for any integer. */
export function mod(index: number, n: number): number {
  return ((index % n) + n) % n;
}

/** The angle that puts guide k at the front, reached by the shortest way round from `currentAngle`. */
export function angleFor(k: number, n: number, currentAngle: number): number {
  const step = 360 / n;
  const target = -mod(k, n) * step;
  const turns = Math.round((currentAngle - target) / 360);
  return target + turns * 360;
}

/** The guide at the front when the ring is turned to `angle`. */
export function indexAt(angle: number, n: number): number {
  return mod(Math.round(-angle / (360 / n)), n);
}

/**
 * Degrees of turn per pixel dragged. `coverWidth` must be the cover's layout width (offsetWidth),
 * not its projected width, which changes as the ring turns and would make the drag speed up and
 * slow down. A drag about 85% of a cover's width moves one guide; a tiny cover is floored so the
 * ring never gets twitchy.
 */
export function degreesPerPixel(coverWidth: number, n: number): number {
  return 360 / n / Math.max(coverWidth * 0.85, 130);
}

/** Longest gap, in milliseconds, between the last pointer move and letting go that still counts as a flick. */
export const FLICK_WINDOW_MS = 80;
/** How long, in milliseconds, a flick's speed is carried on for. */
export const FLICK_CARRY_MS = 220;

export interface Release {
  /** The ring's angle when the pointer was released. */
  angle: number;
  /** Smoothed pointer speed in pixels per millisecond (negative = leftward). */
  velocity: number;
  /** Milliseconds since the pointer last moved. */
  idleMs: number;
  degPerPx: number;
  n: number;
}

/**
 * Where a drag settles: the nearest guide, carried on by a flick, by at most one guide. A pointer
 * that stopped before letting go has no flick, and a very fast one cannot spin the ring a lap.
 */
export function releaseIndex({ angle, velocity, idleMs, degPerPx, n }: Release): number {
  const step = 360 / n;
  const speed = idleMs > FLICK_WINDOW_MS ? 0 : velocity;
  const carry = Math.max(-step, Math.min(step, speed * FLICK_CARRY_MS * degPerPx));
  return mod(Math.round(-(angle + carry) / step), n);
}
