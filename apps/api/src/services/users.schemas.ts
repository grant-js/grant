import { UserSortableField } from '@grantjs/schema';
import { z } from 'zod';

import {
  STORED_PICTURE_PATH_MAX_LENGTH,
  STORED_PICTURE_URL_MAX_LENGTH,
} from '@/lib/picture-url.lib';

import {
  baseEntitySchema,
  deleteSchema,
  idSchema,
  metadataSchema,
  nameSchema,
  nonEmptyNameSchema,
  queryParamsSchema,
  sortOrderSchema,
} from './common/schemas';

const userSortableFieldSchema = z.enum(
  Object.values(UserSortableField) as [UserSortableField, ...UserSortableField[]]
);
const userSortInputSchema = z.object({
  field: userSortableFieldSchema,
  order: sortOrderSchema,
});

export const createUserInputSchema = z.object({
  name: nonEmptyNameSchema,
  pictureUrl: z.string().max(STORED_PICTURE_URL_MAX_LENGTH).nullable().optional(),
  picturePath: z.string().max(STORED_PICTURE_PATH_MAX_LENGTH).nullable().optional(),
  metadata: metadataSchema.nullable().optional(),
});

const updateUserInputSchema = z.object({
  name: nonEmptyNameSchema.nullable().optional(),
  pictureUrl: z.string().max(STORED_PICTURE_URL_MAX_LENGTH).nullable().optional(),
  picturePath: z.string().max(STORED_PICTURE_PATH_MAX_LENGTH).nullable().optional(),
  metadata: metadataSchema.nullable().optional(),
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
