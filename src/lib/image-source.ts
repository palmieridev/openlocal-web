/**
 * Browser-side image decoding, defensively.
 *
 * `createImageBitmap(file, { imageOrientation: "from-image" })` is the tidy way
 * to decode a picked photo with its EXIF rotation applied, but it is *not*
 * dependable on mobile: the `"from-image"` enum value landed years after the
 * `imageOrientation` option itself, so older Chromium builds (Brave/Chrome on
 * Android among them) reject the dictionary outright, and the whole call also
 * fails under memory pressure on large camera JPEGs. A single unguarded call
 * therefore turns every such phone into "No se pudo leer la imagen".
 *
 * So decoding walks a fallback chain instead, stopping at the first strategy
 * that works. `<img>` is the floor: every browser that can render the photo can
 * decode it that way, and browsers have applied EXIF orientation to `<img>`
 * since Chrome 81 / Firefox 26 / Safari 13.4.
 *
 * The DOM work is injectable so the chain itself is unit-testable under node.
 */

/** Which decoder produced the image — useful in tests and debugging. */
export type ImageDecodeStrategy = "bitmap-oriented" | "bitmap" | "element";

/** A decoded image, ready to hand to `CanvasRenderingContext2D.drawImage`. */
export interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  strategy: ImageDecodeStrategy;
  /** Frees the bitmap / revokes the object URL. Safe to call twice. */
  release(): void;
}

/** What a decoder returns before the strategy label is attached. */
export type DecodeResult = Omit<DecodedImage, "strategy">;

export interface DecodeDeps {
  /** `createImageBitmap`, or null when the browser lacks it. */
  createBitmap?:
    | ((blob: Blob, options?: ImageBitmapOptions) => Promise<ImageBitmap>)
    | null;
  /** `<img>`-based decoder, the last resort. */
  decodeElement?: ((blob: Blob) => Promise<DecodeResult>) | null;
}

/** User-facing (Spanish) message when nothing could read the file. */
export const IMAGE_DECODE_MESSAGE =
  "No se pudo leer la imagen. Intenta con otra foto.";

export class ImageDecodeError extends Error {
  constructor(message: string = IMAGE_DECODE_MESSAGE) {
    super(message);
    this.name = "ImageDecodeError";
  }
}

function bitmapResult(bitmap: ImageBitmap): DecodeResult {
  let closed = false;
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    release() {
      if (closed) return;
      closed = true;
      bitmap.close();
    },
  };
}

/** Decodes through an `<img>` element and an object URL. Browser-only. */
export function elementDecoder(): (blob: Blob) => Promise<DecodeResult> {
  return async (blob) => {
    const url = URL.createObjectURL(blob);
    let revoked = false;
    const release = () => {
      if (revoked) return;
      revoked = true;
      URL.revokeObjectURL(url);
    };
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new ImageDecodeError());
        image.src = url;
      });
      if (!image.naturalWidth || !image.naturalHeight) {
        throw new ImageDecodeError();
      }
      return {
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        release,
      };
    } catch (err) {
      release();
      throw err;
    }
  };
}

function browserDeps(): DecodeDeps {
  return {
    createBitmap:
      typeof createImageBitmap === "function"
        ? (blob, options) =>
            options
              ? createImageBitmap(blob, options)
              : createImageBitmap(blob)
        : null,
    decodeElement: typeof Image === "function" ? elementDecoder() : null,
  };
}

/**
 * Decodes `file` with the first strategy that succeeds, or throws
 * `ImageDecodeError` when every one of them fails.
 */
export async function decodeImage(
  file: Blob,
  deps: DecodeDeps = browserDeps(),
): Promise<DecodedImage> {
  const { createBitmap, decodeElement } = deps;

  if (createBitmap) {
    // Preferred: EXIF rotation applied by the decoder.
    try {
      return {
        ...bitmapResult(
          await createBitmap(file, { imageOrientation: "from-image" }),
        ),
        strategy: "bitmap-oriented",
      };
    } catch {
      /* the option (or its value) is unsupported here — keep going */
    }
    // Same decoder without the dictionary: rejects on the enum value only.
    try {
      return { ...bitmapResult(await createBitmap(file)), strategy: "bitmap" };
    } catch {
      /* decoder unavailable or out of memory — fall through to <img> */
    }
  }

  if (decodeElement) {
    try {
      return { ...(await decodeElement(file)), strategy: "element" };
    } catch {
      /* nothing left to try */
    }
  }

  throw new ImageDecodeError();
}

/**
 * Largest size that fits inside a `maxDimension` box while keeping the aspect
 * ratio — the whole frame, never a crop. Never upscales.
 */
export function fitWithin(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (!(longest > 0) || !(maxDimension > 0) || longest <= maxDimension) {
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  }
  const ratio = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}
