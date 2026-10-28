import { CREDENTIAL_SOURCES } from '@grantjs/core';
import { CredentialKind, SortOrder, UserSortableField } from '@grantjs/schema';

import { z } from '@/lib/zod-openapi.lib';
import {
  createStringArrayQuerySchema,
  createSuccessResponseSchema,
  jsonSchema,
  listQuerySchema,
  scopeSchema,
  tenantSchema,
} from '@/rest/schemas/common.schemas';

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const userWithRelationsSchema = userSchema.extend({
  roles: z.array(z.unknown()).optional(),
  tags: z.array(z.unknown()).optional(),
  accounts: z.array(z.unknown()).optional(),
  authenticationMethods: z.array(z.unknown()).optional(),
  permissionCount: z.number().optional(),
  primaryTag: z.unknown().nullable().optional(),
  projectUserApiKeyCount: z.number().optional(),
  roleCount: z.number().optional(),
  tagCount: z.number().optional(),
});

const userFieldsEnum = z.enum([
  'permissionCount',
  'primaryTag',
  'projectUserApiKeyCount',
  'roleCount',
  'tagCount',
]);
const userRelationsEnum = z.enum(['roles', 'tags', 'accounts', 'authenticationMethods']);

export const getUsersQuerySchema = listQuerySchema.omit({ relations: true }).extend({
  scopeId: z.uuid('errors.validation.invalidScopeId'),
  tenant: tenantSchema,
  sortField: z
    .enum(Object.values(UserSortableField) as [UserSortableField, ...UserSortableField[]])
    .optional(),
  sortOrder: z.nativeEnum(SortOrder).optional(),
  tagIds: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => {
      if (typeof val === 'string') {
        return val.split(',').map((v) => v.trim());
      }
      return val;
    })
    .optional(),
  relations: z
    .array(userRelationsEnum)
    .optional()
    .openapi({
      description: 'Related entities to include in the response',
      example: ['roles', 'tags'],
    }),
  fields: createStringArrayQuerySchema(userFieldsEnum)
    .optional()
    .openapi({
      description: 'Computed fields to include in the response',
      example: ['primaryTag', 'roleCount', 'tagCount'],
    }),
});

export const getUsersResponseSchema = createSuccessResponseSchema(
  z.object({
    items: z.array(userWithRelationsSchema),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
  }),
  'Paginated list of users'
);

export const createUserRequestSchema = z.object({
  name: z
    .string()
    .min(1, 'errors.validation.nameRequired')
    .max(255, 'errors.validation.nameTooLong')
    .openapi({
      description: "User's full name",
      example: 'John Doe',
    }),
  scope: scopeSchema,
  roleIds: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Array of role IDs to assign to the user',
      example: ['123e4567-e89b-12d3-a456-426614174001'],
    }),
  groupIds: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Array of group IDs to assign directly to the user',
      example: ['123e4567-e89b-12d3-a456-426614174003'],
    }),
  permissionIds: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Array of permission IDs to assign directly to the user',
      example: ['123e4567-e89b-12d3-a456-426614174004'],
    }),
  tagIds: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Array of tag IDs to assign to the user',
      example: ['123e4567-e89b-12d3-a456-426614174002'],
    }),
  primaryTagId: z.string().optional().openapi({
    description: 'Primary tag ID for the user',
    example: '123e4567-e89b-12d3-a456-426614174002',
  }),
  email: z.string().email('errors.validation.invalidEmail').optional().openapi({
    description:
      'Optional unverified Email method. Project-scope create only. Requires ProjectUser:SetEmail in addition to User:Create.',
    example: 'member@example.com',
  }),
});

export const createUserResponseSchema = createSuccessResponseSchema(
  userSchema,
  'Successfully created user'
);

export const updateUserRequestSchema = z.object({
  scope: scopeSchema,
  name: z
    .string()
    .min(1, 'errors.validation.nameRequired')
    .max(255, 'errors.validation.nameTooLong')
    .optional()
    .openapi({
      description: "Updated user's full name",
      example: 'Jane Doe',
    }),
  pictureUrl: z.string().max(500).nullable().optional().openapi({
    description: 'Public profile picture URL (global or project pivot depending on scope)',
  }),
  metadata: jsonSchema.nullable().optional().openapi({
    description: 'User metadata (merged to project pivot when scope is a project)',
  }),
  roleIds: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Array of role IDs to assign to the user',
      example: ['123e4567-e89b-12d3-a456-426614174001'],
    }),
  groupIds: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Array of group IDs to assign directly to the user',
      example: ['123e4567-e89b-12d3-a456-426614174003'],
    }),
  tagIds: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Array of tag IDs to assign to the user',
      example: ['123e4567-e89b-12d3-a456-426614174002'],
    }),
  primaryTagId: z.string().optional().openapi({
    description: 'Primary tag ID for the user',
    example: '123e4567-e89b-12d3-a456-426614174002',
  }),
});

export const userParamsSchema = z.object({
  id: z.uuid('errors.validation.invalidUserId').openapi({
    description: 'UUID of the user',
    example: '123e4567-e89b-12d3-a456-426614174003',
    param: { in: 'path', name: 'id' },
  }),
});

export const setProjectUserEmailRequestSchema = z.object({
  scope: scopeSchema,
  email: z.string().email('errors.validation.invalidEmail').openapi({
    description:
      'Unverified Email authentication method. Project-scope only. Requires ProjectUser:SetEmail.',
    example: 'member@example.com',
  }),
});

export const setProjectUserEmailResponseSchema = createSuccessResponseSchema(
  userSchema,
  'Successfully set project user email'
);

