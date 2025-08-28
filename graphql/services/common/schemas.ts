import { z } from 'zod';

import { SortOrder, Tenant } from '@/graphql/generated/types';
import { TAG_COLORS, TagColor } from '@/lib/constants/colors';

export const idSchema = z.string().min(1, 'ID is required');
export const emailSchema = z.string().email('Invalid email format').min(1, 'Email is required');
export const nameSchema = z.string().min(1, 'Name is required').max(255, 'Name too long');
export const descriptionSchema = z.string().max(1000, 'Description too long').optional();
export const limitSchema = z.number().int().min(-1).max(100, 'Limit must be between -1 and 100');
export const pageSchema = z.number().int().min(1, 'Page must be at least 1').optional();
export const searchSchema = z
  .string()
  .optional()
  .refine(
    (value) => !value || value.trim().length === 0 || value.trim().length >= 2,
    'Search term must be at least 2 characters'
  );

export const actionSchema = z.string().min(1, 'Action is required').max(255, 'Action too long');

export const tenantSchema = z.enum(Object.values(Tenant) as [string, ...string[]]);

export const scopeSchema = z.object({
  id: idSchema,
  tenant: tenantSchema,
});

export const sortOrderSchema = z.enum(Object.values(SortOrder) as [string, ...string[]]);

export const colorSchema = z
  .string()
  .refine(
    (value) => TAG_COLORS.includes(value as TagColor),
    'Invalid tag color. Must be one of the predefined colors.'
  );
export const slugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(255, 'Slug too long')
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens');

export const createdAtSchema = z.date();
export const updatedAtSchema = z.date();
export const deletedAtSchema = z.date().nullable().optional();

export const entityIdSchema = z.object({
  id: idSchema,
});

export const paginationSchema = z.object({
  limit: limitSchema.optional(),
  page: pageSchema,
});

export const searchFilterSchema = z.object({
  search: searchSchema,
  limit: limitSchema.optional(),
  page: pageSchema,
});

export const sortSchema = z.object({
  field: z.string().min(1, 'Sort field is required'),
  order: sortOrderSchema,
});

export const createInputSchema = z.object({
  input: z.record(z.unknown()),
});

export const updateInputSchema = z.object({
  id: idSchema,
  input: z.record(z.unknown()),
});

export const deleteInputSchema = z.object({
  id: idSchema,
});

export const baseEntitySchema = z.object({
  id: idSchema,
  createdAt: createdAtSchema,
  updatedAt: updatedAtSchema,
  deletedAt: deletedAtSchema,
});

export const namedEntitySchema = baseEntitySchema.extend({
  name: nameSchema,
  description: descriptionSchema,
});

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    totalCount: z.number().int().min(0),
    hasNextPage: z.boolean(),
  });

export const crudParamsSchema = z.object({
  ids: z.array(idSchema).optional(),
  limit: limitSchema.optional(),
  page: pageSchema,
  search: searchSchema,
  requestedFields: z.array(z.string()).optional(),
});

export const sortableParamsSchema = crudParamsSchema.extend({
  sort: sortSchema.optional(),
});

export const nonEmptyStringRefinement = (value: string) => value.trim().length > 0;
export const nonEmptyStringMessage = 'Field cannot be empty';

export const nonEmptyNameSchema = nameSchema.refine(
  nonEmptyStringRefinement,
  nonEmptyStringMessage
);
export const nonEmptyEmailSchema = emailSchema.refine(
  nonEmptyStringRefinement,
  nonEmptyStringMessage
);
export const nonEmptyActionSchema = actionSchema.refine(
  nonEmptyStringRefinement,
  nonEmptyStringMessage
);
