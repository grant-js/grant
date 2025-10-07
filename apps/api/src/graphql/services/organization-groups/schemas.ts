import { z } from 'zod';

import { deleteSchema, idSchema, scopeSchema } from '../common/schemas';

export const queryOrganizationGroupsArgsSchema = z.object({
  scope: scopeSchema,
  organizationId: idSchema.optional(),
  groupId: idSchema.optional(),
});

export const addOrganizationGroupInputSchema = z.object({
  organizationId: idSchema.refine(
    (organizationId) => organizationId.trim().length > 0,
    'Organization ID is required'
  ),
  groupId: idSchema.refine((groupId) => groupId.trim().length > 0, 'Group ID is required'),
});

export const removeOrganizationGroupInputSchema = deleteSchema.extend({
  organizationId: idSchema.refine(
    (organizationId) => organizationId.trim().length > 0,
    'Organization ID is required'
  ),
  groupId: idSchema.refine((groupId) => groupId.trim().length > 0, 'Group ID is required'),
});

export const addOrganizationGroupArgsSchema = z.object({
  input: addOrganizationGroupInputSchema,
});

export const removeOrganizationGroupArgsSchema = z.object({
  input: removeOrganizationGroupInputSchema,
});

export const organizationGroupSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  groupId: idSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
  organization: z.any().nullable().optional(),
  group: z.any().nullable().optional(),
});

export const getOrganizationGroupsParamsSchema = queryOrganizationGroupsArgsSchema.omit({
  scope: true,
});
export const addOrganizationGroupParamsSchema = addOrganizationGroupArgsSchema;
export const removeOrganizationGroupParamsSchema = removeOrganizationGroupArgsSchema;

export type GetOrganizationGroupsParams = z.infer<typeof getOrganizationGroupsParamsSchema>;
export type AddOrganizationGroupParams = z.infer<typeof addOrganizationGroupParamsSchema>;
export type RemoveOrganizationGroupParams = z.infer<typeof removeOrganizationGroupParamsSchema>;
export type OrganizationGroupSchema = z.infer<typeof organizationGroupSchema>;
