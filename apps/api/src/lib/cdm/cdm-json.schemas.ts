import { z } from 'zod';

import { config } from '@/config';
import { ValidationError } from '@/lib/errors';

/**
 * The zod boundary for the CDM document's `JSON` scalar fields.
 *
 * Everything else in `SyncProjectInput` is a typed GraphQL input, so the
 * execution layer already enforces field presence, scalar types, and rejection
 * of unknown fields before a resolver runs. Re-encoding that graph in zod would
 * duplicate a check that already fires — it is the `JSON` scalars that arrive
 * unexamined, because `JSON` asserts nothing at all.
 *
 * Three of them (`condition`, `metadata`, `searchable`) are read back out with
 * `as Record<string, unknown>` — see `permission.cdm-entity.ts:116` and
 * `role-template.cdm-entity.ts:98`. That cast is a lie for any JSON value that
 * is not an object: `condition: 42` and `condition: [1, 2]` both satisfy the
 * GraphQL scalar and both reach persistence, where the cast makes them look
 * like objects to every downstream reader. Asserting the object shape here is
 * what makes those casts true.
 *
 * The size and depth caps exist because a `JSON` scalar is otherwise an
 * unbounded write: the document is persisted whole into the job row and
 * replayed by the worker, so an oversized `metadata` costs storage on every
 * retry and snapshot. Limits live in config, not here.
 */

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/** Depth is checked before size so a deeply nested value cannot be stringified first. */
function exceedsDepth(value: unknown, depth: number, maxDepth: number): boolean {
  if (depth > maxDepth) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some((item) => exceedsDepth(item, depth + 1, maxDepth));
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some((item) => exceedsDepth(item, depth + 1, maxDepth));
  }
  return false;
}

/**
 * A JSON object field that is later read as `Record<string, unknown>`.
 *
 * Rejects arrays and primitives — both pass the GraphQL `JSON` scalar and both
 * break the reader's cast. `null` and `undefined` stay legal: every one of
 * these fields is optional on the input and defaulted to `null` on read.
 */
const cdmJsonObjectSchema = z
  .record(z.string(), z.unknown())
  .nullish()
  .superRefine((value, ctx) => {
    if (value === null || value === undefined) return;

    const { maxJsonDepth, maxJsonBytes } = config.cdm;

    if (exceedsDepth(value, 1, maxJsonDepth)) {
      ctx.addIssue({
        code: 'custom',
        message: `must not nest deeper than ${maxJsonDepth} levels`,
      });
      return;
    }

    const bytes = Buffer.byteLength(JSON.stringify(value ?? null), 'utf8');
    if (bytes > maxJsonBytes) {
      ctx.addIssue({
        code: 'custom',
        message: `must serialize to at most ${maxJsonBytes} bytes (received ${bytes})`,
      });
    }
  });

/**
 * `searchable` is the one JSON scalar that is not read as an object — group and
 * user search tokens are a flat list. Accepts either shape rather than
 * tightening a contract this slice has no evidence about.
 */
const cdmSearchableSchema = z
  .union([z.record(z.string(), z.unknown()), z.array(z.unknown())])
  .nullish()
  .superRefine((value, ctx) => {
    if (value === null || value === undefined) return;
    const bytes = Buffer.byteLength(JSON.stringify(value as JsonValue), 'utf8');
    if (bytes > config.cdm.maxJsonBytes) {
      ctx.addIssue({
        code: 'custom',
        message: `must serialize to at most ${config.cdm.maxJsonBytes} bytes (received ${bytes})`,
      });
    }
  });

/**
 * Which JSON scalars each document section carries, keyed by the collection on
 * {@link ExpandedCdmSyncPayload}. Derived from the `JSON` fields in
 * `sync-project-cdm.graphql`; a section absent here has none.
 *
 * Kept as a table rather than a per-entity schema so that adding a `JSON` field
 * to the GraphQL input has exactly one place to be mirrored.
 */
const CDM_JSON_FIELDS = {
  resources: { metadata: cdmJsonObjectSchema },
  permissions: { condition: cdmJsonObjectSchema, metadata: cdmJsonObjectSchema },
  tags: { metadata: cdmJsonObjectSchema },
  groups: { searchable: cdmSearchableSchema, metadata: cdmJsonObjectSchema },
  roleTemplates: { searchable: cdmSearchableSchema, metadata: cdmJsonObjectSchema },
  provisionedUsers: { searchable: cdmSearchableSchema, metadata: cdmJsonObjectSchema },
  projectUserApiKeys: { metadata: cdmJsonObjectSchema },
} as const satisfies Record<string, Record<string, z.ZodTypeAny>>;

type CdmJsonSection = keyof typeof CDM_JSON_FIELDS;

/**
 * The subset of the expanded payload this validator reads. Entries stay
 * `unknown` because the CDM input types are interfaces, which carry no index
 * signature — the per-field read below narrows one property at a time, which is
 * exactly what the schemas then check.
 */
type CdmJsonDocument = {
  [K in CdmJsonSection]?: readonly unknown[];
};

/**
 * Validates every `JSON` scalar in an expanded CDM document.
 *
 * Runs before the per-entity handlers so a malformed `condition` is rejected
 * with a field path rather than being cast into a shape it does not have. Each
 * offending entry is reported by section, index, and field — a 400-page CDM
 * document is unreviewable if the error only says "invalid metadata".
 */
export function validateCdmJsonFields(document: CdmJsonDocument): void {
  const issues: string[] = [];

  for (const [section, fields] of Object.entries(CDM_JSON_FIELDS)) {
    const entries = document[section as CdmJsonSection] ?? [];

    entries.forEach((entry, index) => {
      const record = (entry ?? {}) as Record<string, unknown>;

      for (const [field, schema] of Object.entries(fields as Record<string, z.ZodTypeAny>)) {
        const result = schema.safeParse(record[field]);
        if (result.success) continue;

        for (const issue of result.error.issues) {
          issues.push(`${section}[${index}].${field}: ${issue.message}`);
        }
      }
    });
  }

  if (issues.length > 0) {
    throw new ValidationError(
      `CDM document has invalid JSON fields:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`,
      issues
    );
  }
}
