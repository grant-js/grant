import { z } from 'zod';

import { ValidationError as ApiValidationError } from '@/lib/errors';

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

function formatValidationError(error: z.ZodIssue): string {
  const path = error.path.length > 0 ? error.path.join('.') : 'root';
  const field = path === 'root' ? 'data' : path;

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

    throw new ApiValidationError(
      `Input validation failed in ${context}:\n${errorMessages}\n\nData provided: ${getDataSummary(data)}\n\nSample data:\n${getSampleData(data)}`,
      result.error.issues.map((err) => formatValidationError(err))
    );
  }

  return result.data;
}

/**
 * Validates a list result against a paginated schema.
 *
 * Repositories return `{ <entityPlural>, totalCount, hasNextPage }` while the
 * paginated schemas expect `items`, so every list method used to build a
 * throwaway object purely to hand it to `validateOutput` and then return the
 * original. That reshaping is the only reason the object exists, so it belongs
 * here rather than repeated at each call site.
 *
 * Returns nothing: callers return the repository result, not the validated
 * projection.
 */
export function validatePage(
  schema: z.ZodSchema<unknown>,
  items: readonly unknown[],
  page: { totalCount: number; hasNextPage: boolean },
  context: string
): void {
  validateOutput(
    schema,
    { items, totalCount: page.totalCount, hasNextPage: page.hasNextPage },
    context
  );
}

export function validateOutput<T>(schema: z.ZodSchema<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((err, index) => `  ${index + 1}. ${formatValidationError(err)}`)
      .join('\n');

    throw new ApiValidationError(
      `Output validation failed in ${context}:\n${errorMessages}\n\nData provided: ${getDataSummary(data)}\n\nSample data:\n${getSampleData(data)}`,
      result.error.issues.map((err) => formatValidationError(err))
    );
  }

  return result.data;
}
