import { AccountSortableField, AccountType } from '@grantjs/schema';
import { z } from 'zod';

import {
  baseEntitySchema,
  deleteSchema,
  idSchema,
  queryParamsSchema,
  sortOrderSchema,
} from './common/schemas';

const accountSortableFieldSchema = z.enum(
  Object.values(AccountSortableField) as [AccountSortableField, ...AccountSortableField[]]
);

const accountSortInputSchema = z.object({
  field: accountSortableFieldSchema,
  order: sortOrderSchema,
});

const accountTypeSchema = z.enum(Object.values(AccountType) as [AccountType, ...AccountType[]]);

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

export const queryAccountsInputSchema = queryParamsSchema.extend({
  sort: accountSortInputSchema.nullable().optional(),
});
