import { z } from 'zod';

import { AccountSortableField, AccountType } from '@/graphql/generated/types';

import {
  idSchema,
  nameSchema,
  slugSchema,
  baseEntitySchema,
  paginatedResponseSchema,
  nonEmptyNameSchema,
  sortOrderSchema,
  queryParamsSchema,
  deleteSchema,
} from '../common/schemas';

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
  type: accountTypeSchema,
  ownerId: idSchema,
});

export const updateAccountParamsSchema = z.object({
  id: idSchema,
  input: z.object({
    name: nonEmptyNameSchema.nullable().optional(),
    type: accountTypeSchema.nullable().optional(),
  }),
});

export const deleteAccountParamsSchema = deleteSchema.extend({
  id: idSchema,
});

export const accountSchema = baseEntitySchema.extend({
  name: nameSchema,
  slug: slugSchema,
  type: accountTypeSchema,
});

export const accountPageSchema = paginatedResponseSchema(accountSchema).transform((data) => ({
  accounts: data.items,
  totalCount: data.totalCount,
  hasNextPage: data.hasNextPage,
}));
