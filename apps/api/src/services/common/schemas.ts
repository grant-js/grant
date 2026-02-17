import { TAG_COLORS, TagColor } from '@grantjs/constants';
import { SortOrder, Tenant } from '@grantjs/schema';
import { z } from 'zod';

export const idSchema = z.string().min(1, 'errors.validation.idRequired');
export const emailSchema = z
  .string()
  .email('errors.validation.invalidEmail')
  .min(1, 'errors.validation.emailRequired');
export const nameSchema = z
  .string()
  .min(1, 'errors.validation.nameRequired')
  .max(255, 'errors.validation.nameTooLong');
export const descriptionSchema = z
  .string()
  .max(1000, 'errors.validation.descriptionTooLong')
  .nullable()
  .optional();
export const limitSchema = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return typeof val === 'string' ? parseInt(val, 10) : val;
  })
  .pipe(z.number().int().min(-1).max(100, 'errors.validation.limitRange').optional());

export const pageSchema = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return typeof val === 'string' ? parseInt(val, 10) : val;
  })
  .pipe(z.number().int().min(1, 'errors.validation.pageMin1').optional());
export const searchSchema = z
  .string()
  .nullable()
  .optional()
  .refine(
    (value) => !value || value.trim().length === 0 || value.trim().length >= 2,
    'errors.validation.searchMin2'
  );

export const actionSchema = z
  .string()
  .min(1, 'errors.validation.actionRequired')
  .max(255, 'errors.validation.actionTooLong');

export const tenantSchema = z.enum(Object.values(Tenant) as [Tenant, ...Tenant[]]);

export const scopeSchema = z.object({
  id: idSchema,
  tenant: tenantSchema,
});

export const sortOrderSchema = z.enum(Object.values(SortOrder) as [SortOrder, ...SortOrder[]]);

export const colorSchema = z
  .string()
  .refine((value) => TAG_COLORS.includes(value as TagColor), 'errors.validation.colorInvalid');
export const slugSchema = z
  .string()
  .min(1, 'errors.validation.slugRequired')
  .max(255, 'errors.validation.slugTooLong')
  .regex(/^[a-z0-9-]+$/, 'errors.validation.slugInvalidFormat');

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
  field: z.string().min(1, 'errors.validation.sortFieldRequired'),
  order: sortOrderSchema,
});

export const createInputSchema = z.object({
  input: z.record(z.string(), z.unknown()),
});

export const updateInputSchema = z.object({
  id: idSchema,
  input: z.record(z.string(), z.unknown()),
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

export const deleteSchema = z.object({
  hardDelete: z.boolean().optional(),
});

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    totalCount: z.number().int().min(0),
    hasNextPage: z.boolean(),
  });

export const requestedFieldsSchema = z.array(z.string()).nullable().optional();

export const queryParamsSchema = z.object({
  ids: z.array(idSchema).nullable().optional(),
  limit: limitSchema.nullable().optional(),
  page: pageSchema,
  search: searchSchema,
  tagIds: z.array(idSchema).nullable().optional(),
  requestedFields: requestedFieldsSchema,
});

export const sortableParamsSchema = queryParamsSchema.extend({
  sort: sortSchema.optional(),
});

export const nonEmptyStringRefinement = (value: string) => value.trim().length > 0;
export const nonEmptyStringMessage = 'errors.validation.fieldCannotBeEmpty';

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

export const jsonSchema = z.record(z.string(), z.unknown());

export const metadataSchema = jsonSchema;
