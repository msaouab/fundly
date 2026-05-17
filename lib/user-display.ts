/** Strip parenthetical suffixes like "(Demo)" before splitting names. */
function normalizeName(name: string): string {
  return name.replace(/\s*\([^)]*\)/g, "").trim();
}

export function getUserInitials(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = normalizeName(trimmed).split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0][0];
      const b = parts[parts.length - 1][0];
      if (a && b) return `${a}${b}`.toUpperCase();
    }
    if (parts[0]?.length >= 2) return parts[0].slice(0, 2).toUpperCase();
    if (parts[0]?.[0]) return `${parts[0][0]}${email?.[0] ?? ""}`.toUpperCase();
  }
  const local = email?.split("@")[0] ?? "";
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  if (local[0]) return `${local[0]}${local[1] ?? ""}`.toUpperCase();
  return "?";
}

export function getUserDisplayName(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  const local = email?.split("@")[0];
  if (local) return local;
  return "Account";
}
