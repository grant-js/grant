import {
  CdmFindBy,
  CdmIfMissing,
  CdmModeStrategy,
  CdmOnConflict,
  type RoleCdmInput,
  type SyncProjectInput,
  type UserCdmInput,
} from '@grantjs/schema';

import { CDM_PASSWORD_ALGORITHM_BCRYPT } from '@/constants/cdm-import.constants';
import { ValidationError } from '@/lib/errors';
import { z } from '@/lib/zod-openapi.lib';

import { bcryptHashProblem, cdmPasswordProblem } from './cdm-password.lib';

/**
 * The one description of a CDM import document, shared by every place that reads one.
 *
 * A document reaches the importer three ways: as a GraphQL variable (typed by the GraphQL
 * input, then {@link validateSyncInput}), as a REST body (this schema, then the handler),
 * and, since ADR 0009, as a JSON object a worker downloads from storage, where nothing
 * else has looked at it. The by-reference path is held to the same schema and the same
 * rules as the inline REST path on purpose: two descriptions of the document are how they
 * drift, and a document is untrusted the moment a client can write the object.
 *
 * Unknown keys are stripped, not refused — the same as the REST body has always behaved.
 */

const cdmKeyResolverSchema = z.object({
  value: z.string().min(1),
  findBy: z.nativeEnum(CdmFindBy).optional(),
  ifMissing: z.nativeEnum(CdmIfMissing).optional(),
});

/**
 * Denormalized search tokens. The GraphQL `JSON` scalar accepts an object or a list, so
 * this does too; size and depth are bounded later by `validateCdmJsonFields`.
 */
const cdmSearchableSchema = z
  .union([z.record(z.string(), z.unknown()), z.array(z.unknown())])
  .optional()
  .nullable();

