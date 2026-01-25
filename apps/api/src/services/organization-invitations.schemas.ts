import { OrganizationInvitationSortableField, OrganizationInvitationStatus } from '@grantjs/schema';
import { z } from 'zod';

import {
  emailSchema,
  idSchema,
  queryParamsSchema,
  requestedFieldsSchema,
  scopeSchema,
  sortOrderSchema,
} from './common/schemas';

export const createInvitationParamsSchema = z.object({
  organizationId: idSchema,
  email: emailSchema,
  roleId: idSchema,
  token: z.string().min(1),
  expiresAt: z.date(),
  invitedBy: idSchema,
  invitedAt: z.date().optional(),
  status: z
    .enum(
      Object.values(OrganizationInvitationStatus) as [
        OrganizationInvitationStatus,
        ...OrganizationInvitationStatus[],
      ]
    )
    .optional(),
});

export const getInvitationByTokenParamsSchema = z.object({
  token: z.string().min(1),
  requestedFields: requestedFieldsSchema,
});

export const organizationInvitationSortableFieldSchema = z.enum(
  Object.values(OrganizationInvitationSortableField) as [
    OrganizationInvitationSortableField,
    ...OrganizationInvitationSortableField[],
  ]
);

export const organizationInvitationSortInputSchema = z.object({
  field: organizationInvitationSortableFieldSchema,
  order: sortOrderSchema,
});

export const getInvitationsByOrganizationParamsSchema = queryParamsSchema.extend({
  scope: scopeSchema,
  status: z
    .enum(
      Object.values(OrganizationInvitationStatus) as [
        OrganizationInvitationStatus,
        ...OrganizationInvitationStatus[],
      ]
    )
    .optional(),
  sort: organizationInvitationSortInputSchema.nullable().optional(),
});

export const checkPendingInvitationParamsSchema = z.object({
  email: emailSchema,
  organizationId: idSchema,
});

export const updateInvitationParamsSchema = z.object({
  id: idSchema,
  status: z
    .enum(
      Object.values(OrganizationInvitationStatus) as [
        OrganizationInvitationStatus,
        ...OrganizationInvitationStatus[],
      ]
    )
    .optional(),
  acceptedAt: z.date().optional(),
  token: z.string().min(1).optional(),
  expiresAt: z.date().optional(),
  invitedAt: z.date().optional(),
});

export const revokeInvitationParamsSchema = z.object({
  id: idSchema,
});

export const organizationInvitationSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  email: emailSchema,
  roleId: idSchema,
  token: z.string(),
  status: z.string(),
  expiresAt: z.date(),
  invitedBy: idSchema,
  invitedAt: z.date(),
  acceptedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  organization: z.any().nullable().optional(),
  role: z.any().nullable().optional(),
  inviter: z.any().nullable().optional(),
});
