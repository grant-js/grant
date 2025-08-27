import { z } from 'zod';

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: z.ZodError['errors'] = []
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T {
  try {
    return schema.parse(data);
  } catch (error) {
    console.log('VALIDATE INPUT ERROR', error);
    if (error instanceof z.ZodError) {
      const contextMsg = context ? ` in ${context}` : '';
      throw new ValidationError(
        `Validation failed${contextMsg}: ${error.errors.map((e) => e.message).join(', ')}`,
        error.errors
      );
    }
    throw error;
  }
}

export function validateOutput<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const contextMsg = context ? ` in ${context}` : '';
      throw new ValidationError(
        `Output validation failed${contextMsg}: ${error.errors.map((e) => e.message).join(', ')}`,
        error.errors
      );
    }
    throw error;
  }
}

export function safeValidateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError['errors'] } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors };
    }
    throw error;
  }
}

export function safeValidateOutput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError['errors'] } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors };
    }
    throw error;
  }
}
