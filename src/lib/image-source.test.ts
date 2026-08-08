import { describe, expect, it, vi } from "vitest";
import {
  ImageDecodeError,
  decodeImage,
  fitWithin,
  type DecodeResult,
} from "./image-source";

/** Stand-in for an ImageBitmap; only width/height/close are used. */
function fakeBitmap(width: number, height: number) {
  return { width, height, close: vi.fn() } as unknown as ImageBitmap;
}

function fakeElement(width: number, height: number): DecodeResult {
  return {
    source: { tag: "img" } as unknown as CanvasImageSource,
    width,
    height,
    release: vi.fn(),
  };
}

describe("decodeImage", () => {
  const file = new Blob(["x"], { type: "image/jpeg" });

  it("prefers createImageBitmap with EXIF orientation applied", async () => {
    const createBitmap = vi.fn(async () => fakeBitmap(739, 1600));
    const decoded = await decodeImage(file, {
      createBitmap,
      decodeElement: null,
    });

    expect(decoded.strategy).toBe("bitmap-oriented");
    expect(decoded.width).toBe(739);
    expect(decoded.height).toBe(1600);
    expect(createBitmap).toHaveBeenCalledWith(file, {
      imageOrientation: "from-image",
    });
  });

  it("retries without options when the browser rejects 'from-image'", async () => {
    // Older Chromium (Brave/Chrome on Android) knows `imageOrientation` but not
    // its "from-image" value, and throws a TypeError on the dictionary.
    const createBitmap = vi.fn(async (_blob: Blob, options?: unknown) => {
      if (options) throw new TypeError("not a valid enum value");
      return fakeBitmap(739, 1600);
    });

    const decoded = await decodeImage(file, {
      createBitmap,
      decodeElement: null,
    });

    expect(decoded.strategy).toBe("bitmap");
    expect(createBitmap).toHaveBeenCalledTimes(2);
    expect(createBitmap).toHaveBeenLastCalledWith(file);
  });

  it("falls back to an <img> element when createImageBitmap fails outright", async () => {
    const createBitmap = vi.fn(async () => {
      throw new Error("out of memory");
    });
    const decodeElement = vi.fn(async () => fakeElement(739, 1600));

    const decoded = await decodeImage(file, { createBitmap, decodeElement });

    expect(decoded.strategy).toBe("element");
    expect(decoded.width).toBe(739);
    expect(createBitmap).toHaveBeenCalledTimes(2);
    expect(decodeElement).toHaveBeenCalledTimes(1);
  });

  it("uses the element decoder when createImageBitmap is missing", async () => {
    const decodeElement = vi.fn(async () => fakeElement(100, 50));
    const decoded = await decodeImage(file, {
      createBitmap: null,
      decodeElement,
    });
    expect(decoded.strategy).toBe("element");
  });

  it("throws ImageDecodeError only when every strategy fails", async () => {
    const boom = async () => {
      throw new Error("nope");
    };
    await expect(
      decodeImage(file, { createBitmap: boom, decodeElement: boom }),
    ).rejects.toBeInstanceOf(ImageDecodeError);
  });

  it("closes the bitmap once, and only when released", async () => {
    const bitmap = fakeBitmap(10, 10);
    const decoded = await decodeImage(file, {
      createBitmap: async () => bitmap,
      decodeElement: null,
    });

    expect(bitmap.close).not.toHaveBeenCalled();
    decoded.release();
    decoded.release();
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });
});

describe("fitWithin", () => {
  it("keeps the aspect ratio of a portrait photo", () => {
    // ropero.jpeg's shape: 739×1600 halved is 369.5 wide, rounded to 370.
    expect(fitWithin(739, 1600, 800)).toEqual({ width: 370, height: 800 });
  });

  it("keeps the aspect ratio of a landscape photo", () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
  });

  it("never upscales", () => {
    expect(fitWithin(640, 480, 2000)).toEqual({ width: 640, height: 480 });
  });

  it("never returns a zero dimension", () => {
    expect(fitWithin(4000, 3, 10)).toEqual({ width: 10, height: 1 });
  });

  it("tolerates degenerate inputs", () => {
    expect(fitWithin(0, 0, 100)).toEqual({ width: 1, height: 1 });
    expect(fitWithin(100, 100, 0)).toEqual({ width: 100, height: 100 });
  });
});
