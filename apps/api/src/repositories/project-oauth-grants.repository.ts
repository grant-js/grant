import type { IProjectOAuthGrantRepository, ProjectOAuthGrantRecord } from '@grantjs/core';
import type { ProjectOAuthGrantModel } from '@grantjs/database';
import { projectApps, projectOAuthGrants } from '@grantjs/database';
import { and, eq, inArray, isNull } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';
import {
  EntityRepository,
  type FilterCondition,
  type RelationsConfig,
} from '@/repositories/common';

function toGrantRecord(row: ProjectOAuthGrantModel): ProjectOAuthGrantRecord {
  return {
    id: row.id,
    projectAppId: row.projectAppId,
    userId: row.userId,
    scopeTenant: row.scopeTenant,
    scopeId: row.scopeId,
    scopes: row.scopes ?? null,
    familyId: row.familyId,
    expiresAt: row.expiresAt,
    lastUsedAt: row.lastUsedAt ?? null,
    userAgent: row.userAgent ?? null,
    ipAddress: row.ipAddress ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null,
  };
}

export class ProjectOAuthGrantRepository
  extends EntityRepository<ProjectOAuthGrantModel, ProjectOAuthGrantModel>
  implements IProjectOAuthGrantRepository
{
  protected table = projectOAuthGrants;
  protected schemaName = 'projectOAuthGrants' as const;
  protected searchFields: Array<keyof ProjectOAuthGrantModel> = ['projectAppId', 'userId'];
  protected defaultSortField: keyof ProjectOAuthGrantModel = 'createdAt';
  protected relations: RelationsConfig<ProjectOAuthGrantModel> = {};

  async createGrant(
    params: {
      projectAppId: string;
      userId: string;
      scopeTenant: string;
      scopeId: string;
      scopes?: string[] | null;
      tokenHash: string;
      expiresAt: Date;
      userAgent?: string | null;
      ipAddress?: string | null;
    },
    transaction?: Transaction
  ): Promise<ProjectOAuthGrantRecord> {
    const row = await this.create(
      {
        projectAppId: params.projectAppId,
        userId: params.userId,
        scopeTenant: params.scopeTenant,
        scopeId: params.scopeId,
        scopes: params.scopes ?? null,
        token: params.tokenHash,
        expiresAt: params.expiresAt,
        lastUsedAt: new Date(),
        userAgent: params.userAgent ?? null,
        ipAddress: params.ipAddress ?? null,
      },
      transaction
    );
    return toGrantRecord(row as ProjectOAuthGrantModel);
  }

  async findActiveByTokenHash(
    tokenHash: string,
    transaction?: Transaction
  ): Promise<ProjectOAuthGrantRecord | null> {
    const filters: FilterCondition<ProjectOAuthGrantModel>[] = [
      { field: 'token', operator: 'eq', value: tokenHash },
      { field: 'expiresAt', operator: 'gte', value: new Date() },
    ];
    const result = await this.query({ filters, limit: 1 }, transaction);
    const row = this.first(result.items);
    return row ? toGrantRecord(row as ProjectOAuthGrantModel) : null;
  }

  async rotateGrant(
    params: {
      id: string;
      expectedTokenHash: string;
      tokenHash: string;
      expiresAt: Date;
      lastUsedAt: Date;
      userAgent?: string | null;
      ipAddress?: string | null;
    },
    transaction?: Transaction
  ): Promise<ProjectOAuthGrantRecord | null> {
    const dbInstance = transaction ?? this.db;
    const now = new Date();
    const rows = await dbInstance
      .update(projectOAuthGrants)
      .set({
        token: params.tokenHash,
        previousToken: params.expectedTokenHash,
        expiresAt: params.expiresAt,
        lastUsedAt: params.lastUsedAt,
        userAgent: params.userAgent ?? null,
        ipAddress: params.ipAddress ?? null,
        updatedAt: now,
      })
      .where(
        and(
          eq(projectOAuthGrants.id, params.id),
          eq(projectOAuthGrants.token, params.expectedTokenHash),
          isNull(projectOAuthGrants.deletedAt)
        )
      )
      .returning();
    const row = rows[0];
    return row ? toGrantRecord(row) : null;
  }

  async findFamilyIdByPreviousTokenHash(
    tokenHash: string,
    transaction?: Transaction
  ): Promise<string | null> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({ familyId: projectOAuthGrants.familyId })
      .from(projectOAuthGrants)
      .where(
        and(eq(projectOAuthGrants.previousToken, tokenHash), isNull(projectOAuthGrants.deletedAt))
      )
      .limit(1);
    return rows[0]?.familyId ?? null;
  }

  async listActiveGrantIdsInFamily(familyId: string, transaction?: Transaction): Promise<string[]> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({ id: projectOAuthGrants.id })
      .from(projectOAuthGrants)
      .where(and(eq(projectOAuthGrants.familyId, familyId), isNull(projectOAuthGrants.deletedAt)));
    return rows.map((row) => row.id);
  }

  async softDeleteGrant(id: string, transaction?: Transaction): Promise<void> {
    await this.softDelete({ id }, transaction);
  }

  async softDeleteActiveGrantsForUserInProject(
    projectId: string,
    userId: string,
    transaction?: Transaction
  ): Promise<string[]> {
    const dbInstance = transaction ?? this.db;
    const now = new Date();
    // One statement. The apps are matched through `project_apps` (the grant has no project
    // column), including soft-deleted apps: a grant on a retired app is still a live
    // refresh token and a reset must cut it too.
    const revoked = await dbInstance
      .update(projectOAuthGrants)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(projectOAuthGrants.userId, userId),
          isNull(projectOAuthGrants.deletedAt),
          inArray(
            projectOAuthGrants.projectAppId,
            dbInstance
              .select({ id: projectApps.id })
              .from(projectApps)
              .where(eq(projectApps.projectId, projectId))
          )
        )
      )
      .returning({ id: projectOAuthGrants.id });
    return revoked.map((row) => row.id);
  }
}
