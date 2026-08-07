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

export const createComplementaryAccountResponseSchema = createSuccessResponseSchema(
  z.object({
    account: accountSchema,
    accounts: z.array(accountSchema),
  }),
  'Successfully created complementary account'
);
