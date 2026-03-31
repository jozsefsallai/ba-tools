/** Max message length — keep in sync with `convex/guestbook.ts` MAX_MESSAGE */
export const GUESTBOOK_MESSAGE_MAX = 180;

export const GUESTBOOK_TOKEN_COOKIE = "ba_gb_token";

export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(prefix)) {
      continue;
    }
    const value = trimmed.slice(prefix.length);
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return undefined;
}

export function setCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
): void {
  if (typeof document === "undefined") {
    return;
  }

  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:";
  const encoded = encodeURIComponent(value);
  document.cookie = `${name}=${encoded};path=/;max-age=${maxAgeSeconds};SameSite=Lax${secure ? ";Secure" : ""}`;
}

/**
 * Persistent per-browser token stored in a cookie. Used with Convex so each
 * token can post at most one guestbook message.
 */
export function getOrCreateGuestbookToken(): string {
  let token = getCookie(GUESTBOOK_TOKEN_COOKIE);
  if (!token || token.length < 8) {
    token = crypto.randomUUID();
    setCookie(GUESTBOOK_TOKEN_COOKIE, token, 365 * 24 * 60 * 60);
  }
  return token;
}
