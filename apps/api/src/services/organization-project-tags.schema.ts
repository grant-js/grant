import { z } from 'zod';

import { deleteSchema, idSchema } from './common/schemas';

export const organizationProjectTagSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  projectId: idSchema,
  tagId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

export const getOrganizationProjectTagsParamsSchema = z.object({
  organizationId: idSchema,
  projectId: idSchema,
});

export const getOrganizationProjectTagsIntersectionSchema = z.object({
  organizationId: idSchema,
  projectIds: z.array(idSchema),
  tagIds: z.array(idSchema),
});

export const addOrganizationProjectTagInputSchema = z.object({
  organizationId: idSchema,
  projectId: idSchema,
  tagId: idSchema,
  isPrimary: z.boolean().nullable().optional(),
});

export const removeOrganizationProjectTagInputSchema = deleteSchema.extend({
  organizationId: idSchema,
  projectId: idSchema,
  tagId: idSchema,
});

export const updateOrganizationProjectTagInputSchema = z.object({
  organizationId: idSchema,
  projectId: idSchema,
  tagId: idSchema,
  isPrimary: z.boolean(),
});
