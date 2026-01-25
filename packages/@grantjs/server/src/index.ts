// Core client
export { GrantClient } from './grant-client';
export type { GrantServerConfig, AuthorizationResult, PermissionCheckOptions } from './types';

// Error classes
export {
  GrantServerError,
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  NotFoundError,
} from './errors';

// Utilities
export { extractTokenFromRequest, extractBearerToken } from './utils/token-extractor';
export { extractScopeFromRequest, extractScopeFromExpressRequest } from './utils/scope-extractor';

// Types
export type {
  Scope,
  Tenant,
  ResourceResolver,
  ResourceResolverParams,
  ResourceResolverResult,
  ScopeResolver,
} from './types';
