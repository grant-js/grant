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
    public readonly errors: z.ZodError['errors'] = []
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

function formatValidationError(error: z.ZodIssue): string {
  const path = error.path.length > 0 ? error.path.join('.') : 'root';
  const field = path === 'root' ? 'data' : path;

  let message = `Field "${field}"`;

  if (error.code === 'invalid_type') {
    message += `: expected ${error.expected}, got ${error.received}`;
    if (error.received === 'undefined') {
      message += ' (missing required field)';
    }
  } else if (error.code === 'invalid_string') {
    if (error.validation === 'email') {
      message += ': invalid email format';
    } else if (error.validation === 'url') {
      message += ': invalid URL format';
    } else if (error.validation === 'uuid') {
      message += ': invalid UUID format';
    } else if (error.validation === 'regex') {
      message += ': failed regex validation';
    } else {
      message += `: ${error.message}`;
    }
  } else if (error.code === 'too_small') {
    if (error.type === 'string') {
      message += `: must be at least ${error.minimum} characters`;
    } else if (error.type === 'number') {
      message += `: must be at least ${error.minimum}`;
    } else if (error.type === 'array') {
      message += `: must have at least ${error.minimum} items`;
    }
  } else if (error.code === 'too_big') {
    if (error.type === 'string') {
      message += `: must be at most ${error.maximum} characters`;
    } else if (error.type === 'number') {
      message += `: must be at most ${error.maximum}`;
    } else if (error.type === 'array') {
      message += `: must have at most ${error.maximum} items`;
    }
  } else if (error.code === 'invalid_enum_value') {
    const options = error.options.join(', ');
    message += `: must be one of [${options}], got "${error.received}"`;
  } else if (error.code === 'unrecognized_keys') {
    message += `: unexpected keys [${error.keys.join(', ')}]`;
  } else if (error.code === 'invalid_date') {
    message += ': invalid date format';
  } else if (error.code === 'invalid_arguments') {
    message += ': invalid function arguments';
  } else if (error.code === 'invalid_return_type') {
    message += ': invalid return type';
  } else if (error.code === 'invalid_union') {
    message += ': none of the union types matched';
  } else if (error.code === 'invalid_intersection_types') {
    message += ': intersection validation failed';
  } else if (error.code === 'not_multiple_of') {
    message += `: must be a multiple of ${error.multipleOf}`;
  } else if (error.code === 'not_finite') {
    message += ': must be a finite number';
  } else if (error.code === 'custom') {
    message += `: ${error.message}`;
  } else {
    message += `: ${error.message}`;
  }

  // Add received value if it's not undefined and not too long
  // Only add for error types that have a 'received' property
  if ('received' in error && error.received !== 'undefined' && error.received !== undefined) {
    const receivedStr = String(error.received);
    if (receivedStr.length < 100) {
      message += ` (received: ${receivedStr})`;
    }
  }

  return message;
}

function validateWithSchema<T extends z.ZodSchema<any>>(
  schema: T,
  data: unknown,
  errorPrefix: string,
  context?: string
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const contextMsg = context ? ` in ${context}` : '';

      // Format each error with detailed information
      const formattedErrors = error.errors.map(formatValidationError);

      // Create a more informative error message
      let errorMessage = `${errorPrefix}${contextMsg}`;

      if (formattedErrors.length === 1) {
        errorMessage += `: ${formattedErrors[0]}`;
      } else {
        errorMessage += `:\n${formattedErrors.map((err, index) => `  ${index + 1}. ${err}`).join('\n')}`;
      }

      // Add data type information if available
      if (data !== null && data !== undefined) {
        const dataType = Array.isArray(data) ? 'array' : typeof data;
        const dataKeys = dataType === 'object' && data !== null ? Object.keys(data) : [];

        if (dataKeys.length > 0) {
          errorMessage += `\n\nData provided: ${dataType} with keys: [${dataKeys.join(', ')}]`;
        } else {
          errorMessage += `\n\nData provided: ${dataType}`;
        }

        // Add sample data for debugging (but limit the size)
        if (dataType === 'object' && data !== null) {
          const sampleData = JSON.stringify(data, null, 2);
          if (sampleData.length < 500) {
            errorMessage += `\n\nSample data:\n${sampleData}`;
          } else {
            errorMessage += `\n\nData too large to display (${sampleData.length} characters)`;
          }
        }
      }

      throw new ValidationError(errorMessage, error.errors);
    }
    throw error;
  }
}

export function validateInput<T extends z.ZodSchema<any>>(
  schema: T,
  data: z.input<T>,
  context?: string
): z.infer<T> {
  return validateWithSchema(schema, data, 'Input validation failed', context);
}

export function validateOutput<T extends z.ZodSchema<any>>(
  schema: T,
  data: unknown,
  context?: string
): z.infer<T> {
  return validateWithSchema(schema, data, 'Output validation failed', context);
}

export function getDetailedValidationErrors(zodError: z.ZodError): string {
  return zodError.errors.map(formatValidationError).join('\n');
}

export function debugValidationError(
  schema: z.ZodSchema<any>,
  data: unknown,
  context?: string
): string {
  try {
    schema.parse(data);
    return 'Validation passed';
  } catch (error) {
    if (error instanceof z.ZodError) {
      const contextMsg = context ? ` in ${context}` : '';
      return `Validation failed${contextMsg}:\n${getDetailedValidationErrors(error)}`;
    }
    return `Unexpected error: ${error}`;
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

// Example usage demonstrating improved error messages:
/*
const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived'])
});

const invalidData = {
  id: null,           // Should be string, got null
  name: "",           // Should be at least 1 character
  description: "Test", // This is valid
  status: "pending"   // Not in enum
};

try {
  validateOutput(projectSchema, invalidData, 'ProjectService.createProject');
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.message);
    // Output will now be much more detailed:
    // "Output validation failed in ProjectService.createProject:
    //   1. Field "id": expected string, got null (received: null)
    //   2. Field "name": must be at least 1 characters (received: "")
    //   3. Field "status": must be one of [active, inactive, archived], got "pending"
    // 
    // Data provided: object with keys: [id, name, description, status]
    // 
    // Sample data:
    // {
    //   "id": null,
    //   "name": "",
    //   "description": "Test",
    //   "status": "pending"
    // }"
  }
}
*/
