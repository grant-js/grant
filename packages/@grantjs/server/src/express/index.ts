// Express middleware
export { grant } from './middleware';
export type { GrantOptions, AuthorizedRequest } from './middleware';

// Re-export core types for convenience
export type {
  GrantServerConfig,
  AuthorizationResult,
  PermissionCheckOptions,
  Scope,
  ResourceResolver,
  ScopeResolver,
} from '../types';

// Re-export error classes
export {
  GrantServerError,
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  NotFoundError,
} from '../errors';

// Re-export GrantClient
export { GrantClient } from '../grant-client';
