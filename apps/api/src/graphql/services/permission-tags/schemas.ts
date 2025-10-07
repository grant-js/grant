import { z } from 'zod';

import { deleteSchema, idSchema } from '../common/schemas';

export const permissionTagSchema = z.object({
  id: idSchema,
  permissionId: idSchema,
  tagId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

export const getPermissionTagsParamsSchema = z.object({
  permissionId: idSchema,
});

export const addPermissionTagInputSchema = z.object({
  permissionId: idSchema,
  tagId: idSchema,
  isPrimary: z.boolean().nullable().optional(),
});

export const updatePermissionTagInputSchema = z.object({
  permissionId: idSchema,
  tagId: idSchema,
  isPrimary: z.boolean(),
});

export const addPermissionTagParamsSchema = z.object({
  input: addPermissionTagInputSchema,
});

export const removePermissionTagInputSchema = deleteSchema.extend({
  permissionId: idSchema,
  tagId: idSchema,
});

export const removePermissionTagsInputSchema = deleteSchema.extend({
  tagId: idSchema,
});

export const removePermissionTagParamsSchema = z.object({
  input: removePermissionTagInputSchema,
});

export const getPermissionTagIntersectionParamsSchema = z.object({
  permissionIds: idSchema.array(),
  tagIds: idSchema.array(),
});
