import type { TourId } from "./index";

export interface TourStepCopy {
  title: string;
  description: string;
}

export interface TourCopyEntry {
  /** Shown in the article banner and as the tour's own heading. */
  title: string;
  /** Keyed by the step's `key` (or its `anchor` when no key is set). */
  steps: Record<string, TourStepCopy>;
}

export type TourCopy = Record<TourId, TourCopyEntry>;
