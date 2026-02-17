import { SortOrder, UserAuthenticationMethodProvider, UserSortableField } from '@grantjs/schema';

import { z } from '@/lib/zod-openapi.lib';
import {
  createSuccessResponseSchema,
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
});

export const userRelationsEnum = z.enum(['roles', 'tags', 'accounts', 'authenticationMethods']);

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
  roleIds: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Array of role IDs to assign to the user',
      example: ['123e4567-e89b-12d3-a456-426614174001'],
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

export const uploadUserPictureRequestSchema = z.object({
  file: z.string().min(1, 'errors.validation.fileRequired').openapi({
    description: 'Base64-encoded file data (with optional data URI prefix)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  }),
  filename: z.string().min(1, 'errors.validation.filenameRequired').openapi({
    description: 'Original filename with extension',
    example: 'profile.jpg',
  }),
  contentType: z.string().min(1, 'errors.validation.contentTypeRequired').openapi({
    description: 'MIME type of the file',
    example: 'image/jpeg',
  }),
});

export const uploadUserPictureResponseSchema = createSuccessResponseSchema(
  z.object({
    url: z.string().openapi({
      description: 'Public URL of the uploaded file',
      example: '/storage/users/123/picture.jpg',
    }),
    path: z.string().openapi({
      description: 'Storage path of the uploaded file',
      example: 'users/123/picture.jpg',
    }),
  }),
  'Successfully uploaded user picture'
);

export const getUserAuthenticationMethodsQuerySchema = z.object({
  provider: z
    .enum(
      Object.values(UserAuthenticationMethodProvider) as [
        UserAuthenticationMethodProvider,
        ...UserAuthenticationMethodProvider[],
      ]
    )
    .optional()
    .openapi({
      description: 'Filter by authentication provider',
      example: 'email',
    }),
});

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

export const getUserAuthenticationMethodsResponseSchema = createSuccessResponseSchema(
  z.array(userAuthenticationMethodSchema),
  'Successfully retrieved user authentication methods'
);

export const changePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1, 'errors.validation.currentPasswordRequired').openapi({
      description: 'Current password',
      example: 'CurrentPassword123!',
    }),
    newPassword: z
      .string()
      .min(8, 'errors.validation.passwordMin8')
      .max(128, 'errors.validation.passwordMax128')
      .regex(/[A-Z]/, 'errors.validation.passwordUppercase')
      .regex(/[a-z]/, 'errors.validation.passwordLowercase')
      .regex(/[0-9]/, 'errors.validation.passwordNumber')
      .regex(/[^A-Za-z0-9]/, 'errors.validation.passwordSpecialChar')
      .openapi({
        description: 'New password (must meet password policy requirements)',
        example: 'NewPassword123!',
      }),
    confirmPassword: z.string().min(1, 'errors.validation.confirmPasswordRequired').openapi({
      description: 'Password confirmation (must match new password)',
      example: 'NewPassword123!',
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'errors.validation.passwordMismatch',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'errors.validation.newPasswordDifferent',
    path: ['newPassword'],
  });

export const changePasswordResponseSchema = createSuccessResponseSchema(
  z.object({
    success: z.boolean().openapi({
      description: 'Whether the password change was successful',
      example: true,
    }),
    message: z.string().openapi({
      description: 'Success message',
      example: 'Password changed successfully',
    }),
  }),
  'Successfully changed password'
);

export const getUserSessionsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().positive().optional())
    .openapi({
      description: 'Page number for pagination',
      example: 1,
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().optional())
    .openapi({
      description: 'Number of items per page',
      example: 50,
    }),
  audience: z.string().optional().openapi({
    description: 'Filter by session audience',
    example: 'account:123e4567-e89b-12d3-a456-426614174001',
  }),
});

export const userSessionSchema = z.object({
  id: z.string().openapi({
    description: 'Session ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  }),
  userId: z.string().openapi({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  }),
  userAuthenticationMethodId: z.string().openapi({
    description: 'Authentication method ID used for this session',
    example: '123e4567-e89b-12d3-a456-426614174003',
  }),
  userAuthenticationMethod: z
    .object({
      provider: z.enum(['email', 'google', 'github']),
      providerId: z.string(),
    })
    .optional()
    .openapi({
      description: 'Authentication method details',
    }),
  audience: z.string().openapi({
    description: 'Session audience (scope)',
    example: 'account:123e4567-e89b-12d3-a456-426614174001',
  }),
  expiresAt: z.string().openapi({
    description: 'Session expiration timestamp',
    example: '2024-01-01T00:00:00Z',
  }),
  lastUsedAt: z.string().nullable().optional().openapi({
    description: 'Last time the session was used',
    example: '2024-01-01T00:00:00Z',
  }),
  userAgent: z.string().nullable().optional().openapi({
    description: 'User agent string',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  }),
  ipAddress: z.string().nullable().optional().openapi({
    description: 'IP address',
    example: '192.168.1.1',
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

export const getUserSessionsResponseSchema = createSuccessResponseSchema(
  z.object({
    userSessions: z.array(userSessionSchema),
    totalCount: z.number().openapi({
      description: 'Total number of sessions',
      example: 5,
    }),
    hasNextPage: z.boolean().openapi({
      description: 'Whether there are more pages',
      example: false,
    }),
  }),
  'Successfully retrieved user sessions'
);

export const revokeUserSessionParamsSchema = z.object({
  id: z
    .string()
    .uuid('errors.validation.invalidSessionId')
    .openapi({
      description: 'Session ID to revoke',
      example: '123e4567-e89b-12d3-a456-426614174001',
      param: { in: 'path', name: 'sessionId' },
    }),
});

export const revokeUserSessionResponseSchema = createSuccessResponseSchema(
  z.object({
    success: z.boolean().openapi({
      description: 'Whether the session revocation was successful',
      example: true,
    }),
    message: z.string().openapi({
      description: 'Success message',
      example: 'Session revoked successfully',
    }),
  }),
  'Successfully revoked user session'
);

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

export const deleteUserAccountRequestSchema = z.object({
  userId: z.uuid('errors.validation.invalidUserId'),
  hardDelete: z.boolean().optional().default(false),
});