/**
 * The password is shape-checked only (a string). The policy is applied by the handler with
 * `validateSecretInput`, so a rejection names the rules and never contains the value, and no
 * issue message produced here embeds the input.
 */
export const setProjectUserPasswordRequestSchema = z.object({
  scope: scopeSchema,
  password: z.string().min(1, 'errors.validation.passwordRequired').openapi({
    description:
      'The new project password, set as written. Must meet the password policy. Never returned, logged or echoed in an error. Requires ProjectUser:SetPassword.',
    format: 'password',
  }),
});

export const setProjectUserPasswordResponseSchema = createSuccessResponseSchema(
  userSchema,
  'Successfully set project user password'
);

/**
 * `kinds` is an enum of one member today (`PASSWORD`); a later kind extends it. The handler
 * applies the page-size cap, membership and project-scope rules.
 */
export const exportProjectUserCredentialsRequestSchema = z.object({
  scope: scopeSchema,
  userIds: z
    .array(z.uuid('errors.validation.invalidUserId'))
    .min(1, 'errors.validation.idRequired')
    .openapi({
      description:
        'Project members to export, in the order the result is returned. Every id must be a member of the project, otherwise the whole call fails with 404 (no partial export). At most one page (the API maximum page size).',
    }),
  kinds: z
    .array(z.nativeEnum(CredentialKind))
    .min(1)
    .optional()
    .openapi({
      description: 'Credential kinds to export. Defaults to `["PASSWORD"]`.',
      example: [CredentialKind.Password],
    }),
});

export const exportedPasswordCredentialSchema = z.object({
  algorithm: z.string().openapi({ description: 'Hash algorithm, `bcrypt`.', example: 'bcrypt' }),
  hash: z.string().openapi({
    description: 'The stored bcrypt hash. Secret-equivalent: handle like a credential.',
  }),
});

export const exportedProjectUserCredentialSchema = z.object({
  userId: z.string(),
  password: exportedPasswordCredentialSchema
    .nullable()
    .openapi({ description: '`null` when the member has no project password credential.' }),
});

export const exportProjectUserCredentialsDataSchema = z.object({
  users: z.array(exportedProjectUserCredentialSchema),
});

export const exportProjectUserCredentialsResponseSchema = createSuccessResponseSchema(
  exportProjectUserCredentialsDataSchema,
  'Credential hashes of the requested project members (the one place a hash leaves Grant; audited)'
);

export const updateUserResponseSchema = createSuccessResponseSchema(
  userSchema,
  'Successfully updated user'
);

export const deleteUserQuerySchema = z.object({
  scopeId: z.uuid('errors.validation.invalidScopeId'),
  tenant: tenantSchema,
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deleteUserResponseSchema = createSuccessResponseSchema(
  userSchema,
  'Successfully deleted user'
);

export const userAuthenticationMethodSchema = z.object({
  id: z.string().openapi({
    description: 'Authentication method ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  }),
  userId: z.string().openapi({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  }),
  provider: z.enum(['email', 'google', 'github']).openapi({
    description: 'Authentication provider',
    example: 'email',
  }),
  providerId: z.string().openapi({
    description: 'Provider-specific identifier (e.g., email address)',
    example: 'user@example.com',
  }),
  isVerified: z.boolean().openapi({
    description: 'Whether the authentication method is verified',
    example: true,
  }),
  isPrimary: z.boolean().openapi({
    description: 'Whether this is the primary authentication method',
    example: true,
  }),
  hasPassword: z.boolean().openapi({
    description: 'True when this Email method has a password. Always false for social providers.',
    example: true,
  }),
  lastUsedAt: z.string().nullable().optional().openapi({
    description: 'Last time this authentication method was used',
    example: '2024-01-01T00:00:00Z',
  }),
  createdAt: z.string().openapi({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00Z',
  }),
  updatedAt: z.string().openapi({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00Z',
  }),
});

export const exportUserDataResponseSchema = z.object({
  user: z.object({
    id: z.uuid(),
    name: z.string(),
    email: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
  accounts: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      slug: z.string(),
      type: z.string(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    })
  ),
  authenticationMethods: z.array(
    z.object({
      provider: z.string(),
      providerId: z.string(),
      isVerified: z.boolean(),
      isPrimary: z.boolean(),
      lastUsedAt: z.string().datetime().nullable(),
      createdAt: z.string().datetime(),
    })
  ),
  credentials: z
    .array(
      z.object({
        scope: z.enum(['platform', 'project']),
        projectId: z.uuid().nullable(),
        source: z.enum(CREDENTIAL_SOURCES),
        lastUsedAt: z.string().datetime().nullable(),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
      })
    )
    .openapi({
      description:
        'Password credentials the user holds, per scope: existence, scope, source and dates. The hash is never exported.',
    }),
  sessions: z.array(
    z.object({
      userAgent: z.string().nullable(),
      ipAddress: z.string().nullable(),
      lastUsedAt: z.string().datetime().nullable(),
      expiresAt: z.string().datetime(),
      createdAt: z.string().datetime(),
    })
  ),
  organizationMemberships: z.array(
    z.object({
      organizationId: z.uuid(),
      organizationName: z.string(),
      role: z.string(),
      joinedAt: z.string().datetime(),
    })
  ),
  projectMemberships: z.array(
    z.object({
      projectId: z.uuid(),
      projectName: z.string(),
      role: z.string(),
      joinedAt: z.string().datetime(),
    })
  ),
  exportedAt: z.string().datetime(),
});
