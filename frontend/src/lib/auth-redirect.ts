/**
 * Safe post-auth redirect target.
 *
 * Login/register accept a `?next=` query value (set by RequireAuth). Only
 * same-origin absolute paths are honored: anything else (absolute URLs,
 * protocol-relative URLs, backslash tricks, empty values) falls back to `/`.
 * This prevents open-redirect abuse via crafted login links.
 */
export function getSafeNextPath(next: string | null | undefined): string {
  if (!next) return '/';
  if (!next.startsWith('/')) return '/';
  if (next.startsWith('//')) return '/';
  if (next.includes('\\')) return '/';
  return next;
}
