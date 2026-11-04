/** Keep authentication return destinations on this origin, normalized to a path. */
export function authReturnPath(url: URL): string | undefined {
  const value = url.searchParams.get("redirect_url");
  if (!value || /[\\\x00-\x20]/.test(value)) return undefined;
  if (!value.startsWith("/") && !/^https?:\/\//.test(value)) return undefined;
  try {
    const target = new URL(value, url.origin);
    if (target.origin !== url.origin || target.username || target.password) return undefined;
    // Avoid authentication loops when carrying the destination across signup.
    if (/^\/(?:en\/)?(?:login|register)(?:\/|$)/.test(target.pathname)) return undefined;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch { return undefined; }
}
export function authFlowLink(path: string, returnPath: string | undefined): string {
  return returnPath ? `${path}?${new URLSearchParams({redirect_url:returnPath})}` : path;
}
