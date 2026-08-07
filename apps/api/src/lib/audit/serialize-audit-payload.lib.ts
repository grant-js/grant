/**
 * Matches `varchar(1000)` on all entity audit log tables.
 *
 * Deliberately NOT env-configurable: it mirrors a database column constraint,
 * so raising it here without a migration would fail the insert.
 */
export const AUDIT_VALUE_MAX_LENGTH = 1000;

const COMPACT_SAMPLE_SIZE = 5;

const BULKY_OBJECT_KEYS = ['metadata', 'condition', 'payload'] as const;

function compactBulkyFields(values: Record<string, unknown>): Record<string, unknown> {
  const compacted = { ...values };

  if (Array.isArray(compacted.actions) && compacted.actions.length > 0) {
    compacted.actions = {
      _compact: true,
      count: compacted.actions.length,
      sample: compacted.actions.slice(0, COMPACT_SAMPLE_SIZE),
    };
  }

  for (const key of BULKY_OBJECT_KEYS) {
    const value = compacted[key];
    if (value === null || value === undefined || typeof value !== 'object') {
      continue;
    }

    if (Array.isArray(value)) {
      compacted[key] = {
        _compact: true,
        count: value.length,
      };
    } else {
      compacted[key] = {
        _compact: true,
        keys: Object.keys(value),
      };
    }
  }

  return compacted;
}

function truncatePayload(serialized: string): string {
  let previewLength = AUDIT_VALUE_MAX_LENGTH - 80;

  while (previewLength > 0) {
    const truncated = {
      _truncated: true,
      originalLength: serialized.length,
      preview: serialized.slice(0, previewLength),
    };
    const result = JSON.stringify(truncated);
    if (result.length <= AUDIT_VALUE_MAX_LENGTH) {
      return result;
    }
    previewLength -= 50;
  }

  return JSON.stringify({ _truncated: true, originalLength: serialized.length });
}

/**
 * Serializes audit payloads for storage in `varchar(1000)` columns.
 * Compacts known bulky fields before falling back to a truncated preview.
 */
export function serializeAuditPayload(
  values: Record<string, unknown> | null | undefined
): string | null {
  if (!values) {
    return null;
  }

  const serialized = JSON.stringify(values);
  if (serialized.length <= AUDIT_VALUE_MAX_LENGTH) {
    return serialized;
  }

  const compactedSerialized = JSON.stringify(compactBulkyFields(values));
  if (compactedSerialized.length <= AUDIT_VALUE_MAX_LENGTH) {
    return compactedSerialized;
  }

  return truncatePayload(compactedSerialized);
}
