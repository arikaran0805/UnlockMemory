/**
 * Auth Redirect Utilities
 *
 * Centralized helpers for storing / retrieving the post-authentication
 * redirect path. Uses localStorage so the value survives across tabs
 * (important for email-verification links that open in a new tab).
 */

const STORAGE_KEY = "post_auth_redirect";

/** Paths that must never be used as a redirect target */
const BLOCKED_PATHS = [
  "/login",
  "/signup",
  "/auth",
  "/verify-email",
  "/verify-email/confirm",
  "/reset-password",
  "/forgot-password",
];

const isBlockedPath = (path: string): boolean => {
  return BLOCKED_PATHS.some(
    (blockedPath) =>
      path === blockedPath ||
      path.startsWith(`${blockedPath}/`) ||
      path.startsWith(`${blockedPath}?`)
  );
};

/**
 * Returns true when `path` is a safe, internal relative path that we
 * are willing to redirect to after authentication.
 */
export function isValidRedirectPath(path: string | null | undefined): path is string {
  if (!path) return false;

  const normalizedPath = path.trim();
  if (!normalizedPath) return false;

  // Must start with "/" (relative) and must NOT start with "//" (protocol-relative URL)
  if (!normalizedPath.startsWith("/") || normalizedPath.startsWith("//")) return false;

  // Block auth-related pages and callback-like routes
  if (isBlockedPath(normalizedPath)) return false;

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

/** Resolve redirect target using query param first, then storage, then fallback. */
export function resolvePostAuthRedirect(
  queryRedirectPath: string | null | undefined,
  fallbackPath = "/profile"
): string {
  if (isValidRedirectPath(queryRedirectPath)) return queryRedirectPath;

  const storedPath = peekRedirectPath();
  if (storedPath) return storedPath;

  return fallbackPath;
}

/** Explicitly clear the stored redirect. */
export function clearRedirectPath(): void {
  localStorage.removeItem(STORAGE_KEY);
}

