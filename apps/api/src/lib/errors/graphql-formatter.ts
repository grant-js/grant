/**
 * GraphQL error formatter
 *
 * Converts domain GrantException instances to GraphQL-compatible format
 * by mapping through the HTTP error layer for status codes and i18n keys.
 */

import { GrantException } from '@grantjs/core';
import { HttpException, mapDomainToHttp } from '@grantjs/errors';
import { GraphQLError, GraphQLFormattedError } from 'graphql';

function formatFromHttpException(
  formattedError: GraphQLFormattedError,
  httpError: HttpException
): GraphQLFormattedError {
  return {
    ...formattedError,
    message: httpError.message,
    extensions: {
      ...formattedError.extensions,
      code: httpError.code,
      translationKey: httpError.translationKey,
      translationParams: httpError.translationParams,
      http: {
        status: httpError.statusCode,
      },
      ...httpError.extensions,
    },
  };
}

/**
 * Formats errors for GraphQL responses.
 *
 * Catches domain GrantException instances, maps them through mapDomainToHttp()
 * to produce HTTP-aware metadata, and returns a GraphQL-formatted error.
 */
export function formatGraphQLError(
  formattedError: GraphQLFormattedError,
  error: unknown
): GraphQLFormattedError {
  // Domain error wrapped in GraphQLError
  if (error instanceof GraphQLError && error.originalError instanceof GrantException) {
    const httpError = mapDomainToHttp(error.originalError);
    return formatFromHttpException(formattedError, httpError);
  }

  // Direct domain error (shouldn't happen in GraphQL, but handle it)
  if (error instanceof GrantException) {
    const httpError = mapDomainToHttp(error);
    return formatFromHttpException(formattedError, httpError);
  }

  // Already an HttpException (e.g. from middleware)
  if (error instanceof GraphQLError && error.originalError instanceof HttpException) {
    return formatFromHttpException(formattedError, error.originalError);
  }

  // For all other errors, return as-is
  return formattedError;
}
