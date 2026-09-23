import { moduleError } from "./modules";
import { uiLocale } from "./i18n-client";
export class ModuleClientError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function moduleFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; key?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.key) headers["Idempotency-Key"] = options.key;
  const response = await fetch(`/api/modules/${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ModuleClientError(
      data.code ?? "",
      response.status,
      moduleError(data, uiLocale()),
    );
  return data;
}
/** Keep a retry key for an unchanged payload, including when a response was lost. */
export function submissionKey() {
  let prior = "",
    key = "";
  return (body: Record<string, unknown>) => {
    const { challenge_token: _challenge, ...payload } = body;
    const digest = JSON.stringify(payload);
    if (digest !== prior) {
      prior = digest;
      key = crypto.randomUUID();
    }
    return key;
  };
}
