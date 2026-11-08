import { afterEach, describe, expect, it, vi } from "vitest";
import { useT } from "@/i18n";
import { setupGrantForms } from "./grant-client";

/** Small DOM boundary harness runs the actual submit listener, with no browser or real grants. */
function harness(action = "extend") {
  const listeners = new Map<
    string,
    (event: { preventDefault: () => void }) => Promise<void>
  >();
  const values: Record<string, string> = {
    duration: "indefinite",
    internal_reason: "Private audit reason",
    acknowledge: "on",
  };
  const controls = [{ disabled: false }, { disabled: false }];
  const message = { textContent: "", focus: vi.fn(), append: vi.fn() };
  const form = {
    dataset: {
      locale: "en",
      action,
      version: "7",
      endpoint: "/api/admin/businesses/business/grants/grant/" + action,
    },
    elements: { namedItem: () => null },
    querySelector: () => message,
    querySelectorAll: () => controls,
    addEventListener: (
      name: string,
      listener: typeof listeners extends Map<string, infer T> ? T : never,
    ) => listeners.set(name, listener),
  };
  const location = {
    href: "https://openlocal.test/en/admin/businesses/business?grant_offset=10",
    pathname: "/en/admin/businesses/business",
    search: "?grant_offset=10",
    assign: vi.fn(),
  };
  const confirm = vi.fn((_message: string) => true);
  vi.stubGlobal("document", {
    querySelectorAll: () => [form],
    querySelector: () => ({dataset: {grantCopy: JSON.stringify(useT("en").admin)}}),
    createElement: () => ({}),
  });
  vi.stubGlobal(
    "FormData",
    class {
      get(name: string) {
        return values[name] ?? null;
      }
    },
  );
  vi.stubGlobal("location", location);
  vi.stubGlobal("window", { confirm });
  setupGrantForms();
  return {
    submit: () => listeners.get("submit")!({ preventDefault: vi.fn() }),
    controls,
    message,
    location,
    confirm,
  };
}
afterEach(() => vi.unstubAllGlobals());
describe("grant mutation outcomes", () => {
  it("refreshes authoritative state on 409 without retrying the stale version", async () => {
    const fetch = vi.fn(async () =>
      Response.json({ code: "version_conflict" }, { status: 409 }),
    );
    vi.stubGlobal("fetch", fetch);
    const h = harness();
    await h.submit();
    await h.submit();
    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(
      String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body),
    );
    expect(body.version).toBe(7);
    expect(h.location.assign).toHaveBeenCalledWith(
      "https://openlocal.test/en/admin/businesses/business?grant_offset=10&grant_notice=conflict",
    );
    expect(h.message.textContent).toContain("No automatic retry");
  });
  it("locks an uncertain mutation until a refresh rather than risking a duplicate", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("lost response after commit");
      }),
    );
    const extension = harness();
    await extension.submit();
    await extension.submit();
    expect(extension.message.textContent).toContain("could not be confirmed");
    expect(extension.controls.every((control) => control.disabled)).toBe(true);
    expect(extension.location.assign).not.toHaveBeenCalled();
  });
  it("asks for meaningful permanent revocation confirmation before posting", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const h = harness("revoke");
    h.confirm.mockReturnValue(false);
    await h.submit();
    expect(fetch).not.toHaveBeenCalled();
    expect(h.confirm.mock.calls[0][0]).toContain(
      "Other active paid or complimentary sources continue",
    );
    expect(h.controls.every((control) => !control.disabled)).toBe(true);
  });
  it("does not claim success on denied access and lets validation errors be corrected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({}, { status: 403 })),
    );
    const h = harness();
    await h.submit();
    expect(h.message.textContent).toContain("does not have access");
    expect(h.location.assign).not.toHaveBeenCalled();
    expect(h.controls.every((control) => !control.disabled)).toBe(true);
  });
  it("handles expired sessions with a locale-aware sign-in link and no automatic repeat", async () => {
    const fetch = vi.fn(async () => Response.json({}, { status: 401 }));
    vi.stubGlobal("fetch", fetch);
    const h = harness();
    await h.submit();
    await h.submit();
    expect(h.message.textContent).toContain("Sign in");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(h.message.append).toHaveBeenCalledWith(
      " ",
      expect.objectContaining({
        href: expect.stringContaining("/en/login?redirect_url="),
      }),
    );
  });
  it("refreshes after confirmed success and clears an old conflict notice", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ version: 8 })),
    );
    const h = harness();
    h.location.href += "&grant_notice=conflict";
    await h.submit();
    expect(h.location.assign).toHaveBeenCalledWith(
      "https://openlocal.test/en/admin/businesses/business?grant_offset=10",
    );
    expect(h.message.textContent).toContain("Grant saved");
  });
});
