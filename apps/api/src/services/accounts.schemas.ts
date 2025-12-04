import { AccountSortableField, AccountType } from '@logusgraphics/grant-schema';
import { z } from 'zod';

import {
  baseEntitySchema,
  deleteSchema,
  idSchema,
  paginatedResponseSchema,
  queryParamsSchema,
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
  type: accountTypeSchema,
  ownerId: idSchema,
});

export const deleteAccountParamsSchema = deleteSchema.extend({
  id: idSchema,
});

export const accountSchema = baseEntitySchema.extend({
  type: accountTypeSchema,
  ownerId: idSchema,
});

export const accountPageSchema = paginatedResponseSchema(accountSchema).transform((data) => ({
  accounts: data.items,
  totalCount: data.totalCount,
  hasNextPage: data.hasNextPage,
}));
