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

const publicPageLimitSchema = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return typeof val === 'string' ? parseInt(val, 10) : val;
  })
  .pipe(z.number().int().min(1).max(100, 'errors.validation.limitRange').optional());

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
  limit: publicPageLimitSchema,
});

export const updateOrganizationMemberInputSchema = z.object({
  scope: scopeSchema,
  roleId: idSchema,
});

export const removeOrganizationMemberInputSchema = z.object({
  scope: scopeSchema,
});
