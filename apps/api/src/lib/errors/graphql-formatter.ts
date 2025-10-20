/**
 * GraphQL error formatter
 *
 * Converts generic API errors to GraphQL-compatible format
 * while preserving all error metadata and context.
 */

import { GraphQLError, GraphQLFormattedError } from 'graphql';

import { ApiError } from './error-classes';

/**
 * Formats errors for GraphQL responses
 * Converts our generic ApiError instances to GraphQL errors
 * while preserving error codes and extensions
 *
 * The formatted error includes:
 * - extensions.code: Error code (e.g., 'UNAUTHENTICATED', 'BAD_USER_INPUT')
 * - extensions.http.status: HTTP status code for REST compatibility
 * - extensions.*: Any additional error metadata
 */
export function formatGraphQLError(
  formattedError: GraphQLFormattedError,
  error: unknown
): GraphQLFormattedError {
  // If the original error is our ApiError, extract its metadata
  if (error instanceof GraphQLError && error.originalError instanceof ApiError) {
    const apiError = error.originalError;

    return {
      ...formattedError,
      message: apiError.message,
      extensions: {
        ...formattedError.extensions,
        code: apiError.code,
        http: {
          status: apiError.statusCode,
        },
        ...apiError.extensions,
      },
    };
  }

  // If it's a direct ApiError (shouldn't happen in GraphQL, but handle it)
  if (error instanceof ApiError) {
    return {
      ...formattedError,
      message: error.message,
      extensions: {
        ...formattedError.extensions,
        code: error.code,
        http: {
          status: error.statusCode,
        },
        ...error.extensions,
      },
    };
  }

  // For all other errors, return as-is
  return formattedError;
}
