import { SortOrder } from '@logusgraphics/grant-schema';

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
  scopeId: z.uuid('Invalid scope ID'),
  tenant: tenantSchema,
  sortField: z.enum(['name', 'createdAt', 'updatedAt']).optional(),
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
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').openapi({
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
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional().openapi({
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
  id: z
    .string()
    .uuid('Invalid user ID')
    .openapi({
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
  scopeId: z.uuid('Invalid scope ID'),
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
  file: z.string().min(1, 'File is required').openapi({
    description: 'Base64-encoded file data (with optional data URI prefix)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  }),
  filename: z.string().min(1, 'Filename is required').openapi({
    description: 'Original filename with extension',
    example: 'profile.jpg',
  }),
  contentType: z.string().min(1, 'Content type is required').openapi({
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
  provider: z.enum(['email', 'google', 'github']).optional().openapi({
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
    currentPassword: z.string().min(1, 'Current password is required').openapi({
      description: 'Current password',
      example: 'CurrentPassword123!',
    }),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
      .openapi({
        description: 'New password (must meet password policy requirements)',
        example: 'NewPassword123!',
      }),
    confirmPassword: z.string().min(1, 'Password confirmation is required').openapi({
      description: 'Password confirmation (must match new password)',
      example: 'NewPassword123!',
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
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
    .uuid('Invalid session ID')
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
  userId: z.uuid('Invalid user ID'),
  hardDelete: z.boolean().optional().default(false),
});
