import { ProjectSortableField } from '@grantjs/schema';
import { z } from 'zod';

import { PRIMARY_COLOR_HEX_PATTERN } from '@/lib/oauth-branding.lib';
import {
  STORED_PICTURE_PATH_MAX_LENGTH,
  STORED_PICTURE_URL_MAX_LENGTH,
} from '@/lib/picture-url.lib';

import {
  baseEntitySchema,
  deleteSchema,
  descriptionSchema,
  idSchema,
  nameSchema,
  nonEmptyNameSchema,
  queryParamsSchema,
  scopeSchema,
  slugSchema,
  sortOrderSchema,
} from './common/schemas';

const primaryColorSchema = z
  .string()
  .regex(PRIMARY_COLOR_HEX_PATTERN, 'errors.validation.primaryColorInvalid')
  .nullable()
  .optional();

const projectSortableFieldSchema = z.enum(
  Object.values(ProjectSortableField) as [ProjectSortableField, ...ProjectSortableField[]]
);

const projectSortInputSchema = z.object({
  field: projectSortableFieldSchema,
  order: sortOrderSchema,
});

export const getProjectsParamsSchema = queryParamsSchema.extend({
  sort: projectSortInputSchema.nullable().optional(),
});

export const createProjectParamsSchema = z.object({
  name: nonEmptyNameSchema,
  description: descriptionSchema,
});

export const updateProjectParamsSchema = z.object({
  id: idSchema,
  input: z.object({
    name: nonEmptyNameSchema.nullable().optional(),
    description: descriptionSchema,
    primaryColor: primaryColorSchema,
    showHelpPanel: z.boolean().nullable().optional(),
    scope: scopeSchema,
  }),
});

export const setProjectPictureParamsSchema = z
  .object({
    projectId: idSchema,
    pictureUrl: z.string().max(STORED_PICTURE_URL_MAX_LENGTH).nullable().optional(),
    picturePath: z.string().max(STORED_PICTURE_PATH_MAX_LENGTH).nullable().optional(),
  })
  .refine(
    (v) => v.pictureUrl !== undefined || v.picturePath !== undefined,
    'At least one of pictureUrl or picturePath must be provided'
  );

export const deleteProjectParamsSchema = deleteSchema.extend({
  id: idSchema,
});

export const projectSchema = baseEntitySchema.extend({
  name: nameSchema,
  slug: slugSchema,
  description: descriptionSchema.nullable().optional(),
  pictureUrl: z.string().nullable().optional(),
  primaryColor: z.string().nullable().optional(),
  showHelpPanel: z.boolean().nullable().optional(),
  tags: z.array(z.any()).nullable().optional(),
});
