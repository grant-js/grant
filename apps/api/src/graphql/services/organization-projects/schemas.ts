import { z } from 'zod';

import { deleteSchema, idSchema } from '../common/schemas';

export const queryOrganizationProjectsArgsSchema = z.object({
  organizationId: idSchema,
});

export const queryOrganizationProjectArgsSchema = z.object({
  projectId: idSchema,
});

export const addOrganizationProjectInputSchema = z.object({
  organizationId: idSchema.refine(
    (organizationId) => organizationId.trim().length > 0,
    'Organization ID is required'
  ),
  projectId: idSchema.refine((projectId) => projectId.trim().length > 0, 'Project ID is required'),
});

export const removeOrganizationProjectInputSchema = deleteSchema.extend({
  organizationId: idSchema.refine(
    (organizationId) => organizationId.trim().length > 0,
    'Organization ID is required'
  ),
  projectId: idSchema.refine((projectId) => projectId.trim().length > 0, 'Project ID is required'),
});

export const addOrganizationProjectArgsSchema = addOrganizationProjectInputSchema;

export const removeOrganizationProjectArgsSchema = z.object({
  input: removeOrganizationProjectInputSchema,
});

export const organizationProjectSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  projectId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
  organization: z.any().nullable().optional(),
  project: z.any().nullable().optional(),
});
