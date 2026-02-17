import { z } from 'zod';

export function createDynamicEntitySchema<T extends z.ZodObject<any>>(
  baseSchema: T,
  requestedFields?: string[]
): z.ZodType<any> {
  if (!requestedFields || requestedFields.length === 0) {
    return baseSchema;
  }

  const dynamicFields: Record<string, z.ZodTypeAny> = {
    id: z.string().min(1, 'errors.validation.idRequired'),
  };

  requestedFields.forEach((field) => {
    if (field in baseSchema.shape) {
      dynamicFields[field] = baseSchema.shape[field];
    }
  });

  return z.object(dynamicFields);
}

export function createDynamicPaginatedSchema<T extends z.ZodObject<any>>(
  itemSchema: T,
  requestedFields?: string[]
): z.ZodType<any> {
  const dynamicItemSchema = createDynamicEntitySchema(itemSchema, requestedFields);

  return z.object({
    items: z.array(dynamicItemSchema),
    totalCount: z.number().int().min(0),
    hasNextPage: z.boolean(),
  });
}

export function createDynamicSingleSchema<T extends z.ZodObject<any>>(
  baseSchema: T,
  requestedFields?: string[]
): z.ZodType<any> {
  if (!requestedFields || requestedFields.length === 0) {
    const allFields = Object.keys(baseSchema.shape);
    return createDynamicEntitySchema(baseSchema, allFields);
  }

  return createDynamicEntitySchema(baseSchema, requestedFields);
}

export function withFieldSelection<T extends z.ZodObject<any>>(
  baseSchema: T,
  requestedFields?: string[]
): z.ZodType<any> {
  return createDynamicEntitySchema(baseSchema, requestedFields);
}
