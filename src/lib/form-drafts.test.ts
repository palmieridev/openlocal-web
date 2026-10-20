import { describe, expect, it } from "vitest";
import { attachFormDraft, captureDraft, formDraftKey } from "./form-drafts";

function fixture() {
  const fields = [
    { name: "name", type: "text", value: "Bath", tagName: "INPUT" },
    { name: "active", type: "checkbox", value: "on", checked: true, tagName: "INPUT" },
    { name: "service_ids", type: "checkbox", value: "a", checked: false, tagName: "INPUT" },
    { name: "service_ids", type: "checkbox", value: "b", checked: true, tagName: "INPUT" },
    { name: "price", type: "text", value: "50", disabled: true, tagName: "INPUT" },
    { name: "token", type: "hidden", value: "secret", tagName: "INPUT" },
  ];
  const events: Record<string, () => void> = {};
  const form = {
    querySelectorAll: () => fields,
    addEventListener: (name: string, listener: () => void) => { events[name] = listener; },
  } as unknown as HTMLFormElement;
  return { form, fields, edit: () => events.input?.() };
}
function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe("tab-local module drafts", () => {
  it("isolates users, businesses, modules and form records", () => {
    const key = formDraftKey("u", "b", "appointments", "service:1");
    for (const parts of [["v", "b", "appointments", "service:1"], ["u", "c", "appointments", "service:1"], ["u", "b", "preorders", "service:1"], ["u", "b", "appointments", "service:2"]]) {
      expect(formDraftKey(parts[0]!, parts[1]!, parts[2]!, parts[3]!)).not.toBe(key);
    }
  });

  it("restores text, unchecked boxes, grouped boxes and disabled values after reload", () => {
    const store = memoryStorage(), original = fixture();
    attachFormDraft(original.form, "draft", store);
    original.fields[0]!.value = "Unsaved bath";
    original.fields[1]!.checked = false;
    original.fields[2]!.checked = true;
    original.fields[3]!.checked = false;
    original.fields[4]!.value = "75";
    original.edit();
    const reload = fixture();
    expect(attachFormDraft(reload.form, "draft", store).restored).toBe(true);
    expect(captureDraft(reload.form)).toEqual(captureDraft(original.form));
    expect(store.getItem("draft")).not.toContain("secret");
  });

  it("clears only the saved form's draft and does not revive it on reload", () => {
    const store = memoryStorage(), a = fixture(), b = fixture();
    const controller = attachFormDraft(a.form, "a", store);
    attachFormDraft(b.form, "b", store);
    a.fields[0]!.value = "Changed A"; a.edit();
    b.fields[0]!.value = "Changed B"; b.edit();
    controller.saved(captureDraft(a.form));
    expect(store.getItem("a")).toBeNull();
    expect(store.getItem("b")).not.toBeNull();
  });

  it("keeps edits made while saving and preserves drafts after a failed save", () => {
    const store = memoryStorage(), a = fixture();
    const controller = attachFormDraft(a.form, "a", store);
    a.fields[0]!.value = "Submitted"; a.edit();
    const submitted = captureDraft(a.form);
    a.fields[0]!.value = "Edited while saving"; a.edit();
    expect(store.getItem("a")).toContain("Edited while saving");
    controller.saved(submitted);
    expect(store.getItem("a")).toContain("Edited while saving");
  });

  it("removes drafts when edits are reverted", () => {
    const store = memoryStorage(), a = fixture();
    attachFormDraft(a.form, "a", store);
    a.fields[0]!.value = "Changed"; a.edit();
    a.fields[0]!.value = "Bath"; a.edit();
    expect(store.getItem("a")).toBeNull();
  });

  it("ignores expired, malformed and blocked storage", () => {
    const store = memoryStorage();
    store.setItem("old", JSON.stringify({ updated: 0, fields: [] }));
    expect(attachFormDraft(fixture().form, "old", store).restored).toBe(false);
    expect(store.getItem("old")).toBeNull();
    store.setItem("broken", "not JSON");
    expect(attachFormDraft(fixture().form, "broken", store).restored).toBe(false);
    const blocked = { getItem() { throw Error(); }, setItem() { throw Error(); }, removeItem() { throw Error(); } };
    const a = fixture();
    expect(() => { attachFormDraft(a.form, "a", blocked); a.edit(); }).not.toThrow();
    expect(() => attachFormDraft(fixture().form, "none", null)).not.toThrow();
  });
});
