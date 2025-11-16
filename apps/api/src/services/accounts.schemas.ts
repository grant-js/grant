import { AccountSortableField, AccountType } from '@logusgraphics/grant-schema';
import { z } from 'zod';

import {
  baseEntitySchema,
  deleteSchema,
  idSchema,
  nameSchema,
  nonEmptyNameSchema,
  paginatedResponseSchema,
  queryParamsSchema,
  slugSchema,
  sortOrderSchema,
} from './common/schemas';

export const accountSortableFieldSchema = z.enum(
  Object.values(AccountSortableField) as [AccountSortableField, ...AccountSortableField[]]
);

export const accountSortInputSchema = z.object({
  field: accountSortableFieldSchema,
  order: sortOrderSchema,
});

export const getAccountsParamsSchema = queryParamsSchema.extend({
  sort: accountSortInputSchema.nullable().optional(),
});

export const accountTypeSchema = z.enum(
  Object.values(AccountType) as [AccountType, ...AccountType[]]
);

export const createAccountInputSchema = z.object({
  name: nonEmptyNameSchema,
  username: z.string().nullable().optional(),
  type: accountTypeSchema,
  ownerId: idSchema,
});

export const updateAccountParamsSchema = z.object({
  id: idSchema,
  input: z.object({
    name: nonEmptyNameSchema.nullable().optional(),
    slug: slugSchema.nullable().optional(),
  }),
});

export const deleteAccountParamsSchema = deleteSchema.extend({
  id: idSchema,
});

export const accountSchema = baseEntitySchema.extend({
  name: nameSchema,
  slug: slugSchema,
  type: accountTypeSchema,
  ownerId: idSchema,
});

export const accountPageSchema = paginatedResponseSchema(accountSchema).transform((data) => ({
  accounts: data.items,
  totalCount: data.totalCount,
  hasNextPage: data.hasNextPage,
}));

export const createComplementaryAccountInputSchema = z.object({
  name: nonEmptyNameSchema,
  username: z.string().nullable().optional(),
});
