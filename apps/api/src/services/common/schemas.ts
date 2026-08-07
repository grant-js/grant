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
const limitSchema = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return typeof val === 'string' ? parseInt(val, 10) : val;
  })
  .pipe(z.number().int().min(-1).max(100, 'errors.validation.limitRange').optional());

const pageSchema = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return typeof val === 'string' ? parseInt(val, 10) : val;
  })
  .pipe(z.number().int().min(1, 'errors.validation.pageMin1').optional());
const searchSchema = z
  .string()
  .nullable()
  .optional()
  .refine(
    (value) => !value || value.trim().length === 0 || value.trim().length >= 2,
    'errors.validation.searchMin2'
  );

/** Action slug: lowercase, trimmed, letters, digits, hyphen, plus only (no spaces). */
const ACTION_SLUG_REGEX = /^[a-z0-9+-]+$/;

export const actionSchema = z
  .string()
  .min(1, 'errors.validation.actionRequired')
  .max(255, 'errors.validation.actionTooLong')
  .transform((val) => val.trim().toLowerCase())
  .pipe(z.string().regex(ACTION_SLUG_REGEX, 'errors.validation.actionInvalidFormat'));

const tenantSchema = z.enum(Object.values(Tenant) as [Tenant, ...Tenant[]]);

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

const createdAtSchema = z.date();
const updatedAtSchema = z.date();
const deletedAtSchema = z.date().nullable().optional();

const sortSchema = z.object({
  field: z.string().min(1, 'errors.validation.sortFieldRequired'),
  order: sortOrderSchema,
});

export const baseEntitySchema = z.object({
  id: idSchema,
  createdAt: createdAtSchema,
  updatedAt: updatedAtSchema,
  deletedAt: deletedAtSchema,
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
export const nonEmptyActionSchema = actionSchema.refine(
  nonEmptyStringRefinement,
  nonEmptyStringMessage
);

export const jsonSchema = z.record(z.string(), z.unknown());

export const metadataSchema = jsonSchema;
