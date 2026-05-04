/**
 * pg v8+ warns when `sslmode` is `require`, `prefer`, or `verify-ca` without stating intent:
 * today those modes are treated like `verify-full`; in pg v9 they will follow libpq semantics.
 *
 * We normalize to `verify-full` so behavior matches what you get now and the warning goes away.
 * Opt out of rewriting by adding `uselibpqcompat=true` (libpq-style `require`).
 *
 * @see https://www.postgresql.org/docs/current/libpq-ssl.html
 */
export function normalizePgConnectionString(connectionString: string): string {
  try {
    const u = new URL(connectionString);
    if (u.searchParams.get("uselibpqcompat") === "true") {
      return connectionString;
    }
    const mode = u.searchParams.get("sslmode");
    if (!mode) return connectionString;
    const lower = mode.toLowerCase();
    if (lower === "require" || lower === "prefer" || lower === "verify-ca") {
      u.searchParams.set("sslmode", "verify-full");
      return u.toString();
    }
    return connectionString;
  } catch {
    return connectionString;
  }
}
