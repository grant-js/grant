import { OrganizationInvitationStatus } from '@logusgraphics/grant-schema';
import { z } from 'zod';

import { emailSchema, idSchema } from './common/schemas';

export const createInvitationParamsSchema = z.object({
  organizationId: idSchema,
  email: emailSchema,
  roleId: idSchema,
  token: z.string().min(1),
  expiresAt: z.date(),
  invitedBy: idSchema,
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
});

export const getInvitationsByOrganizationParamsSchema = z.object({
  organizationId: idSchema,
  status: z
    .enum(
      Object.values(OrganizationInvitationStatus) as [
        OrganizationInvitationStatus,
        ...OrganizationInvitationStatus[],
      ]
    )
    .optional(),
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
  acceptedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});
