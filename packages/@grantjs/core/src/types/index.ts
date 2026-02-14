import type {
  AuthorizationReason,
  Group,
  IsAuthorizedContextInput,
  IsAuthorizedPermissionInput,
  Permission,
  Role,
  Scope,
  TokenType,
  User,
} from '@grantjs/schema';

/**
 * Token Claims extracted from JWT.
 * Standalone interface — no dependency on jsonwebtoken types.
 */
export interface TokenClaims {
  sub: string; // User ID
  aud: string; // API URL (RFC 7519)
  iss: string; // Issuer URL
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
  jti: string; // JWT ID (API key ID or session ID)
  type: TokenType; // Token type: TokenType.Session or TokenType.ApiKey
  scope?: Scope; // Optional: Required for API key tokens, optional for user session tokens
  isVerified?: boolean; // Optional: Email verification status (session tokens only)
  [key: string]: unknown; // Allow additional JWT claims
}

/**
 * Condition Expression Format
 *
 * Structure: { Operator: { FieldPath: Value } }
 *
 * Examples:
 * - { "in": { "resource.id": "{{user.metadata.policies}}" } }
 * - { "string-equals": { "user.metadata.partnerId": "{{resource.partnerId}}" } }
 * - { "or": [ { "in": {...} }, { "string-equals": {...} } ] }
 */
export type ConditionExpression =
  | ComparisonCondition // Operator with field comparison
  | LogicalCondition; // AND, OR, NOT

/**
 * Helper type to create a single-key object from an enum value
 * This ensures the key is a literal string, not an index signature
 */
type OperatorCondition<K extends string> = {
  [P in K]: FieldComparison;
};

/**
 * Comparison Condition: Operator as key, field path as nested key, value as nested value
 * This is a discriminated union where exactly one operator key is present
 * Automatically generated from ComparisonOperator enum to stay in sync
 */
export type ComparisonCondition = {
  [K in ComparisonOperator]: OperatorCondition<K>;
}[ComparisonOperator];

export enum LogicalOperator {
  And = 'And',
  Or = 'Or',
  Not = 'Not',
}

export type LogicalCondition =
  | { [LogicalOperator.And]: ConditionExpression[] }
  | { [LogicalOperator.Or]: ConditionExpression[] }
  | { [LogicalOperator.Not]: ConditionExpression };

export enum ComparisonOperator {
  Equals = 'Equals',
  StringEquals = 'StringEquals',
  NotEquals = 'NotEquals',
  StringNotEquals = 'StringNotEquals',
  In = 'In',
  StringIn = 'StringIn',
  NotIn = 'NotIn',
  StringNotIn = 'StringNotIn',
  Contains = 'Contains',
  StartsWith = 'StartsWith',
  EndsWith = 'EndsWith',
  NumericEquals = 'NumericEquals',
  NumericGreaterThan = 'NumericGreaterThan',
  NumericLessThan = 'NumericLessThan',
  NumericGreaterThanEquals = 'NumericGreaterThanEquals',
  NumericLessThanEquals = 'NumericLessThanEquals',
}

export type FieldValue =
  | string // Static string or field reference "{{user.id}}"
  | number // Static number
  | boolean // Static boolean
  | string[] // Static array or array with field references
  | FieldReference; // Explicit field reference object

export interface FieldReference {
  $ref: string; // Field path (e.g., "user.metadata.policies")
}

/**
 * Field Comparison: Map of field paths to their comparison values
 * Used in comparison conditions to specify which fields to compare and their expected values
 */
export type FieldComparison = Record<string, FieldValue>;

export type ExecutionContextUser = Pick<User, 'id' | 'metadata'>;

export type ExecutionContextRole = Pick<Role, 'id' | 'name' | 'metadata'>;

export type ExecutionContextGroup = Pick<Group, 'id' | 'name' | 'metadata'>;

export interface ExecutionContext {
  user: ExecutionContextUser;
  role?: ExecutionContextRole;
  group?: ExecutionContextGroup;
  resolvedResource?: Record<string, unknown> | null; // Resolved resource data from external system
  scope: Scope;
}

export interface AuthorizationResult {
  authorized: boolean;
  reason?: AuthorizationReason;
  matchedPermission?: Permission; // Permission type from @grantjs/schema
  matchedCondition?: ConditionExpression;
  evaluatedContext?: ExecutionContext; // Full context used for evaluation (includes resolved resource)
}

export interface PermissionQueryOptions {
  includeConditions?: boolean;
  includeResources?: boolean;
  cache?: boolean;
}

export interface CheckPermissionParams {
  userId: string;
  scope: Scope;
  permission: IsAuthorizedPermissionInput;
  context: IsAuthorizedContextInput;
}

export interface EvaluatePermissionConditionParams {
  permission: Permission;
  user: ExecutionContextUser;
  roles: ExecutionContextRole[];
  groups: ExecutionContextGroup[];
  scope: Scope;
  resolvedResource?: Record<string, unknown> | null;
}

export interface PermissionConditionEvaluationResult {
  authorized: boolean;
  context?: ExecutionContext;
}

export interface RoleGroupCombination {
  role?: ExecutionContextRole;
  group?: ExecutionContextGroup;
}

/**
 * Result of resolving the current session (global) signing key.
 * Used for RS256 signing with kid in JWT header.
 */
export interface SessionSigningKey {
  kid: string;
  privateKeyPem: string;
}

/** Payload for signing an API key (project-scoped) token. Scope is used to resolve the signing key. */
export interface ApiKeyTokenPayload {
  sub: string;
  aud: string;
  iss: string;
  exp: number;
  iat: number;
  jti: string;
  scope: Scope;
}

/**
 * Grant service abstraction (DIP). All token signing and verification key resolution goes through this interface.
 */
export interface GrantService {
  getUserPermissions(
    userId: string,
    scope: Scope,
    resourceSlug: string,
    action: string
  ): Promise<Permission[]>;

  getUserRoles(userId: string, scope: Scope): Promise<ExecutionContextRole[]>;

  getUserGroups(userId: string, scope: Scope): Promise<ExecutionContextGroup[]>;

  getUser(userId: string, scope?: Scope): Promise<ExecutionContextUser>;

  getSessionSigningKey(): Promise<SessionSigningKey | null>;

  getVerificationKey(kid: string): Promise<string | null>;

  getPublicKeysForJwks(
    scope: Scope | null,
    retentionCutoff: Date
  ): Promise<Array<{ kid: string; publicKeyPem: string }>>;

  invalidateSessionSigningKeyCache(): Promise<void>;

  rotateSystemSigningKey(transaction?: unknown): Promise<{ kid: string; createdAt: Date }>;

  getSigningKeyForScope(scope: Scope, transaction?: unknown): Promise<SessionSigningKey | null>;
}

export interface GrantAuth {
  userId: string;
  tokenId: string;
  expiresAt: number;
  type: TokenType; // Token type: TokenType.Session or TokenType.ApiKey
  scope?: Scope; // Required for API key tokens, optional for session tokens
  isVerified?: boolean; // Email verification status (session tokens only, always true for API keys)
}
