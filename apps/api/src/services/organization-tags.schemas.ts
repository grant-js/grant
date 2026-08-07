import { z } from 'zod';

import { deleteSchema, idSchema } from './common/schemas';

export const organizationTagSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  tagId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

export const getOrganizationTagsParamsSchema = z.object({
  organizationId: idSchema,
});

export const addOrganizationTagInputSchema = z.object({
  organizationId: idSchema,
  tagId: idSchema,
});

export const removeOrganizationTagInputSchema = deleteSchema.extend({
  organizationId: idSchema,
  tagId: idSchema,
});
