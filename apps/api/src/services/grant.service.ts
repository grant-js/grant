import {
  type ExecutionContextGroup,
  type ExecutionContextRole,
  type ExecutionContextUser,
  GrantService as IGrantService,
  type IGrantRepository,
  type SessionSigningKey,
} from '@grantjs/core';
import { Permission, Scope, TokenType } from '@grantjs/schema';

import { config } from '@/config';
import {
  SYSTEM_SIGNING_KEY_CACHE_KEY,
  VERIFICATION_KEY_CACHE_PREFIX,
} from '@/constants/cache.constants';
import { SYSTEM_SCOPE } from '@/constants/system.constants';
import type { IEntityCacheAdapter } from '@/lib/cache';
import { tryProjectIdFromScope } from '@/lib/project-id-from-scope.lib';
import type { Transaction } from '@/lib/transaction-manager.lib';

import type { SigningKeyService } from './signing-keys.service';

export interface GrantServiceSessionKeyOptions {
  cacheTtlSeconds?: number;
}

export class GrantService implements IGrantService {
  constructor(
    private readonly cache: IEntityCacheAdapter,
    private readonly grantRepository: IGrantRepository,
    private readonly signingKeyService: SigningKeyService,
    private readonly sessionKeyOptions?: GrantServiceSessionKeyOptions
  ) {}

  /** TTL for both session signing key and verification-key caches (from config). */
  private getKeyCacheTtlSeconds(): number {
    return this.sessionKeyOptions?.cacheTtlSeconds ?? config.jwt.systemSigningKeyCacheTtlSeconds;
  }

  async getSessionSigningKey(): Promise<SessionSigningKey | null> {
    const cacheTtlSeconds = this.getKeyCacheTtlSeconds();
    const cached = await this.cache.signingKeys.get<SessionSigningKey>(
      SYSTEM_SIGNING_KEY_CACHE_KEY
    );
    if (cached) {
      return cached;
    }
    try {
      const key = await this.signingKeyService.getOrCreateForScope(SYSTEM_SCOPE);
      await this.cache.signingKeys.set(SYSTEM_SIGNING_KEY_CACHE_KEY, key, cacheTtlSeconds);
      return key;
    } catch {
      return null;
    }
  }

  async getVerificationKey(kid: string): Promise<string | null> {
    const cacheKey = `${VERIFICATION_KEY_CACHE_PREFIX}${kid}`;
    const cacheTtlSeconds = this.getKeyCacheTtlSeconds();
    const cached = await this.cache.signingKeys.get<string>(cacheKey);
    if (cached) {
      return cached;
    }
    const publicKeyPem = await this.signingKeyService.getPublicKeyPemByKid(kid);
    if (publicKeyPem) {
      await this.cache.signingKeys.set(cacheKey, publicKeyPem, cacheTtlSeconds);
    }
    return publicKeyPem;
  }

  async getPublicKeysForJwks(
    scope: Scope | null,
    retentionCutoff: Date
  ): Promise<Array<{ kid: string; publicKeyPem: string }>> {
    const effectiveTenant = scope?.tenant ?? SYSTEM_SCOPE.tenant;
    const effectiveId = scope?.id ?? SYSTEM_SCOPE.id;
    return this.signingKeyService.getPublicKeysForJwksByScope(
      effectiveTenant,
      effectiveId,
      retentionCutoff
    );
  }

  async invalidateSessionSigningKeyCache(): Promise<void> {
    await this.cache.signingKeys.delete(SYSTEM_SIGNING_KEY_CACHE_KEY);
  }

  async rotateSystemSigningKey(transaction?: unknown): Promise<{ kid: string; createdAt: Date }> {
    const key = await this.signingKeyService.rotateForScope(
      SYSTEM_SCOPE,
      transaction as Transaction | undefined
    );
    return { kid: key.kid, createdAt: key.createdAt };
  }

  async getSigningKeyForScope(
    scope: Scope,
    transaction?: unknown
  ): Promise<SessionSigningKey | null> {
    try {
      return await this.signingKeyService.getOrCreateForScope(
        scope,
        transaction as Transaction | undefined
      );
    } catch {
      return null;
    }
  }

  async getUserPermissions(
    userId: string,
    scope: Scope,
    resourceSlug: string,
    action: string,
    tokenType?: TokenType
  ): Promise<Permission[]> {
    const projectId = tryProjectIdFromScope(scope);
    const roleIds = await this.grantRepository.getUserRoleIdsInScope(userId, scope, undefined, {
      tokenType,
    });

    const permissionIdSets: string[][] = [];

    const roleGroupIds =
      roleIds.length > 0 ? await this.grantRepository.getGroupIdsForRoles(roleIds) : [];
    const directUserGroupIds = await this.grantRepository.getDirectGroupIdsForUser(
      userId,
      projectId
    );
    const groupIds = [...new Set([...roleGroupIds, ...directUserGroupIds])];
    if (groupIds.length > 0) {
      permissionIdSets.push(await this.grantRepository.getPermissionIdsForGroups(groupIds));
    }

    if (roleIds.length > 0) {
      permissionIdSets.push(
        await this.grantRepository.getDirectPermissionIdsForRoles(roleIds, projectId)
      );
    }

    permissionIdSets.push(
      await this.grantRepository.getDirectPermissionIdsForUser(userId, projectId)
    );

    const permissionIds = [...new Set(permissionIdSets.flat())];

    if (permissionIds.length === 0) {
      return [];
    }

    return this.grantRepository.getPermissionsByIds(permissionIds, action, resourceSlug);
  }

  async getGrantedScopeSlugs(
    userId: string,
    scope: Scope,
    candidateSlugs: string[]
  ): Promise<string[]> {
    const granted: string[] = [];
    for (const slug of candidateSlugs) {
      const [resource, action] = slug.split(':');
      if (!resource || !action) continue;
      const perms = await this.getUserPermissions(
        userId,
        scope,
        resource.trim(),
        action.trim(),
        TokenType.ProjectApp
      );
      if (perms.length > 0) granted.push(slug);
    }
    return granted;
  }

  async getUserRoles(
    userId: string,
    scope: Scope,
    tokenType?: TokenType
  ): Promise<ExecutionContextRole[]> {
    const roleIds = await this.grantRepository.getUserRoleIdsInScope(userId, scope, undefined, {
      tokenType,
    });

    if (roleIds.length === 0) {
      return [];
    }

    return this.grantRepository.getUserRoles(userId, scope, undefined, { tokenType });
  }

  async getUserGroups(
    userId: string,
    scope: Scope,
    tokenType?: TokenType
  ): Promise<ExecutionContextGroup[]> {
    return this.grantRepository.getUserGroups(userId, scope, undefined, { tokenType });
  }

  async getUser(userId: string, scope?: Scope): Promise<ExecutionContextUser> {
    return this.grantRepository.getUser(userId, scope);
  }
}
