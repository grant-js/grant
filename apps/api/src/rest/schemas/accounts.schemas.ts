import { AccountType, SortOrder } from '@logusgraphics/grant-schema';

import { z } from '@/lib/zod-openapi.lib';
import { createSuccessResponseSchema, listQuerySchema } from '@/rest/schemas/common.schemas';

export const accountTypeSchema = z.enum(
  Object.values(AccountType) as [AccountType, ...AccountType[]]
);

export const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  username: z.string().nullable(),
  type: accountTypeSchema,
  ownerId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const accountWithRelationsSchema = accountSchema.extend({
  projects: z.array(z.unknown()).optional(),
  owner: z.unknown().optional(),
});

export const accountRelationsEnum = z.enum(['projects', 'owner']);

export const getAccountsQuerySchema = listQuerySchema.omit({ relations: true }).extend({
  sortField: z.enum(['name', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.nativeEnum(SortOrder).optional(),
  relations: z
    .array(accountRelationsEnum)
    .optional()
    .openapi({
      description: 'Related entities to include in the response',
      example: ['projects', 'owner'],
    }),
});

export const getAccountsResponseSchema = createSuccessResponseSchema(
  z.object({
    items: z.array(accountWithRelationsSchema),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
  }),
  'Paginated list of accounts'
);

export const createAccountRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  username: z.string().optional(),
  type: accountTypeSchema,
  ownerId: z.string().optional(),
});

export const createAccountResponseSchema = createSuccessResponseSchema(
  accountSchema,
  'Successfully created account'
);

export const updateAccountRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  type: accountTypeSchema.optional(),
});

export const accountParamsSchema = z.object({
  id: z.string().uuid('Invalid account ID'),
});

export const updateAccountResponseSchema = createSuccessResponseSchema(
  accountSchema,
  'Successfully updated account'
);

export const deleteAccountQuerySchema = z.object({
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deleteAccountResponseSchema = createSuccessResponseSchema(
  accountSchema,
  'Successfully deleted account'
);

export const createComplementaryAccountRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  username: z.string().optional().nullable(),
});

export const createComplementaryAccountResponseSchema = createSuccessResponseSchema(
  z.object({
    account: accountSchema,
    accounts: z.array(accountSchema),
  }),
  'Successfully created complementary account'
);
