import { ProjectSortableField } from '@grantjs/schema';
import { z } from 'zod';

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
    scope: scopeSchema,
  }),
});

export const deleteProjectParamsSchema = deleteSchema.extend({
  id: idSchema,
});

export const projectSchema = baseEntitySchema.extend({
  name: nameSchema,
  slug: slugSchema,
  description: descriptionSchema.nullable().optional(),
  tags: z.array(z.any()).nullable().optional(),
});
