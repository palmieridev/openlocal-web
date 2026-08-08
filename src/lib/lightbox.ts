/**
 * Pan/zoom math for the public image lightbox.
 *
 * Everything here is pure so the gesture handling in the component stays a thin
 * shell over tested arithmetic. A transform is applied as
 * `translate(x, y) scale(scale)` around the element's center, so `x`/`y` are
 * post-scale pixel offsets and the identity transform shows the whole image.
 *
 * Bounds are expressed with the *fitted* content size (what the browser renders
 * at scale 1, `object-fit: contain`) plus the viewport size, which is what lets
 * the clamp keep the image from being dragged off screen while still allowing
 * the full picture to be reached at any zoom level.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Transform {
  scale: number;
  x: number;
  y: number;
}

export interface Bounds {
  viewWidth: number;
  viewHeight: number;
  contentWidth: number;
  contentHeight: number;
}

/** Fully zoomed out: the complete original image, uncropped. */
export const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };

export const MIN_SCALE = 1;
export const MAX_SCALE = 6;
/** Multiplier for one press of the +/− controls (and one wheel notch). */
export const ZOOM_STEP = 1.5;
/** Where a double tap / double click jumps to when zooming in. */
export const DOUBLE_TAP_SCALE = 2.5;

/** Keep a scale inside [MIN_SCALE, MAX_SCALE]; NaN falls back to MIN_SCALE. */
export function clampScale(scale: number): number {
  if (Number.isNaN(scale)) return MIN_SCALE;
  return Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE);
}

/**
 * How far the content may travel from center before an edge would be pulled
 * inside the viewport. Zero on an axis where the scaled content still fits.
 */
export function maxOffset(bounds: Bounds, scale: number): Point {
  const overflowX = bounds.contentWidth * scale - bounds.viewWidth;
  const overflowY = bounds.contentHeight * scale - bounds.viewHeight;
  return {
    x: Math.max(0, overflowX / 2),
    y: Math.max(0, overflowY / 2),
  };
}

/** Clamp scale and offsets so the image can never be lost off screen. */
export function clampTransform(transform: Transform, bounds: Bounds): Transform {
  const scale = clampScale(transform.scale);
  const limit = maxOffset(bounds, scale);
  const clamp = (value: number, max: number) => {
    if (!Number.isFinite(value)) return 0;
    const clamped = Math.min(Math.max(value, -max), max);
    // Normalize -0 so an untouched transform compares equal to IDENTITY.
    return clamped === 0 ? 0 : clamped;
  };
  return { scale, x: clamp(transform.x, limit.x), y: clamp(transform.y, limit.y) };
}

/** Drag the image by a pixel delta. */
export function panBy(transform: Transform, delta: Point, bounds: Bounds): Transform {
  return clampTransform(
    { scale: transform.scale, x: transform.x + delta.x, y: transform.y + delta.y },
    bounds,
  );
}

/**
 * Scale by `factor` while holding `focus` still, so pinching or wheel-zooming
 * keeps the point under the fingers/cursor in place. `focus` is measured from
 * the center of the viewport.
 */
export function zoomAt(
  transform: Transform,
  factor: number,
  focus: Point,
  bounds: Bounds,
): Transform {
  const scale = clampScale(transform.scale * (Number.isFinite(factor) ? factor : 1));
  const ratio = scale / transform.scale;
  return clampTransform(
    {
      scale,
      x: focus.x - (focus.x - transform.x) * ratio,
      y: focus.y - (focus.y - transform.y) * ratio,
    },
    bounds,
  );
}

/** Zoom to an absolute scale about a focus point (used by the +/− controls). */
export function zoomTo(
  transform: Transform,
  scale: number,
  focus: Point,
  bounds: Bounds,
): Transform {
  return zoomAt(transform, clampScale(scale) / transform.scale, focus, bounds);
}

/** Double tap / double click: jump in at the tapped point, or back to fit. */
export function toggleZoom(transform: Transform, focus: Point, bounds: Bounds): Transform {
  if (transform.scale > MIN_SCALE) return { ...IDENTITY };
  return zoomTo(transform, DOUBLE_TAP_SCALE, focus, bounds);
}

/** Distance between two pointers. */
export function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Midpoint between two pointers. */
export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export interface Pinch {
  center: Point;
  distance: number;
}

/**
 * Resolve a two-finger pinch against the transform captured when the gesture
 * started: the finger spread drives the scale and the midpoint drag pans, so
 * pinch and pan happen together the way they do in a native photo viewer.
 */
export function pinchTransform(
  start: Transform,
  startPinch: Pinch,
  current: Pinch,
  bounds: Bounds,
): Transform {
  if (startPinch.distance <= 0) return clampTransform(start, bounds);
  const zoomed = zoomAt(start, current.distance / startPinch.distance, startPinch.center, bounds);
  return panBy(
    zoomed,
    { x: current.center.x - startPinch.center.x, y: current.center.y - startPinch.center.y },
    bounds,
  );
}

/** Pointer coordinates relative to the center of a viewport rect. */
export function focusFromClient(
  client: Point,
  rect: { left: number; top: number; width: number; height: number },
): Point {
  return {
    x: client.x - (rect.left + rect.width / 2),
    y: client.y - (rect.top + rect.height / 2),
  };
}

/** Serialize for the `style.transform` of the zoom stage. */
export function transformStyle(transform: Transform): string {
  return `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
}
