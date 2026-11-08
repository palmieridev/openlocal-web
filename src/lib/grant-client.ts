import { localePath, type Dict, type Locale } from "@/i18n";
import { utcInput } from "./grants";

/** Never retry mutations: a transport failure can occur after a committed create. */
export async function submitGrant(
  endpoint: string,
  body: Record<string, unknown>,
  locale: Locale,
): Promise<number> {
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "same-origin",
    redirect: "error",
    headers: { "Content-Type": "application/json", "X-OL-Locale": locale },
    body: JSON.stringify(body),
  });
  return response.status;
}
export function setupGrantForms() {
  for (const form of document.querySelectorAll<HTMLFormElement>(
    "[data-grant-form]",
  )) {
    const locale: Locale = form.dataset.locale === "en" ? "en" : "es";
    const t: Pick<Dict["admin"], "grants" | "errors" | "signIn"> = JSON.parse(
      document.querySelector<HTMLElement>("[data-grant-copy]")!.dataset.grantCopy!,
    );
    const message = form.querySelector<HTMLElement>("[data-grant-message]")!;
    const end = form.elements.namedItem(
      "expires_at",
    ) as HTMLInputElement | null;
    const sync = () => {
      const indefinite = new FormData(form).get("duration") === "indefinite";
      if (end) {
        end.disabled = indefinite;
        end.required = !indefinite;
      }
    };
    form.addEventListener("change", sync);
    sync();
    let pending = false;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (pending) return;
      const data = new FormData(form),
        action = form.dataset.action!;
      if (
        action === "revoke" &&
        !window.confirm(
          t.grants.revokeConfirm + "\n\n" + t.grants.revokeEffects,
        )
      )
        return;
      let body: Record<string, unknown>;
      try {
        body = {
          internal_reason: String(data.get("internal_reason") ?? "").trim(),
        };
        if (action !== "create") body.version = Number(form.dataset.version);
        if (action === "create") {
          body.module = data.get("module");
          body.tier = data.get("tier");
          body.starts_at = utcInput(String(data.get("starts_at")));
          const owner = String(data.get("owner_message") ?? "").trim();
          if (owner) body.owner_message = owner;
        }
        if (action !== "revoke") {
          body.indefinite = data.get("duration") === "indefinite";
          body.expires_at = body.indefinite
            ? null
            : utcInput(String(data.get("expires_at")));
        }
      } catch {
        message.textContent = t.grants.invalid;
        message.focus();
        return;
      }
      const controls = [
        ...form.querySelectorAll<
          | HTMLInputElement
          | HTMLButtonElement
          | HTMLTextAreaElement
          | HTMLSelectElement
        >("input,button,textarea,select"),
      ];
      pending = true;
      controls.forEach((control) => {
        control.disabled = true;
      });
      message.textContent = t.grants.saving;
      let locked = false;
      try {
        const status = await submitGrant(form.dataset.endpoint!, body, locale);
        if (status === 409) {
          locked = true;
          const url = new URL(location.href);
          url.searchParams.set("grant_notice", "conflict");
          message.textContent = t.grants.conflict;
          location.assign(url.href);
        } else if (status === 401) {
          locked = true;
          message.textContent = t.errors.signedOut;
          const link = document.createElement("a");
          link.href =
            localePath(locale, "/login") +
            "?redirect_url=" +
            encodeURIComponent(location.pathname + location.search);
          link.textContent = t.signIn;
          link.className = "admin-link";
          message.append(" ", link);
        } else if (status >= 200 && status < 300) {
          locked = true;
          message.textContent = t.grants.saved;
          const url = new URL(location.href);
          url.searchParams.delete("grant_notice");
          if (action === "create") {
            url.searchParams.set("grant_offset", "0");
            url.searchParams.delete("grant_id");
            url.searchParams.delete("history_offset");
          }
          location.assign(url.href);
        } else {
          locked = status >= 500;
          message.textContent =
            status === 403
              ? t.errors.forbidden
              : status === 404
                ? t.errors.notFound
                : status === 429
                  ? t.errors.rateLimited
                  : status >= 500
                    ? t.grants.uncertain
                    : t.grants.invalid;
        }
      } catch {
        locked = true;
        message.textContent = t.grants.uncertain;
      } finally {
        if (!locked) {
          pending = false;
          controls.forEach((control) => {
            control.disabled = false;
          });
          sync();
        }
        message.focus();
      }
    });
  }
}
