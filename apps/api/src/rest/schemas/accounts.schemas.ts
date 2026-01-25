import { AccountType } from '@grantjs/schema';

import { z } from '@/lib/zod-openapi.lib';
import { createSuccessResponseSchema } from '@/rest/schemas/common.schemas';

export const accountTypeSchema = z.enum(
  Object.values(AccountType) as [AccountType, ...AccountType[]]
);

export const accountSchema = z.object({
  id: z.string(),
  type: accountTypeSchema,
  ownerId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const deleteAccountBodySchema = z.object({
  hardDelete: z.boolean().optional().default(false),
});

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

export const deleteAccountQuerySchema = z.object({
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deleteAccountRequestSchema = z.object({
  userId: z.uuid('Invalid user ID'),
  hardDelete: z.boolean().optional().default(false),
});

export const deleteAccountResponseSchema = createSuccessResponseSchema(
  accountSchema,
  'Successfully deleted account'
);

export const createComplementaryAccountResponseSchema = createSuccessResponseSchema(
  z.object({
    account: accountSchema,
    accounts: z.array(accountSchema),
  }),
  'Successfully created complementary account'
);
