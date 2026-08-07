import { RoleSortableField } from '@grantjs/schema';
import { z } from 'zod';

import {
  baseEntitySchema,
  deleteSchema,
  descriptionSchema,
  idSchema,
  metadataSchema,
  nameSchema,
  nonEmptyNameSchema,
  queryParamsSchema,
  sortOrderSchema,
} from './common/schemas';
import { groupSchema } from './groups.schemas';
import { tagSchema } from './tags.schemas';

const roleSortableFieldSchema = z.enum(
  Object.values(RoleSortableField) as [RoleSortableField, ...RoleSortableField[]]
);
const roleSortInputSchema = z.object({
  field: roleSortableFieldSchema,
  order: sortOrderSchema,
});

export const createRoleInputSchema = z.object({
  name: nonEmptyNameSchema,
  description: descriptionSchema,
  metadata: metadataSchema.nullable().optional(),
});

const updateRoleInputSchema = z.object({
  name: nonEmptyNameSchema.nullable().optional(),
  description: descriptionSchema.nullable().optional(),
  metadata: metadataSchema.nullable().optional(),
});

export const updateRoleArgsSchema = z.object({
  id: idSchema,
  input: updateRoleInputSchema,
});

export const deleteRoleArgsSchema = deleteSchema.extend({
  id: idSchema,
});

export const roleSchema = baseEntitySchema.extend({
  name: nameSchema,
  description: descriptionSchema,
  metadata: metadataSchema,
  groups: z.array(groupSchema).optional(),
  tags: z.array(tagSchema).optional(),
});

export const getRolesParamsSchema = queryParamsSchema.extend({
  sort: roleSortInputSchema.nullable().optional(),
});
