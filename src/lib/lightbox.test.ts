import { describe, expect, it } from "vitest";
import {
  DOUBLE_TAP_SCALE,
  IDENTITY,
  MAX_SCALE,
  MIN_SCALE,
  ZOOM_STEP,
  clampScale,
  clampTransform,
  distanceBetween,
  focusFromClient,
  maxOffset,
  midpoint,
  panBy,
  pinchTransform,
  toggleZoom,
  transformStyle,
  zoomAt,
  zoomTo,
  type Bounds,
} from "./lightbox";

// A 400×300 picture fitted inside an 800×600 stage.
const bounds: Bounds = {
  viewWidth: 800,
  viewHeight: 600,
  contentWidth: 400,
  contentHeight: 300,
};

describe("clampScale", () => {
  it("keeps the scale inside the allowed range", () => {
    expect(clampScale(0.2)).toBe(MIN_SCALE);
    expect(clampScale(99)).toBe(MAX_SCALE);
    expect(clampScale(2)).toBe(2);
  });

  it("falls back to fit for non-finite input", () => {
    expect(clampScale(Number.NaN)).toBe(MIN_SCALE);
    expect(clampScale(Number.POSITIVE_INFINITY)).toBe(MAX_SCALE);
  });
});

describe("maxOffset", () => {
  it("is zero while the image still fits", () => {
    expect(maxOffset(bounds, 1)).toEqual({ x: 0, y: 0 });
  });

  it("grows with the overflow once zoomed past the viewport", () => {
    // 400*4 = 1600 wide vs 800 → 400 px of travel each way.
    expect(maxOffset(bounds, 4)).toEqual({ x: 400, y: 300 });
  });
});

describe("clampTransform", () => {
  it("pins a fitted image to the center so it cannot be dragged away", () => {
    expect(clampTransform({ scale: 1, x: 500, y: -500 }, bounds)).toEqual(IDENTITY);
  });

  it("allows travel up to the edge when zoomed", () => {
    expect(clampTransform({ scale: 4, x: 9999, y: -9999 }, bounds)).toEqual({
      scale: 4,
      x: 400,
      y: -300,
    });
  });

  it("repairs a non-finite offset", () => {
    expect(clampTransform({ scale: 2, x: Number.NaN, y: 0 }, bounds).x).toBe(0);
  });
});

describe("panBy", () => {
  it("moves the image and clamps at the edge", () => {
    expect(panBy({ scale: 4, x: 0, y: 0 }, { x: 120, y: 60 }, bounds)).toEqual({
      scale: 4,
      x: 120,
      y: 60,
    });
    expect(panBy({ scale: 4, x: 380, y: 0 }, { x: 200, y: 0 }, bounds).x).toBe(400);
  });

  it("is a no-op while the whole image is visible", () => {
    expect(panBy(IDENTITY, { x: 200, y: 200 }, bounds)).toEqual(IDENTITY);
  });
});

describe("zoomAt", () => {
  it("holds the focused point still", () => {
    // Content that already fills the stage, so the clamp leaves room to move.
    const filled: Bounds = { ...bounds, contentWidth: 800, contentHeight: 600 };
    const focus = { x: 100, y: 50 };
    const next = zoomAt(IDENTITY, 2, focus, filled);
    expect(next.scale).toBe(2);
    // The content point under the focus is unchanged: (focus - offset) / scale.
    const before = { x: focus.x - IDENTITY.x, y: focus.y - IDENTITY.y };
    const after = { x: (focus.x - next.x) / next.scale, y: (focus.y - next.y) / next.scale };
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("clamps a zoom that the viewport still contains", () => {
    // 400×300 doubled is exactly the 800×600 stage: nothing to pan to.
    expect(zoomAt(IDENTITY, 2, { x: 100, y: 50 }, bounds)).toEqual({ scale: 2, x: 0, y: 0 });
  });

  it("never zooms past the limits", () => {
    expect(zoomAt({ scale: MAX_SCALE, x: 0, y: 0 }, 4, { x: 0, y: 0 }, bounds).scale).toBe(
      MAX_SCALE,
    );
    expect(zoomAt(IDENTITY, 0.1, { x: 0, y: 0 }, bounds)).toEqual(IDENTITY);
  });

  it("re-centers when zooming back out to fit", () => {
    const zoomed = zoomAt(IDENTITY, 4, { x: 300, y: 200 }, bounds);
    expect(zoomed.x).not.toBe(0);
    const back = zoomAt(zoomed, 1 / 4, { x: 300, y: 200 }, bounds);
    expect(back).toEqual(IDENTITY);
  });
});

describe("zoomTo / toggleZoom", () => {
  it("zooms to an absolute scale", () => {
    expect(zoomTo(IDENTITY, 3, { x: 0, y: 0 }, bounds).scale).toBe(3);
    expect(zoomTo(IDENTITY, 100, { x: 0, y: 0 }, bounds).scale).toBe(MAX_SCALE);
  });

  it("toggles between fit and the double-tap scale", () => {
    const zoomed = toggleZoom(IDENTITY, { x: 0, y: 0 }, bounds);
    expect(zoomed.scale).toBe(DOUBLE_TAP_SCALE);
    expect(toggleZoom(zoomed, { x: 0, y: 0 }, bounds)).toEqual(IDENTITY);
  });
});

describe("pinchTransform", () => {
  const start = { ...IDENTITY };

  it("scales with the finger spread", () => {
    const next = pinchTransform(
      start,
      { center: { x: 0, y: 0 }, distance: 100 },
      { center: { x: 0, y: 0 }, distance: 250 },
      bounds,
    );
    expect(next.scale).toBe(2.5);
  });

  it("pans with the pinch midpoint", () => {
    const next = pinchTransform(
      { scale: 4, x: 0, y: 0 },
      { center: { x: 0, y: 0 }, distance: 100 },
      { center: { x: 40, y: 20 }, distance: 100 },
      bounds,
    );
    expect(next).toEqual({ scale: 4, x: 40, y: 20 });
  });

  it("ignores a degenerate starting distance", () => {
    expect(
      pinchTransform(
        start,
        { center: { x: 0, y: 0 }, distance: 0 },
        { center: { x: 0, y: 0 }, distance: 120 },
        bounds,
      ),
    ).toEqual(IDENTITY);
  });
});

describe("pointer helpers", () => {
  it("measures distance and midpoint", () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
  });

  it("converts client coordinates to an offset from the stage center", () => {
    const rect = { left: 100, top: 50, width: 800, height: 600 };
    expect(focusFromClient({ x: 500, y: 350 }, rect)).toEqual({ x: 0, y: 0 });
    expect(focusFromClient({ x: 600, y: 350 }, rect)).toEqual({ x: 100, y: 0 });
  });
});

describe("transformStyle", () => {
  it("serializes translate before scale", () => {
    expect(transformStyle({ scale: 2, x: 10, y: -4 })).toBe("translate(10px, -4px) scale(2)");
  });

  it("round-trips a zoom step", () => {
    const inThenOut = zoomAt(zoomAt(IDENTITY, ZOOM_STEP, { x: 0, y: 0 }, bounds), 1 / ZOOM_STEP, { x: 0, y: 0 }, bounds);
    expect(inThenOut.scale).toBeCloseTo(1);
  });
});
