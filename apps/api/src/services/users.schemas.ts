import { UserSortableField } from '@grantjs/schema';
import { z } from 'zod';

import {
  baseEntitySchema,
  deleteSchema,
  idSchema,
  metadataSchema,
  nameSchema,
  nonEmptyNameSchema,
  paginatedResponseSchema,
  queryParamsSchema,
  sortOrderSchema,
} from './common/schemas';

export const userSortableFieldSchema = z.enum(
  Object.values(UserSortableField) as [UserSortableField, ...UserSortableField[]]
);
export const userSortInputSchema = z.object({
  field: userSortableFieldSchema,
  order: sortOrderSchema,
});

export const createUserInputSchema = z.object({
  name: nonEmptyNameSchema,
  metadata: metadataSchema.nullable().optional(),
});

export const updateUserInputSchema = z.object({
  name: nonEmptyNameSchema.nullable().optional(),
  pictureUrl: z.string().max(500).nullable().optional(),
  metadata: metadataSchema.nullable().optional(),
});

export const createUserArgsSchema = z.object({
  input: createUserInputSchema,
});

export const updateUserArgsSchema = z.object({
  id: idSchema,
  input: updateUserInputSchema,
});

export const deleteUserArgsSchema = deleteSchema.extend({
  id: idSchema,
});

export const queryUsersArgsSchema = queryParamsSchema.extend({
  sort: userSortInputSchema.nullable().optional(),
});

export const userSchema = baseEntitySchema.extend({
  name: nameSchema,
  metadata: metadataSchema,
  roles: z.array(z.any()).nullable().optional(),
  tags: z.array(z.any()).nullable().optional(),
});

export const userPageSchema = paginatedResponseSchema(userSchema).transform((data) => ({
  users: data.items,
  hasNextPage: data.hasNextPage,
  totalCount: data.totalCount,
}));
