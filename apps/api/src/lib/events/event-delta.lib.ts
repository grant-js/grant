/**
 * Compute a changed-fields delta between two flat record snapshots.
 * Returns `field -> { from, to }` for every key whose value differs.
 */
export function buildDelta(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { from: unknown; to: unknown }> {
  const delta: Record<string, { from: unknown; to: unknown }> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const from = before[key];
    const to = after[key];
    if (!shallowEqual(from, to)) {
      delta[key] = { from, to };
    }
  }
  return delta;
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  // Fall back to JSON comparison for objects/arrays held in snapshot values.
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}
