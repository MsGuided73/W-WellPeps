/**
 * The arithmetic of the home page's guide strip (src/components/guides/GuideRing.astro), kept apart
 * from the page script so it can be tested.
 *
 * The strip has a position measured in guides: guide k is in the centre when the position is k.
 * Between guides the position is fractional, so as the strip slides each cover's size, place and
 * brightness change smoothly with its distance from the centre. The strip loops: a cover leaving one
 * end fades out and comes back in at the other.
 */

/** An index wrapped into 0..n-1 (or a position into [0, n)), for any number. */
export function mod(value: number, n: number): number {
  return ((value % n) + n) % n;
}

/** How far guide i is from the centre, in guides, the short way round: in [-n/2, n/2). Negative = left. */
export function wrapOffset(i: number, position: number, n: number): number {
  return mod(i - position + n / 2, n) - n / 2;
}

/** The position that puts guide k in the centre, reached by the shortest way from `current`. */
export function positionFor(k: number, n: number, current: number): number {
  const target = mod(k, n);
  return target + Math.round((current - target) / n) * n;
}

/** The guide in the centre at `position`. */
export function indexAt(position: number, n: number): number {
  return mod(Math.round(position), n);
}

/**
 * Guides moved per pixel dragged. `coverWidth` must be the cover's layout width (offsetWidth), which
 * does not change with its scale. A drag about as long as the gap between two covers moves one
 * guide; a tiny cover is floored so the strip never gets twitchy.
 */
export function guidesPerPixel(coverWidth: number): number {
  return 1 / Math.max(coverWidth * NEAR_GAP, 130);
}

/** Longest gap, in milliseconds, between the last pointer move and letting go that still counts as a flick. */
export const FLICK_WINDOW_MS = 80;
/** How long, in milliseconds, a flick's speed is carried on for. */
export const FLICK_CARRY_MS = 220;

export interface Release {
  /** The strip's position when the pointer was released. */
  position: number;
  /** Smoothed pointer speed in pixels per millisecond (negative = leftward). */
  velocity: number;
  /** Milliseconds since the pointer last moved. */
  idleMs: number;
  guidesPerPx: number;
  n: number;
}

/**
 * Where a drag settles: the nearest guide, carried on by a flick, by at most one guide. Dragging
 * left brings the next guide in, as a finger pulling the strip would. A pointer that stopped before
 * letting go has no flick.
 */
export function releaseIndex({ position, velocity, idleMs, guidesPerPx, n }: Release): number {
  const speed = idleMs > FLICK_WINDOW_MS ? 0 : velocity;
  const carry = Math.max(-1, Math.min(1, -speed * FLICK_CARRY_MS * guidesPerPx));
  return mod(Math.round(position + carry), n);
}

/** Centre-to-centre distance, in front-cover widths, from the centre cover to its neighbour... */
export const NEAR_GAP = 0.86;
/** ...and between covers further out, which are smaller and so sit closer together. */
export const FAR_GAP = 0.66;
/** Size of the neighbours, and the smallest any cover gets, relative to the centre cover. */
export const NEAR_SCALE = 0.6;
export const MIN_SCALE = 0.52;

export interface CardLook {
  /** Sideways shift from the centre, in front-cover widths. */
  x: number;
  scale: number;
  opacity: number;
  /** 1 = full brightness. */
  brightness: number;
  zIndex: number;
}

/** How a cover looks at `offset` guides from the centre of a strip of n. */
export function cardLook(offset: number, n: number): CardLook {
  const d = Math.abs(offset);
  const sign = Math.sign(offset);
  const near = Math.min(d, 1);
  const beyond = Math.max(d - 1, 0);
  const scale = Math.max(MIN_SCALE, 1 - (1 - NEAR_SCALE) * near - (NEAR_SCALE - MIN_SCALE) * beyond);
  // Fully shown up to half a guide before the strip's ends, then faded out where it wraps round.
  const edge = n / 2;
  const opacity = Math.max(0, Math.min(1, (edge - d) / 0.5));
  return {
    x: sign * (NEAR_GAP * near + FAR_GAP * beyond),
    scale,
    opacity,
    brightness: 1 - 0.28 * Math.min(d, 2),
    zIndex: Math.round(100 - d * 10),
  };
}
