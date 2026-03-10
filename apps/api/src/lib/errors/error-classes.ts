// Re-export domain errors from @grantjs/core
export {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  ConfigurationError,
  ConflictError,
  GrantException,
  InvalidOrUsedVerificationTokenError,
  NotFoundError,
  ValidationError,
} from '@grantjs/core';

// Re-export HTTP errors from @grantjs/errors (used in middleware/formatters)
export { HttpException, mapDomainToHttp } from '@grantjs/errors';
