import { z } from 'zod';

import {
  STORED_PICTURE_PATH_MAX_LENGTH,
  STORED_PICTURE_URL_MAX_LENGTH,
} from '@/lib/picture-url.lib';

import {
  baseEntitySchema,
  deleteSchema,
  idSchema,
  nameSchema,
  nonEmptyNameSchema,
  queryParamsSchema,
  scopeSchema,
  slugSchema,
  sortOrderSchema,
} from './common/schemas';

const organizationSortableFieldSchema = z.enum(['name', 'slug', 'createdAt', 'updatedAt']);
const organizationSortInputSchema = z.object({
  field: organizationSortableFieldSchema,
  order: sortOrderSchema,
});

export const getOrganizationsParamsSchema = queryParamsSchema.extend({
  sort: organizationSortInputSchema.nullable().optional(),
});

export const createOrganizationInputSchema = z.object({
  name: nonEmptyNameSchema,
});

export const updateOrganizationParamsSchema = z.object({
  id: idSchema,
  input: z.object({
    scope: scopeSchema,
    name: nonEmptyNameSchema.nullable().optional(),
    requireMfaForSensitiveActions: z.boolean().optional(),
  }),
});

export const deleteOrganizationParamsSchema = deleteSchema.extend({
  id: idSchema,
});

export const setOrganizationPictureParamsSchema = z
  .object({
    organizationId: idSchema,
    pictureUrl: z.string().max(STORED_PICTURE_URL_MAX_LENGTH).nullable().optional(),
    picturePath: z.string().max(STORED_PICTURE_PATH_MAX_LENGTH).nullable().optional(),
  })
  .refine(
    (v) => v.pictureUrl !== undefined || v.picturePath !== undefined,
    'At least one of pictureUrl or picturePath must be provided'
  );

export const organizationSchema = baseEntitySchema.extend({
  name: nameSchema,
  slug: slugSchema,
  requireMfaForSensitiveActions: z.boolean(),
  pictureUrl: z.string().max(STORED_PICTURE_URL_MAX_LENGTH).nullable().optional(),
});
