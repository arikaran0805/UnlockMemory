/**
 * Auth Redirect Utilities
 * 
 * Centralised helpers for storing / retrieving the post-authentication
 * redirect path.  Uses localStorage so the value survives across tabs
 * (important for email-verification links that open in a new tab).
 */

const STORAGE_KEY = "post_auth_redirect";

/** Paths that must never be used as a redirect target */
const BLOCKED_PATHS = ["/login", "/signup", "/auth", "/verify-email"];

/**
 * Returns true when `path` is a safe, internal relative path that we
 * are willing to redirect to after authentication.
 */
export function isValidRedirectPath(path: string | null | undefined): path is string {
  if (!path) return false;
  // Must start with "/" (relative) and must NOT start with "//" (protocol-relative URL)
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  // Block auth-related pages
  if (BLOCKED_PATHS.some((bp) => path === bp || path.startsWith(bp + "/"))) return false;
  return true;
}

/** Persist a redirect path for use after login / verification. */
export function saveRedirectPath(path: string | null | undefined): void {
  if (isValidRedirectPath(path)) {
    localStorage.setItem(STORAGE_KEY, path);
  }
}

/** Read and clear the stored redirect path. Returns the path or null. */
export function consumeRedirectPath(): string | null {
  const path = localStorage.getItem(STORAGE_KEY);
  if (path) localStorage.removeItem(STORAGE_KEY);
  return isValidRedirectPath(path) ? path : null;
}

/** Read without clearing (peek). */
export function peekRedirectPath(): string | null {
  const path = localStorage.getItem(STORAGE_KEY);
  return isValidRedirectPath(path) ? path : null;
}

/** Explicitly clear the stored redirect. */
export function clearRedirectPath(): void {
  localStorage.removeItem(STORAGE_KEY);
}
