import { z } from 'zod';

import { ProjectSortableField } from '@/graphql/generated/types';

import {
  idSchema,
  nameSchema,
  descriptionSchema,
  slugSchema,
  baseEntitySchema,
  paginatedResponseSchema,
  nonEmptyNameSchema,
  sortOrderSchema,
  queryParamsSchema,
  deleteSchema,
} from '../common/schemas';

export const projectSortableFieldSchema = z.enum(
  Object.values(ProjectSortableField) as [ProjectSortableField, ...ProjectSortableField[]]
);

export const projectSortInputSchema = z.object({
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

export const projectPageSchema = paginatedResponseSchema(projectSchema).transform((data) => ({
  projects: data.items,
  totalCount: data.totalCount,
  hasNextPage: data.hasNextPage,
}));
