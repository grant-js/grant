import { UserAuthenticationMethodProvider } from '@grantjs/schema';

import { z } from '@/lib/zod-openapi.lib';
import { createComplementaryAccountResponseSchema } from '@/rest/schemas/accounts.schemas';
import { createSuccessResponseSchema } from '@/rest/schemas/common.schemas';
import { userAuthenticationMethodSchema, userSchema } from '@/rest/schemas/users.schemas';

// Re-export shared schemas for convenience
export { userAuthenticationMethodSchema };

// Account Management Schemas
export const deleteMyAccountsBodySchema = z.object({
  hardDelete: z.boolean().optional().default(false),
});

export const deleteMyAccountsResponseSchema = createSuccessResponseSchema(
  userSchema,
  'Successfully deleted user accounts'
);

export const createMySecondaryAccountResponseSchema = createComplementaryAccountResponseSchema;

// Picture Upload Schemas
export const uploadMyUserPictureRequestSchema = z.object({
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

export const uploadMyUserPictureResponseSchema = createSuccessResponseSchema(
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

// Authentication Methods Schemas
// No query schema needed for self-management - returns all methods for current user
// userAuthenticationMethodSchema is imported from users.schemas.ts

export const getMyUserAuthenticationMethodsResponseSchema = createSuccessResponseSchema(
  z.array(userAuthenticationMethodSchema),
  'Successfully retrieved user authentication methods'
);

export const providerDataSchema = z.record(z.string(), z.unknown());

export const createMyUserAuthenticationMethodRequestSchema = z.object({
  provider: z
    .enum(
      Object.values(UserAuthenticationMethodProvider) as [
        UserAuthenticationMethodProvider,
        ...UserAuthenticationMethodProvider[],
      ]
    )
    .openapi({
      description: 'Authentication provider',
      example: 'email',
    }),
  providerId: z.string().min(1, 'Provider ID is required').max(255, 'Provider ID too long'),
  providerData: providerDataSchema,
  isVerified: z.boolean().nullable().optional(),
  isPrimary: z.boolean().nullable().optional(),
});

export const createMyUserAuthenticationMethodResponseSchema = createSuccessResponseSchema(
  userAuthenticationMethodSchema,
  'Successfully created user authentication method'
);

// Password Change Schemas
export const changeMyPasswordRequestSchema = z
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

export const changeMyPasswordResponseSchema = createSuccessResponseSchema(
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

// Sessions Schemas
export const getMyUserSessionsQuerySchema = z.object({
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

export const myUserSessionSchema = z.object({
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

export const getMyUserSessionsResponseSchema = createSuccessResponseSchema(
  z.object({
    userSessions: z.array(myUserSessionSchema),
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

export const revokeMyUserSessionParamsSchema = z.object({
  sessionId: z
    .string()
    .uuid('Invalid session ID')
    .openapi({
      description: 'Session ID to revoke',
      example: '123e4567-e89b-12d3-a456-426614174001',
      param: { in: 'path', name: 'sessionId' },
    }),
});

export const revokeMyUserSessionResponseSchema = createSuccessResponseSchema(
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

export const logoutMyUserResponseSchema = createSuccessResponseSchema(
  z.object({
    message: z.string().openapi({
      description: 'Success message',
      example: 'Logged out successfully',
    }),
  }),
  'Successfully logged out'
);

// Data Export Schema (reuse from users.schemas.ts)
export { exportUserDataResponseSchema } from './users.schemas';
