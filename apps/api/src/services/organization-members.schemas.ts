import {
  OrganizationInvitationStatus,
  OrganizationMemberSortableField,
} from '@logusgraphics/grant-schema';
import { z } from 'zod';

import { idSchema, queryParamsSchema, sortOrderSchema } from './common/schemas';

export const organizationMemberSortableFieldSchema = z.enum(
  Object.values(OrganizationMemberSortableField) as [
    OrganizationMemberSortableField,
    ...OrganizationMemberSortableField[],
  ]
);

export const organizationMemberSortInputSchema = z.object({
  field: organizationMemberSortableFieldSchema,
  order: sortOrderSchema,
});

export const getOrganizationMembersParamsSchema = queryParamsSchema.extend({
  organizationId: idSchema,
  status: z
    .enum(
      Object.values(OrganizationInvitationStatus) as [
        OrganizationInvitationStatus,
        ...OrganizationInvitationStatus[],
      ]
    )
    .optional(),
  sort: organizationMemberSortInputSchema.nullable().optional(),
});

export const organizationMemberSchema = z.object({
  id: idSchema,
  name: z.string(),
  email: z.string().nullable().optional(),
  type: z.enum(['MEMBER', 'INVITATION']),
  role: z.any().nullable().optional(),
  status: z.string().nullable().optional(),
  user: z.any().nullable().optional(),
  invitation: z.any().nullable().optional(),
  createdAt: z.date(),
});

export const organizationMemberPageSchema = z.object({
  members: z.array(organizationMemberSchema),
  totalCount: z.number(),
  hasNextPage: z.boolean(),
});

export const updateOrganizationMemberInputSchema = z.object({
  roleId: idSchema,
});

export const removeOrganizationMemberInputSchema = z.object({
  organizationId: idSchema,
  userId: idSchema,
});
