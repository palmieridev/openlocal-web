import { describe, expect, it } from "vitest";
import {
  IMAGE_EXTENSIONS,
  MAX_IMAGE_BYTES,
  imageExtension,
  validateImageType,
  validateImageUpload,
} from "./upload";

describe("validateImageType", () => {
  it("rejects unsupported formats and empty files", () => {
    expect(validateImageType({ type: "image/gif", size: 10 })).toMatch(
      /Formato no admitido/,
    );
    expect(validateImageType({ type: "image/jpeg", size: 0 })).toMatch(
      /vacío/,
    );
  });

  it("ignores size — an oversized original is shrunk, not refused", () => {
    expect(
      validateImageType({ type: "image/jpeg", size: MAX_IMAGE_BYTES * 4 }),
    ).toBeNull();
  });
});

describe("imageExtension", () => {
  it("maps every allowed MIME type to its extension", () => {
    expect(imageExtension("image/jpeg")).toBe("jpg");
    expect(imageExtension("image/png")).toBe("png");
    expect(imageExtension("image/webp")).toBe("webp");
    expect(imageExtension("image/avif")).toBe("avif");
  });

  it("returns null for unsupported types", () => {
    expect(imageExtension("image/gif")).toBeNull();
    expect(imageExtension("application/pdf")).toBeNull();
    expect(imageExtension("")).toBeNull();
  });
});

describe("validateImageUpload", () => {
  it("accepts a normal image", () => {
    expect(validateImageUpload({ type: "image/png", size: 1024 })).toBeNull();
  });

  it("accepts a file exactly at the size limit", () => {
    expect(validateImageUpload({ type: "image/jpeg", size: MAX_IMAGE_BYTES })).toBeNull();
  });

  it("rejects unsupported formats", () => {
    expect(validateImageUpload({ type: "image/gif", size: 1024 })).toMatch(/Formato/);
  });

  it("rejects empty files", () => {
    expect(validateImageUpload({ type: "image/png", size: 0 })).toMatch(/vac/i);
  });

  it("rejects files over the size limit", () => {
    expect(validateImageUpload({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).toMatch(
      /5 MB/,
    );
  });
});

describe("allow-list", () => {
  it("keeps extensions and the allow-list in sync", () => {
    expect(Object.keys(IMAGE_EXTENSIONS)).toContain("image/webp");
    for (const type of Object.keys(IMAGE_EXTENSIONS)) {
      expect(imageExtension(type)).not.toBeNull();
    }
  });
});
