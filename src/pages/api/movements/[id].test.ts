import type { APIContext } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { forward } from "@/lib/api/bff";
import { PATCH } from "./[id]";

vi.mock("@/lib/api/bff", () => ({ forward: vi.fn() }));

const forwardMock = vi.mocked(forward);

beforeEach(() => {
  forwardMock.mockReset();
  forwardMock.mockResolvedValue(new Response(JSON.stringify({ ok: true })));
});

describe("PATCH /api/movements/[id]", () => {
  it("forwards the browser idempotency key to the API", async () => {
    const request = new Request("http://test/api/movements/movement-1", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "movement:edit:12345678",
      },
      body: JSON.stringify({ movement_type: "IN_ADJUSTMENT", quantity: "2" }),
    });
    const ctx = {
      request,
      params: { id: "movement-1" },
    } as unknown as APIContext;

    await PATCH(ctx);

    expect(forwardMock).toHaveBeenCalledWith(
      ctx,
      "/api/v1/inventory/movements/movement-1",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Idempotency-Key": "movement:edit:12345678" },
      }),
    );
  });
});
