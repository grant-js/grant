import { z } from 'zod';

export const addAccountRoleInputSchema = z.object({
  accountId: z.uuid(),
  roleId: z.uuid(),
});

export const removeAccountRoleInputSchema = z.object({
  accountId: z.uuid(),
  roleId: z.uuid(),
  hardDelete: z.boolean().optional(),
});

export const getAccountRolesParamsSchema = z.object({
  accountId: z.uuid(),
});

export const accountRoleSchema = z.object({
  id: z.uuid(),
  accountId: z.uuid(),
  roleId: z.uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});
