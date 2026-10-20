/** Tab-local drafts. No backend writes, credentials, or cross-account restores. */
type DraftField = { name: string; type: string; value: string; checked?: boolean };
export type DraftValues = DraftField[];
type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const MAX_AGE = 8 * 60 * 60 * 1000;

export function formDraftKey(user: string, business: string, module: string, form: string): string {
  return `ol_module_draft:v1:${[user, business, module, form].map(encodeURIComponent).join(":")}`;
}

function controls(form: HTMLFormElement) {
  return Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"))
    .filter((field) => field.name && !["hidden", "password", "file", "submit", "button"].includes(field.type));
}

export function captureDraft(form: HTMLFormElement): DraftValues {
  return controls(form).map((field) => ({
    name: field.name,
    type: field.type,
    value: field.value,
    ...(["checkbox", "radio"].includes(field.type) ? { checked: (field as HTMLInputElement).checked } : {}),
  }));
}

/** Storage can be blocked/full; forms must remain usable in either case. */
export function attachFormDraft(form: HTMLFormElement, key: string, storage: DraftStorage | null) {
  let baseline = JSON.stringify(captureDraft(form));
  let restored = false;
  try {
    const raw = storage?.getItem(key);
    if (raw) {
      const draft = JSON.parse(raw);
      if (typeof draft.updated !== "number" || Date.now() - draft.updated > MAX_AGE || !Array.isArray(draft.fields)) {
        storage?.removeItem(key);
      } else {
        for (const field of controls(form)) {
          const toggle = ["checkbox", "radio"].includes(field.type);
          const saved = draft.fields.find((entry: DraftField) => entry && entry.name === field.name && entry.type === field.type && (!toggle || entry.value === field.value));
          if (!saved || typeof saved.value !== "string") continue;
          if (toggle) {
            if (typeof saved.checked === "boolean") (field as HTMLInputElement).checked = saved.checked;
          } else if (field.tagName !== "SELECT" || Array.from((field as HTMLSelectElement).options).some((option) => option.value === saved.value)) {
            field.value = saved.value;
          }
        }
        restored = JSON.stringify(captureDraft(form)) !== baseline;
      }
    }
  } catch { /* Browser storage is optional. */ }

  const persist = () => {
    try {
      const fields = captureDraft(form);
      if (JSON.stringify(fields) === baseline) storage?.removeItem(key);
      else storage?.setItem(key, JSON.stringify({ updated: Date.now(), fields }));
    } catch { /* Never prevent editing or saving. */ }
  };
  form.addEventListener("input", persist);
  form.addEventListener("change", persist);
  return {
    restored,
    saved(submitted: DraftValues) {
      baseline = JSON.stringify(submitted);
      // Preserve edits made while the save request was in flight.
      persist();
    },
  };
}
