import { OrganizationInvitationStatus, OrganizationMemberSortableField } from '@grantjs/schema';
import { z } from 'zod';

import { idSchema, queryParamsSchema, scopeSchema, sortOrderSchema } from './common/schemas';

const organizationMemberSortableFieldSchema = z.enum(
  Object.values(OrganizationMemberSortableField) as [
    OrganizationMemberSortableField,
    ...OrganizationMemberSortableField[],
  ]
);

const organizationMemberSortInputSchema = z.object({
  field: organizationMemberSortableFieldSchema,
  order: sortOrderSchema,
});

export const getOrganizationMembersParamsSchema = queryParamsSchema.extend({
  scope: scopeSchema,
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

export const updateOrganizationMemberInputSchema = z.object({
  scope: scopeSchema,
  roleId: idSchema,
});

export const removeOrganizationMemberInputSchema = z.object({
  scope: scopeSchema,
});
