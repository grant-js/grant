import { ApolloServerErrorCode } from '@apollo/server/errors';
import { GraphQLError } from 'graphql';

export class ApiError extends GraphQLError {
  constructor(
    message: string,
    public code: ApolloServerErrorCode = ApolloServerErrorCode.INTERNAL_SERVER_ERROR
  ) {
    super(message, {
      extensions: {
        code,
      },
    });
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(message, ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string) {
    super(message, ApolloServerErrorCode.BAD_USER_INPUT);
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string) {
    super(message, ApolloServerErrorCode.BAD_REQUEST);
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string) {
    super(message, ApolloServerErrorCode.BAD_REQUEST);
  }
}
