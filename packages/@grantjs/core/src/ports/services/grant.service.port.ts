/**
 * Grant-domain service port interface.
 * Covers: Grant (signing keys, user permissions/roles/groups resolution).
 */
import type { Permission, Scope, TokenType } from '@grantjs/schema';

import type {
  ExecutionContextGroup,
  ExecutionContextRole,
  ExecutionContextUser,
  SessionSigningKey,
} from '../../types';

// ---------------------------------------------------------------------------
// IGrantService
// ---------------------------------------------------------------------------

export interface IGrantService {
  getSessionSigningKey(): Promise<SessionSigningKey | null>;

  getVerificationKey(kid: string): Promise<string | null>;

  getPublicKeysForJwks(
    scope: Scope | null,
    retentionCutoff: Date
  ): Promise<Array<{ kid: string; publicKeyPem: string }>>;

  invalidateSessionSigningKeyCache(): Promise<void>;

  rotateSystemSigningKey(transaction?: unknown): Promise<{ kid: string; createdAt: Date }>;

  getSigningKeyForScope(scope: Scope, transaction?: unknown): Promise<SessionSigningKey | null>;

  getUserPermissions(
    userId: string,
    scope: Scope,
    resourceSlug: string,
    action: string,
    tokenType?: TokenType
  ): Promise<Permission[]>;

  /**
   * Every permission id the principal holds in the scope: roles in scope, their groups and
   * project-filtered direct permissions, the principal's direct groups and direct permissions.
   * The one collection `getUserPermissions` filters from.
   */
  collectPermissionIds(userId: string, scope: Scope, tokenType?: TokenType): Promise<string[]>;

  /**
   * Every permission id the given roles resolve to in the scope: their groups' permissions and
   * their direct permissions, filtered to the scope's project when it has one. A principal
   * whose only role is one of these resolves to exactly this set.
   */
  collectRolePermissionIds(roleIds: readonly string[], scope: Scope): Promise<string[]>;

  /**
   * Return which of the candidate scope slugs (resource:action) the user is granted in the given scope.
   * Used for project-app token scope intersection.
   */
  getGrantedScopeSlugs(userId: string, scope: Scope, candidateSlugs: string[]): Promise<string[]>;

  getUserRoles(
    userId: string,
    scope: Scope,
    tokenType?: TokenType
  ): Promise<ExecutionContextRole[]>;

  getUserGroups(
    userId: string,
    scope: Scope,
    tokenType?: TokenType
  ): Promise<ExecutionContextGroup[]>;

  getUser(userId: string, scope?: Scope): Promise<ExecutionContextUser>;
}
