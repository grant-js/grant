// Core client
export { GrantClient } from './grant-client';

// Types
export type {
  GrantClientConfig,
  AuthTokens,
  CacheOptions,
  AuthorizationResult,
  PermissionQueryOptions,
  Permission,
  Resource,
  ApiError,
  // Re-exported from @grantjs/schema
  Scope,
  Tenant,
} from './types';
