import { MILLISECONDS_PER_DAY } from '@grantjs/constants';
import type {
  CreateProjectOAuthGrantInput,
  IAuditLogger,
  IProjectOAuthGrantRepository,
  IProjectOAuthGrantService,
  ProjectOAuthGrantIssued,
  ProjectOAuthGrantRecord,
  ProjectOAuthGrantRotationMeta,
} from '@grantjs/core';

import { config } from '@/config';
import { ConfigurationError } from '@/lib/errors';
import {
  generateProjectOAuthRefreshToken,
  hashProjectOAuthRefreshToken,
} from '@/lib/project-oauth-pkce.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { validateInput } from '@/services/common';

import {
  createProjectOAuthGrantInputSchema,
  revokeUserGrantsInProjectInputSchema,
} from './project-oauth-grants.schemas';

function grantAuditValues(grant: ProjectOAuthGrantRecord): Record<string, unknown> {
  return {
    id: grant.id,
    projectAppId: grant.projectAppId,
    userId: grant.userId,
    scopeTenant: grant.scopeTenant,
    scopeId: grant.scopeId,
    expiresAt: grant.expiresAt,
  };
}

function refreshTokenExpirationDate(from: number = Date.now()): Date {
  const days = config.projectOAuth.refreshTokenExpirationDays;
  if (days <= 0) {
    throw new ConfigurationError(
      'PROJECT_OAUTH_REFRESH_TOKEN_EXPIRATION_DAYS must be greater than 0'
    );
  }
  return new Date(from + days * MILLISECONDS_PER_DAY);
}

export class ProjectOAuthGrantService implements IProjectOAuthGrantService {
  constructor(
    private readonly grants: IProjectOAuthGrantRepository,
    private readonly audit: IAuditLogger
  ) {}

  async createGrant(
    params: CreateProjectOAuthGrantInput,
    transaction?: Transaction
  ): Promise<ProjectOAuthGrantIssued> {
    const validated = validateInput(
      createProjectOAuthGrantInputSchema,
      params,
      'ProjectOAuthGrantService.createGrant'
    );
    const refreshToken = generateProjectOAuthRefreshToken();
    const grant = await this.grants.createGrant(
      {
        projectAppId: validated.projectAppId,
        userId: validated.userId,
        scopeTenant: validated.scopeTenant,
        scopeId: validated.scopeId,
        scopes: validated.scopes ?? null,
        tokenHash: hashProjectOAuthRefreshToken(refreshToken),
        expiresAt: refreshTokenExpirationDate(),
        userAgent: validated.userAgent ?? null,
        ipAddress: validated.ipAddress ?? null,
      },
      transaction
    );
    await this.audit.logCreate(
      grant.id,
      grantAuditValues(grant),
      { context: 'createGrant' },
      transaction
    );
    return { grant, refreshToken };
  }

  async rotateByRefreshToken(
    refreshToken: string,
    meta?: ProjectOAuthGrantRotationMeta,
    transaction?: Transaction
  ): Promise<ProjectOAuthGrantIssued | null> {
    const existing = await this.grants.findActiveByTokenHash(
      hashProjectOAuthRefreshToken(refreshToken),
      transaction
    );
    if (!existing) {
      return null;
    }

    const nextRefreshToken = generateProjectOAuthRefreshToken();
    const grant = await this.grants.rotateGrant(
      {
        id: existing.id,
        tokenHash: hashProjectOAuthRefreshToken(nextRefreshToken),
        expiresAt: refreshTokenExpirationDate(),
        lastUsedAt: new Date(),
        userAgent: meta?.userAgent ?? existing.userAgent,
        ipAddress: meta?.ipAddress ?? existing.ipAddress,
      },
      transaction
    );
    await this.audit.logUpdate(
      grant.id,
      grantAuditValues(existing),
      grantAuditValues(grant),
      { context: 'rotateGrant' },
      transaction
    );
    return { grant, refreshToken: nextRefreshToken };
  }

  async revokeGrant(id: string, transaction?: Transaction): Promise<void> {
    await this.grants.softDeleteGrant(id, transaction);
    await this.audit.logSoftDelete(
      id,
      { id },
      { id, deleted: true },
      { context: 'revokeGrant' },
      transaction
    );
  }

  async revokeByRefreshToken(refreshToken: string, transaction?: Transaction): Promise<boolean> {
    const existing = await this.grants.findActiveByTokenHash(
      hashProjectOAuthRefreshToken(refreshToken),
      transaction
    );
    if (!existing) {
      return false;
    }
    await this.revokeGrant(existing.id, transaction);
    return true;
  }

  async revokeAllForUserInProject(
    projectId: string,
    userId: string,
    transaction?: Transaction
  ): Promise<number> {
    validateInput(
      revokeUserGrantsInProjectInputSchema,
      { projectId, userId },
      'ProjectOAuthGrantService.revokeAllForUserInProject'
    );
    const revokedIds = await this.grants.softDeleteActiveGrantsForUserInProject(
      projectId,
      userId,
      transaction
    );
    for (const id of revokedIds) {
      await this.audit.logSoftDelete(
        id,
        { id },
        { id, deleted: true },
        { context: 'revokeAllForUserInProject' },
        transaction
      );
    }
    return revokedIds.length;
  }
}
