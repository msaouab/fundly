/** Routes where the global income/expense date range applies. */
const PERIOD_AWARE_PREFIXES = ["/", "/incomes", "/expenses", "/savings"] as const;

export function isPeriodAwareRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PERIOD_AWARE_PREFIXES.some(
    (p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)),
  );
}
