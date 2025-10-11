import { z } from 'zod';

/**
 * Enhanced validation utilities with detailed error reporting
 *
 * This module provides comprehensive validation error messages that include:
 * - Field paths (e.g., "user.profile.email")
 * - Expected vs received types and values
 * - Specific validation rule violations
 * - Sample data for debugging
 * - Context information about where validation failed
 *
 * Example improved error message:
 * "Output validation failed in ProjectService.getProjects:
 *   1. Field "id": expected string, got undefined (missing required field)
 *   2. Field "name": must be at least 1 characters (received: "")
 *
 * Data provided: object with keys: [id, name, description]
 *
 * Sample data:
 * {
 *   "id": null,
 *   "name": "",
 *   "description": "Test project"
 * }"
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: z.ZodError['issues'] = []
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

function formatValidationError(error: z.ZodIssue): string {
  const path = error.path.length > 0 ? error.path.join('.') : 'root';
  const field = path === 'root' ? 'data' : path;

  // Use any cast for Zod v4 compatibility
  const err = error as any;

  const message = `Field "${field}": ${error.message}`;

  return message;
}

function getSampleData(data: unknown): string {
  try {
    if (data === null || data === undefined) {
      return String(data);
    }

    if (typeof data === 'object') {
      const sample = JSON.stringify(data, null, 2);
      if (sample.length > 500) {
        return sample.substring(0, 500) + '... (truncated)';
      }
      return sample;
    }

    return String(data);
  } catch {
    return '(unable to serialize data)';
  }
}

function getDataSummary(data: unknown): string {
  if (data === null) return 'null';
  if (data === undefined) return 'undefined';

  const type = typeof data;
  if (type !== 'object') {
    return type;
  }

  if (Array.isArray(data)) {
    return `array with ${data.length} items`;
  }

  const keys = Object.keys(data);
  return `object with keys: [${keys.slice(0, 10).join(', ')}${keys.length > 10 ? '...' : ''}]`;
}

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((err, index) => `  ${index + 1}. ${formatValidationError(err)}`)
      .join('\n');

    throw new ValidationError(
      `Input validation failed in ${context}:\n${errorMessages}\n\nData provided: ${getDataSummary(data)}\n\nSample data:\n${getSampleData(data)}`,
      result.error.issues
    );
  }

  return result.data;
}

export function validateOutput<T>(schema: z.ZodSchema<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((err, index) => `  ${index + 1}. ${formatValidationError(err)}`)
      .join('\n');

    throw new ValidationError(
      `Output validation failed in ${context}:\n${errorMessages}\n\nData provided: ${getDataSummary(data)}\n\nSample data:\n${getSampleData(data)}`,
      result.error.issues
    );
  }

  return result.data;
}

export function safeValidateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): { success: true; data: T } | { success: false; error: ValidationError } {
  try {
    const validData = validateInput(schema, data, context);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error };
    }
    throw error;
  }
}

export function safeValidateOutput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): { success: true; data: T } | { success: false; error: ValidationError } {
  try {
    const validData = validateOutput(schema, data, context);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error };
    }
    throw error;
  }
}