const resourceCdmSchema = z.object({
  key: z.string().min(1),
  slug: z.string().min(1).optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  actions: z.array(z.string().min(1)).min(1),
  tags: z.array(z.string().min(1)).optional(),
  primaryTag: z.string().min(1).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const permissionCdmSchema = z.object({
  key: z.string().min(1),
  resource: z.string().min(1),
  action: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  condition: z.record(z.string(), z.unknown()).optional().nullable(),
  groups: z.array(z.string().min(1)).optional(),
  tags: z.array(z.string().min(1)).optional(),
  primaryTag: z.string().min(1).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const tagCdmSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1).max(255),
  color: z.string().min(1).max(50),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const groupCdmSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  permissions: z.array(z.string().min(1)).optional(),
  tags: z.array(z.string().min(1)).optional(),
  primaryTag: z.string().min(1).optional().nullable(),
  searchable: cdmSearchableSchema,
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const roleCdmSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  groups: z.array(z.string().min(1)).optional(),
  permissions: z.array(z.string().min(1)).optional().openapi({
    description:
      'Opaque keys matching `permissions[].key` in this document, or catalog grants as `resourceSlug:action` (normalized; slug must not contain `:`).',
  }),
  tags: z.array(z.string().min(1)).optional(),
  primaryTag: z.string().min(1).optional().nullable(),
  searchable: cdmSearchableSchema,
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const userApiKeyCdmSchema = z.object({
  key: z.string().min(1).optional().nullable(),
  clientId: z.string().optional().nullable(),
  clientSecret: z.string().min(32, 'errors.validation.clientSecretMin32').optional(),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const cdmPasswordSchema = z
  .object({
    algorithm: z.literal(CDM_PASSWORD_ALGORITHM_BCRYPT, {
      message: `password.algorithm must be '${CDM_PASSWORD_ALGORITHM_BCRYPT}'`,
    }),
    hash: z
      .string({ message: 'password.hash must be a string' })
      .superRefine((hash, ctx) => {
        const problem = bcryptHashProblem(hash);
        if (problem) {
          ctx.addIssue({ code: 'custom', message: problem });
        }
      })
      .openapi({
        description:
          'A bcrypt hash (`$2a$`, `$2b$` or `$2y$`, two-digit cost between 4 and 15, 60 characters), for example the output of Go `bcrypt.GenerateFromPassword`. Never the plaintext. An invalid value is refused without being echoed.',
        example: '$2a$10$' + 'x'.repeat(53),
      }),
  })
  .openapi({
    description:
      'An existing password credential to store as the user email password (ADR 0010). Only valid with `key.findBy: email`.',
  });

const userCdmSchema = z.object({
  key: cdmKeyResolverSchema,
  name: z.string().min(1),
  roles: z.array(z.string().min(1)).optional(),
  groups: z.array(z.string().min(1)).optional(),
  permissions: z.array(z.string().min(1)).optional().openapi({
    description:
      'Direct permission keys or catalog `resourceSlug:action` strings not already implied by the user roles (see role `permissions`).',
  }),
  tags: z.array(z.string().min(1)).optional(),
  primaryTag: z.string().min(1).optional().nullable(),
  apiKeys: z.array(userApiKeyCdmSchema).optional(),
  password: cdmPasswordSchema.optional().nullable(),
  searchable: cdmSearchableSchema,
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const cdmModeSchema = z.object({
  strategy: z.nativeEnum(CdmModeStrategy),
  onConflict: z.nativeEnum(CdmOnConflict).optional().nullable(),
  confirmDestructive: z.boolean().optional(),
});

/** The entity collections of a document, each optional except where a rule below says otherwise. */
export const cdmEntityCollectionFields = {
  roles: z.array(roleCdmSchema),
  users: z.array(userCdmSchema),
  resources: z.array(resourceCdmSchema).optional().openapi({
    description:
      'Optional custom resources. Permissions in this document reference them by opaque `resource` keys.',
  }),
  permissions: z.array(permissionCdmSchema).optional().openapi({
    description:
      'Optional custom permissions for this project, each referencing a `resource` key from the same document.',
  }),
  groups: z.array(groupCdmSchema).optional(),
  tags: z.array(tagCdmSchema).optional().openapi({
    description:
      'Optional CDM tags; role and user `tags` reference these keys. `user_tags` are global rows.',
  }),
};

/** Fields of the document that are not entity collections. */
export const cdmDocumentHeaderFields = {
  version: z.number().int().openapi({ example: 1 }),
  id: z.string().optional(),
  mode: cdmModeSchema,
};

export const MODE_REPLACE_REQUIRES_CONFIRMATION =
  'mode.confirmDestructive must be true when mode.strategy is replace';

/**
 * The whole document: what an inline REST body carries beside `scope`, and what the file
 * behind a by-reference import must contain.
 */
const cdmDocumentSchema = z
  .object({ ...cdmDocumentHeaderFields, ...cdmEntityCollectionFields })
  .superRefine((data, ctx) => {
    if (data.mode.strategy === CdmModeStrategy.Replace && data.mode.confirmDestructive !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: MODE_REPLACE_REQUIRES_CONFIRMATION,
      });
    }
  });

export type CdmDocument = z.infer<typeof cdmDocumentSchema>;

/**
 * A whole document in the GraphQL input types: what the importer, the exporter and the
 * snapshot hold.
 *
 * `SyncProjectInput` is also the mutation's argument, and since ADR 0009 it can instead
 * carry `source` and leave `version`, `roles` and `users` out, so the generated type makes
 * all three optional. Everything past the point where a document has been accepted has one,
 * and this is what says so.
 */
export type CdmDocumentInput = SyncProjectInput & {
  version: number;
  roles: RoleCdmInput[];
  users: UserCdmInput[];
};

/** The entity collections {@link countCdmEntities} counts, and the ones a by-reference request must omit. */
export const CDM_ENTITY_COLLECTIONS = [
  'roles',
  'users',
  'resources',
  'permissions',
  'groups',
  'tags',
] as const;

type EntityCollections = {
  [K in (typeof CDM_ENTITY_COLLECTIONS)[number]]?: readonly unknown[] | null;
};

/**
 * Entities in a document: roles, users, resources, permissions, groups and tags.
 *
 * The unit ADR 0002's measurements and the `CDM_IMPORT_MAX_ENTITIES` cap are in — the
 * 28,880-entity profile is 25,000 users + 400 resources + 2,400 permissions + 200 roles +
 * 800 groups + 80 tags. API keys and role/group links are not entities.
 */
export function countCdmEntities(document: EntityCollections): number {
  let total = 0;
  for (const collection of CDM_ENTITY_COLLECTIONS) {
    total += document[collection]?.length ?? 0;
  }
  return total;
}

/** The slice of a document {@link validateSyncInput} reads. */
export interface SyncInputUnderValidation {
  version: number;
  mode?: { strategy?: string | null; confirmDestructive?: boolean | null } | null;
  roles: readonly { key: string }[];
  users: readonly {
    key: { value: string; findBy?: string | null };
    password?: { algorithm?: unknown; hash?: unknown } | null;
  }[];
}

/**
 * Rules a typed document still has to satisfy, shared by the inline start (handler) and
 * the by-reference worker so the two cannot accept different documents. `redactUserKeys`
 * keeps user key values out of the message, for a caller that persists it.
 */
export function validateSyncInput(
  input: SyncInputUnderValidation,
  options: { redactUserKeys?: boolean } = {}
): void {
  if (input.version !== 1) {
    throw new ValidationError('Unsupported version; only 1 is allowed');
  }
  if (input.mode?.strategy === 'replace' && input.mode.confirmDestructive !== true) {
    throw new ValidationError(MODE_REPLACE_REQUIRES_CONFIRMATION);
  }

  const roleKeys = new Set<string>();
  for (const r of input.roles) {
    if (roleKeys.has(r.key)) {
      throw new ValidationError(`Duplicate role key: ${r.key}`);
    }
    roleKeys.add(r.key);
  }

  const userSeen = new Set<string>();
  for (const [index, u] of input.users.entries()) {
    const isId = u.key.findBy === CdmFindBy.Id;
    const dedupe = isId ? `id:${u.key.value}` : `key:${u.key.value}`;
    if (userSeen.has(dedupe)) {
      // A user key is usually an email. The inline caller gets it back in a 400 it can act on;
      // a by-reference refusal is stored on the job row and published as an event, where it
      // must not outlive the request, so it names the position and never the value.
      throw new ValidationError(
        options.redactUserKeys
          ? `Duplicate user key at users[${index}]`
          : `Duplicate user entry: ${dedupe}`
      );
    }
    userSeen.add(dedupe);

    assertUserPassword(u, index);
  }
}

/**
 * A password is the credential of the email authentication method, so it only belongs on
 * a user identified by email, and what it carries must be a bcrypt hash this deployment
 * accepts. The message names the position, never the key (an email) or the hash: this
 * runs for the by-reference worker too, whose refusals are stored on the job row.
 */
function assertUserPassword(user: SyncInputUnderValidation['users'][number], index: number): void {
  if (user.password == null) {
    return;
  }
  if (user.key.findBy !== CdmFindBy.Email) {
    throw new ValidationError(
      `users[${index}]: password is only allowed with key.findBy 'email'; the credential belongs to the email authentication method`
    );
  }
  const problem = cdmPasswordProblem(user.password);
  if (problem) {
    throw new ValidationError(`users[${index}]: ${problem}`);
  }
}

const MAX_REPORTED_ISSUES = 20;

/**
 * Parse a document read from storage into a {@link CdmDocument}.
 *
 * A failure names the offending paths, capped: a 5,000-entity document can have 5,000
 * of the same mistake, and the message is stored on the job row and shown to the caller.
 *
 * @throws ValidationError when the value is not a valid CDM document
 */
export function parseCdmDocument(value: unknown): CdmDocument {
  const result = cdmDocumentSchema.safeParse(value);
  if (result.success) {
    return result.data;
  }

  const issues = result.error.issues.map(
    (issue) => `${issue.path.join('.') || '(document)'}: ${issue.message}`
  );
  const shown = issues.slice(0, MAX_REPORTED_ISSUES);
  const omitted = issues.length - shown.length;
  throw new ValidationError(
    `CDM document is invalid:\n${shown.map((line) => `  - ${line}`).join('\n')}${
      omitted > 0 ? `\n  - ...and ${omitted} more` : ''
    }`,
    shown
  );
}
