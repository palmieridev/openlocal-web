import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

import { ui, uiLocale } from "@/lib/i18n-client";
import { interpolate } from "@/i18n";
import {
  TOURS,
  isTourId,
  tourDoneKey,
  tourSelector,
  type TourStep,
} from "./index";
import type { TourCopy } from "./copy-types";

/**
 * Client-side tour runner. Loaded dynamically by the dashboard island, so
 * driver.js and the tour prose only reach visitors who actually start a tour.
 */

const loaders: Record<string, () => Promise<{ tourCopy: TourCopy }>> = {
  es: () => import("./copy.es"),
  en: () => import("./copy.en"),
};

function stepCopy(copy: TourCopy, tourId: keyof TourCopy, step: TourStep) {
  return copy[tourId]?.steps[step.key ?? step.anchor];
}

/**
 * Steps whose anchor cannot actually be shown are dropped rather than
 * highlighted blindly.
 *
 * Horizontal intersection is the interesting test: the dashboard sidebar is a
 * drawer that stays in the DOM on mobile and is translated off-canvas, so it
 * still has a box and a non-null `offsetParent`. Vertical position is *not*
 * checked — driver.js scrolls to anchors below the fold, which is legitimate.
 */
function canHighlight(el: Element): boolean {
  if (!(el instanceof HTMLElement) || el.offsetParent === null) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  return rect.right > 0 && rect.left < window.innerWidth;
}

function visibleSteps(steps: TourStep[]): TourStep[] {
  return steps.filter((step) => {
    const el = document.querySelector(tourSelector(step));
    return el !== null && canHighlight(el);
  });
}

export async function runTour(id: string): Promise<boolean> {
  if (!isTourId(id)) return false;

  const tour = TOURS[id];
  const steps = visibleSteps(tour.steps);
  if (steps.length === 0) return false;

  const locale = uiLocale();
  const t = ui().support.tours;
  const { tourCopy } = await (loaders[locale] ?? loaders.es!)();

  const driveSteps: DriveStep[] = steps.map((step) => {
    const copy = stepCopy(tourCopy, id, step);
    return {
      element: tourSelector(step),
      popover: {
        title: copy?.title ?? "",
        description: copy?.description ?? "",
        side: step.side,
        align: step.align,
      },
    };
  });

  const run = driver({
    showProgress: true,
    showButtons: ["next", "previous", "close"],
    allowClose: true,
    overlayColor: "#2D2926",
    overlayOpacity: 0.72,
    stagePadding: 8,
    stageRadius: 12,
    popoverClass: "ol-tour",
    nextBtnText: t.next,
    prevBtnText: t.back,
    doneBtnText: t.done,
    // driver.js interpolates its own {{current}} / {{total}} placeholders.
    progressText: interpolate(t.progress, {
      current: "{{current}}",
      total: "{{total}}",
    }),
    steps: driveSteps,
    onDestroyed: () => {
      try {
        localStorage.setItem(tourDoneKey(id), new Date().toISOString());
      } catch {
        /* private mode — the tour still ran, we just cannot remember it */
      }
    },
  });

  run.drive();
  return true;
}
