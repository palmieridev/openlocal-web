/** Grant input syntax only; entitlement resolution and mutation rules remain in Go. */
export const grantId = (value: string) =>
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value) &&
  !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(value);
export type GrantAction = "create" | "extend" | "revoke";

export function utcInput(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("invalid_date");
  const iso = value + ":00.000Z";
  if (
    !Number.isFinite(Date.parse(iso)) ||
    new Date(iso).toISOString() !== iso ||
    Number(value.slice(0, 4)) < 2000
  )
    throw new Error("invalid_date");
  return iso;
}
function timestamp(value: unknown): number {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.test(
      value,
    )
  )
    throw new Error("invalid_date");
  // Validate the local calendar before applying its explicit offset (Date.parse normalizes February 30).
  utcInput(value.slice(0, 16));
  if (Number(value.slice(17, 19)) > 59) throw new Error("invalid_date");
  const result = Date.parse(value);
  if (
    !Number.isFinite(result) ||
    new Date(result).getUTCFullYear() < 2000 ||
    new Date(result).getUTCFullYear() > 9999
  )
    throw new Error("invalid_date");
  return result;
}
export function validateGrant(
  body: unknown,
  action: GrantAction,
  now = Date.now(),
): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("invalid_request");
  const b = body as Record<string, unknown>;
  const keys =
    action === "create"
      ? [
          "module",
          "tier",
          "starts_at",
          "expires_at",
          "indefinite",
          "internal_reason",
          "owner_message",
        ]
      : action === "extend"
        ? ["version", "expires_at", "indefinite", "internal_reason"]
        : ["version", "internal_reason"];
  if (Object.keys(b).some((key) => !keys.includes(key)))
    throw new Error("invalid_request");
  const text = (value: unknown) => {
    if (
      typeof value !== "string" ||
      [...value.trim()].length < 1 ||
      [...value.trim()].length > 2000
    )
      throw new Error("invalid_request");
    return value.trim();
  };
  const out: Record<string, unknown> = {
    ...b,
    internal_reason: text(b.internal_reason),
  };
  if (
    action !== "create" &&
    (!Number.isInteger(b.version) ||
      Number(b.version) < 1 ||
      Number(b.version) > 2147483647)
  )
    throw new Error("invalid_request");
  if (action === "create") {
    if (
      (b.module !== "appointments" && b.module !== "preorders") ||
      (b.tier !== "essential" && b.tier !== "business")
    )
      throw new Error("invalid_request");
    timestamp(b.starts_at);
    if (b.owner_message != null) out.owner_message = text(b.owner_message);
  }
  if (action !== "revoke") {
    if (
      typeof b.indefinite !== "boolean" ||
      b.indefinite !== (b.expires_at == null)
    )
      throw new Error("invalid_request");
    if (b.expires_at != null) {
      const end = timestamp(b.expires_at);
      if (end <= now || (action === "create" && end <= timestamp(b.starts_at)))
        throw new Error("invalid_date");
    }
  }
  return out;
}

export function grantPage(query: URLSearchParams, prefix = "") {
  const parse = (name: string, fallback: number, min: number, max: number) => {
    const raw = query.get(prefix + name);
    if (raw === null) return fallback;
    if (!/^\d+$/.test(raw) || Number(raw) < min || Number(raw) > max)
      throw new Error("invalid_request");
    return Number(raw);
  };
  return {
    limit: parse("limit", 10, 1, 100),
    offset: parse("offset", 0, 0, 2000000000),
  };
}
