/**
 * Image upload validation shared by the BFF upload route and its unit tests.
 * Kept pure (no Blob/Astro imports) so the rules are testable in isolation.
 */
import { DEFAULT_LOCALE, useT, type Locale } from "@/i18n";


/** Max accepted image size. Covers store logos/covers comfortably. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/** MIME → file extension. The keys double as the allow-list. */
export const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Extension for an accepted MIME type, or null when unsupported. */
export function imageExtension(type: string): string | null {
  return IMAGE_EXTENSIONS[type] ?? null;
}

/** Minimal shape we validate — a browser File satisfies it. */
export interface UploadCandidate {
  type: string;
  size: number;
}

/**
 * Format/emptiness check only — the part a file can never recover from.
 * Split out from `validateImageUpload` because an oversized original *is*
 * recoverable: the uploader shrinks it (whole frame, no crop) instead of
 * refusing it.
 */
export function validateImageType(
  file: UploadCandidate,
  locale: Locale = DEFAULT_LOCALE,
): string | null {
  const t = useT(locale).upload;
  if (!imageExtension(file.type)) {
    return t.unsupportedFormat;
  }
  if (file.size <= 0) {
    return t.emptyFile;
  }
  return null;
}

/**
 * Returns a user-facing error message when the file is not an acceptable
 * image, or null when it passes. Messages surface directly in the UI.
 */
export function validateImageUpload(
  file: UploadCandidate,
  locale: Locale = DEFAULT_LOCALE,
): string | null {
  const problem = validateImageType(file, locale);
  if (problem) return problem;
  if (file.size > MAX_IMAGE_BYTES) {
    return useT(locale).upload.tooLarge;
  }
  return null;
}
