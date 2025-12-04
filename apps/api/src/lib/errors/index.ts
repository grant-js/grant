/**
 * Error handling system for REST and GraphQL APIs
 *
 * This module provides a unified error handling system that works seamlessly
 * with both REST and GraphQL endpoints. All errors extend the base Error class
 * and include HTTP status codes, error codes, and optional metadata.
 *
 * @example
 * ```typescript
 * import { AuthenticationError, NotFoundError } from '@/lib/errors';
 *
 * // Throw an authentication error
 * throw new AuthenticationError('User not authenticated');
 *
 * // Throw a not found error
 * throw new NotFoundError('Resource not found');
 * ```
 */

// Export error classes
export {
  ApiError,
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  ConfigurationError,
  ConflictError,
  NotFoundError,
  ValidationError,
  type ErrorOptions,
} from './error-classes';

// Export GraphQL formatters
export { formatGraphQLError } from './graphql-formatter';
