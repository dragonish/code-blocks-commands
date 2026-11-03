/** A usage counter loses half of its weight after this many days without use. */
export const USAGE_HALF_LIFE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Decayed usage score used to rank markups: a counter halves in weight every
 * `USAGE_HALF_LIFE_DAYS` days without being used, so a markup used recently
 * outranks one that was popular a long time ago.
 */
export function usageScore(
  count: number,
  lastUsed: number,
  now = Date.now(),
): number {
  if (!(count > 0)) {
    return 0;
  }
  if (!(lastUsed > 0)) {
    return count;
  }
  const ageDays = Math.max(0, now - lastUsed) / DAY_MS;
  return count * Math.pow(0.5, ageDays / USAGE_HALF_LIFE_DAYS);
}

export function isUsedCountEntry(value: unknown): value is UsedCountEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const entry = value as Partial<UsedCountEntry>;
  return typeof entry.count === "number";
}
