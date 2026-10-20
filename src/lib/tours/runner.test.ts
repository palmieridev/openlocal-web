import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({ config: {} as Record<string, any>, drive: vi.fn(), change: undefined as (() => void) | undefined }));
vi.mock("driver.js", () => ({ driver: (config: Record<string, any>) => {
  harness.config = config;
  return {
    drive: harness.drive,
    getConfig: () => harness.config,
    setConfig: (next: Record<string, any>) => { harness.config = next; },
  };
} }));
vi.mock("@/lib/i18n-client", () => ({
  uiLocale: () => "en",
  ui: () => ({ support: { tours: { next: "Next", back: "Back", done: "Done", progress: "Step {current} of {total}" } } }),
}));
import { runTour } from "./runner";

class Anchor {
  offsetParent = {};
  getBoundingClientRect() { return { left: 0, right: 100, width: 100, height: 100 }; }
}
let media: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };
beforeEach(() => {
  harness.drive.mockClear();
  media = { matches: false, addEventListener: vi.fn((_event, callback) => { harness.change = callback; }), removeEventListener: vi.fn() };
  vi.stubGlobal("HTMLElement", Anchor);
  vi.stubGlobal("document", { querySelector: () => new Anchor() });
  vi.stubGlobal("window", { innerWidth: 375, matchMedia: vi.fn(() => media) });
  vi.stubGlobal("localStorage", { setItem: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe("guided tour motion preferences", () => {
  it("keeps animation for visitors without a reduced-motion preference", async () => {
    expect(await runTour("configurar-citas")).toBe(true);
    expect(harness.config.animate).toBe(true);
    expect(harness.config.smoothScroll).toBe(false);
    expect(harness.drive).toHaveBeenCalledOnce();
  });
  it("disables animation when reduced motion is requested", async () => {
    media.matches = true;
    await runTour("configurar-pedidos");
    expect(window.matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
    expect(harness.config.animate).toBe(false);
  });
  it("responds to preference changes and cleans up the listener", async () => {
    await runTour("modulos-y-suscripcion");
    media.matches = true;
    harness.change?.();
    expect(harness.config.animate).toBe(false);
    harness.config.onDestroyed();
    expect(media.removeEventListener).toHaveBeenCalledWith("change", harness.change);
  });
});
