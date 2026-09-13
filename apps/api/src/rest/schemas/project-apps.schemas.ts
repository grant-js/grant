import { PROJECT_OAUTH_THEME_MODES, Tenant } from '@grantjs/schema';

import { z } from '@/lib/zod-openapi.lib';
import {
  createSuccessResponseSchema,
  listQuerySchema,
  scopeSchema,
} from '@/rest/schemas/common.schemas';

/** Scope tenant for project apps: accountProject or organizationProject only. */
const projectAppScopeTenantSchema = z.enum([Tenant.AccountProject, Tenant.OrganizationProject] as [
  Tenant,
  ...Tenant[],
]);

/** Scope for project-app operations (id + tenant restricted to project scopes). */
const projectAppScopeSchema = scopeSchema.extend({
  tenant: projectAppScopeTenantSchema,
});

export const projectAppSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  clientId: z.string().uuid(),
  name: z.string().nullable(),
  pictureUrl: z.string().nullable().optional(),
  primaryColor: z.string().nullable().optional(),
  showHelpPanel: z.boolean().nullable().optional(),
  themeMode: z.enum(PROJECT_OAUTH_THEME_MODES).nullable().optional(),
  redirectUris: z.array(z.string().url()),
  scopes: z.array(z.string()).optional(),
  enabledProviders: z.array(z.string()).optional(),
  allowSignUp: z.boolean().optional(),
  signUpRoleId: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const projectAppPageSchema = z.object({
  projectApps: z.array(projectAppSchema),
  totalCount: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
});

export const getProjectAppsQuerySchema = listQuerySchema.omit({ relations: true }).extend({
  scopeId: z.string().min(1, 'errors.validation.scopeIdRequired'),
  tenant: projectAppScopeTenantSchema,
  ids: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => {
      if (typeof val === 'string') {
        return val.split(',').map((v) => v.trim());
      }
      return val;
    })
    .optional(),
});

export const createProjectAppRequestSchema = z.object({
  scope: projectAppScopeSchema,
  name: z.string().max(255).optional(),
  redirectUris: z.array(z.string().url()).min(1, 'errors.validation.redirectUrisMinOne'),
  scopes: z.array(z.string()).optional(),
  enabledProviders: z.array(z.string()).optional(),
  allowSignUp: z.boolean().optional(),
  signUpRoleId: z.string().uuid().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().uuid().nullable().optional(),
});

export const updateProjectAppRequestSchema = z.object({
  scope: projectAppScopeSchema,
  name: z.string().max(255).optional(),
  redirectUris: z.array(z.string().url()).optional(),
  scopes: z.array(z.string()).optional(),
  enabledProviders: z.array(z.string()).optional(),
  allowSignUp: z.boolean().optional(),
  signUpRoleId: z.string().uuid().nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
  showHelpPanel: z.boolean().nullable().optional(),
  themeMode: z.enum(PROJECT_OAUTH_THEME_MODES).nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().uuid().nullable().optional(),
});

export const deleteProjectAppQuerySchema = z.object({
  scopeId: z.string().min(1, 'errors.validation.scopeIdRequired'),
  tenant: projectAppScopeTenantSchema,
});

export const projectAppIdParamsSchema = z.object({
  id: z.string().uuid('errors.validation.invalidProjectAppId'),
});

export const createProjectAppResponseSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  clientSecret: z.string().optional(),
  name: z.string().nullable(),
  redirectUris: z.array(z.string().url()),
  allowSignUp: z.boolean().optional(),
  signUpRoleId: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
});

export const getProjectAppsResponseSchema = createSuccessResponseSchema(projectAppPageSchema);
export const updateProjectAppResponseSchema = createSuccessResponseSchema(projectAppSchema);
export const deleteProjectAppResponseSchema = createSuccessResponseSchema(projectAppSchema);

export const uploadProjectAppPictureRequestSchema = z.object({
  scope: projectAppScopeSchema,
  file: z.string().min(1, 'errors.validation.fileRequired'),
  filename: z.string().min(1, 'errors.validation.filenameRequired'),
  contentType: z.string().min(1, 'errors.validation.contentTypeRequired'),
});

export const uploadProjectAppPictureResponseSchema = createSuccessResponseSchema(
  z.object({
    url: z.string(),
    path: z.string(),
  }),
  'Successfully uploaded project-app picture'
);

export const requestProjectAppPictureUploadUrlRequestSchema = z.object({
  scope: projectAppScopeSchema,
  filename: z.string().min(1, 'errors.validation.filenameRequired'),
  contentType: z.string().min(1, 'errors.validation.contentTypeRequired'),
  contentLength: z.number().int().positive(),
});

export const requestProjectAppPictureUploadUrlResponseSchema = createSuccessResponseSchema(
  z.object({
    url: z.string(),
    method: z.string(),
    headers: z.array(z.object({ name: z.string(), value: z.string() })),
    expiresAt: z.string(),
  }),
  'Direct-upload URL issued for a project-app picture'
);

export const confirmProjectAppPictureUploadRequestSchema = z.object({
  scope: projectAppScopeSchema,
  filename: z.string().min(1, 'errors.validation.filenameRequired'),
});

export const clearProjectAppPictureRequestSchema = z.object({
  scope: projectAppScopeSchema,
});
