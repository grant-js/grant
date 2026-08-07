import { ProjectAppSortableField } from '@grantjs/schema';
import { z } from 'zod';

import {
  baseEntitySchema,
  deleteSchema,
  idSchema,
  nameSchema,
  queryParamsSchema,
  sortOrderSchema,
} from './common/schemas';

const redirectUriSchema = z
  .string()
  .min(1, 'errors.validation.redirectUriRequired')
  .url('errors.validation.redirectUriInvalid');

const redirectUrisCreateSchema = z
  .array(redirectUriSchema)
  .min(1, 'errors.validation.redirectUrisMinOne');

const redirectUrisUpdateSchema = z
  .array(redirectUriSchema)
  .min(1, 'errors.validation.redirectUrisMinOne')
  .optional();

const projectAppSortableFieldSchema = z.enum(
  Object.values(ProjectAppSortableField) as [ProjectAppSortableField, ...ProjectAppSortableField[]]
);

const projectAppSortInputSchema = z.object({
  field: projectAppSortableFieldSchema,
  order: sortOrderSchema,
});

export const getProjectAppsParamsSchema = queryParamsSchema.extend({
  projectId: idSchema,
  sort: projectAppSortInputSchema.nullable().optional(),
});

export const createProjectAppParamsSchema = z.object({
  projectId: idSchema,
  name: nameSchema.nullable().optional(),
  redirectUris: redirectUrisCreateSchema,
  scopes: z.array(z.string()).nullable().optional(),
  enabledProviders: z.array(z.string()).nullable().optional(),
  allowSignUp: z.boolean().optional(),
  signUpRoleId: z.string().uuid().nullable().optional(),
  tagIds: z.array(idSchema).nullable().optional(),
  primaryTagId: z
    .union([idSchema, z.literal(''), z.null()])
    .nullable()
    .optional()
    .transform((val) => (val === '' ? null : val)),
});

/** Matches what the handler passes: id, projectId, and flat update fields (scope/tag sync done in handler). */
export const updateProjectAppParamsSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  name: nameSchema.nullable().optional(),
  redirectUris: redirectUrisUpdateSchema,
  scopes: z.array(z.string()).nullable().optional(),
  enabledProviders: z.array(z.string()).nullable().optional(),
  allowSignUp: z.boolean().optional(),
  signUpRoleId: z.string().uuid().nullable().optional(),
});

export const deleteProjectAppParamsSchema = deleteSchema.extend({
  id: idSchema,
  projectId: idSchema,
});

export const projectAppSchema = baseEntitySchema.extend({
  projectId: idSchema,
  clientId: z.string().min(1),
  name: nameSchema.nullable(),
  redirectUris: z.array(z.string()),
  scopes: z.array(z.string()).nullable(),
  enabledProviders: z.array(z.string()).nullable().optional(),
  allowSignUp: z.boolean().optional(),
  signUpRoleId: z.string().nullable().optional(),
});

export const createProjectAppResultSchema = z.object({
  id: idSchema,
  clientId: z.string().min(1),
  clientSecret: z.string().nullable().optional(),
  name: nameSchema.nullable().optional(),
  redirectUris: z.array(z.string()),
  allowSignUp: z.boolean().optional(),
  signUpRoleId: z.string().nullable().optional(),
  createdAt: z.date(),
});
