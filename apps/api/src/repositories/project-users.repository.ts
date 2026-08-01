import type { IProjectUserRepository } from '@grantjs/core';
import {
  accountProjects,
  organizationProjects,
  organizations,
  projectRoles,
  projects,
  ProjectUserModel,
  projectUsers,
  roles,
  userRoles,
} from '@grantjs/database';
import {
  AddProjectUserInput,
  ProjectUser,
  QueryProjectUsersInput,
  RemoveProjectUserInput,
} from '@grantjs/schema';
import { and, eq, ilike, inArray, isNull } from 'drizzle-orm';

import { mergeCdmImporterMetadata } from '@/constants/cdm-import.constants';
import { NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export type ProjectUserMembershipRow = {
  projectId: string;
  projectName: string;
  displayName: string | null;
  pictureUrl: string | null;
  metadata: Record<string, unknown>;
  role: string | null;
  joinedAt: Date;
  organizationId: string | null;
  organizationName: string | null;
  accountId: string | null;
};

export class ProjectUserRepository
  extends PivotRepository<ProjectUserModel, ProjectUser>
  implements IProjectUserRepository
{
  protected table = projectUsers;
  protected uniqueIndexFields: Array<keyof ProjectUserModel> = ['projectId', 'userId'];

  protected toEntity(dbProjectUser: ProjectUserModel): ProjectUser {
    const md = dbProjectUser.metadata;
    const metadata =
      md != null && typeof md === 'object' && !Array.isArray(md)
        ? (md as Record<string, unknown>)
        : {};
    return {
      ...dbProjectUser,
      metadata,
      displayName: dbProjectUser.displayName ?? undefined,
      pictureUrl: dbProjectUser.pictureUrl ?? undefined,
    } as ProjectUser;
  }

  public async getProjectUsers(
    params: QueryProjectUsersInput,
    transaction?: Transaction
  ): Promise<ProjectUser[]> {
    return this.query(params, transaction);
  }

  public async addProjectUser(
    params: AddProjectUserInput,
    transaction?: Transaction
  ): Promise<ProjectUser> {
    return this.add(
      {
        projectId: params.projectId,
        userId: params.userId,
        metadata: params.metadata !== undefined && params.metadata !== null ? params.metadata : {},
      },
      transaction
    );
  }

  public async mergeProjectUserCdmMetadata(
    params: {
      projectId: string;
      userId: string;
      importerMetadata: Record<string, unknown> | null | undefined;
    },
    transaction?: Transaction
  ): Promise<ProjectUser> {
    const rows = await this.getProjectUsers(
      { projectId: params.projectId, userId: params.userId },
      transaction
    );
    if (rows.length === 0) {
      throw new NotFoundError('ProjectUser');
    }
    const raw = rows[0].metadata;
    const current =
      raw != null && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
    const merged = mergeCdmImporterMetadata(current, params.importerMetadata);
    return this.update(
      { projectId: params.projectId, userId: params.userId },
      { metadata: merged, updatedAt: new Date() },
      transaction
    );
  }

  public async updateProjectUserMetadata(
    params: {
      projectId: string;
      userId: string;
      metadata: Record<string, unknown>;
    },
    transaction?: Transaction
  ): Promise<ProjectUser> {
    return this.update(
      { projectId: params.projectId, userId: params.userId },
      { metadata: params.metadata, updatedAt: new Date() },
      transaction
    );
  }

  public async updateProjectUserProfile(
    params: {
      projectId: string;
      userId: string;
      displayName?: string | null;
      pictureUrl?: string | null;
    },
    transaction?: Transaction
  ): Promise<ProjectUser> {
    const update: Partial<ProjectUserModel> = { updatedAt: new Date() };
    if (params.displayName !== undefined) {
      update.displayName = params.displayName;
    }
    if (params.pictureUrl !== undefined) {
      update.pictureUrl = params.pictureUrl;
    }
    return this.update({ projectId: params.projectId, userId: params.userId }, update, transaction);
  }

  public async updateProjectUserSearchDocument(
    params: {
      projectId: string;
      userId: string;
      searchDocument: string;
    },
    transaction?: Transaction
  ): Promise<ProjectUser> {
    return this.update(
      { projectId: params.projectId, userId: params.userId },
      { searchDocument: params.searchDocument, updatedAt: new Date() },
      transaction
    );
  }

  public async filterUserIdsBySearchDocument(
    params: {
      projectId: string;
      userIds: readonly string[];
      search: string;
    },
    transaction?: Transaction
  ): Promise<string[]> {
    const trimmed = params.search.trim();
    if (trimmed.length === 0 || params.userIds.length === 0) {
      return [...params.userIds];
    }
    const dbInstance = transaction || this.db;
    const rows = await dbInstance
      .select({ userId: projectUsers.userId })
      .from(projectUsers)
      .where(
        and(
          eq(projectUsers.projectId, params.projectId),
          inArray(projectUsers.userId, [...params.userIds]),
          ilike(projectUsers.searchDocument, `%${trimmed}%`),
          isNull(projectUsers.deletedAt)
        )
      );
    return rows.map((r) => r.userId);
  }

  public async softDeleteProjectUser(
    params: RemoveProjectUserInput,
    transaction?: Transaction
  ): Promise<ProjectUser> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteProjectUser(
    params: RemoveProjectUserInput,
    transaction?: Transaction
  ): Promise<ProjectUser> {
    return this.hardDelete(params, transaction);
  }

  public async getProjectUserMemberships(
    userId: string,
    transaction?: Transaction
  ): Promise<ProjectUserMembershipRow[]> {
    const dbInstance = transaction || this.db;

    const membershipsData = await dbInstance
      .select({
        projectId: projects.id,
        projectName: projects.name,
        displayName: projectUsers.displayName,
        pictureUrl: projectUsers.pictureUrl,
        metadata: projectUsers.metadata,
        roleName: roles.name,
        joinedAt: projectUsers.createdAt,
        organizationId: organizationProjects.organizationId,
        organizationName: organizations.name,
        accountId: accountProjects.accountId,
        hasProjectRole: projectRoles.id,
      })
      .from(projectUsers)
      .innerJoin(projects, eq(projectUsers.projectId, projects.id))
      .leftJoin(
        organizationProjects,
        and(
          eq(organizationProjects.projectId, projectUsers.projectId),
          isNull(organizationProjects.deletedAt)
        )
      )
      .leftJoin(
        organizations,
        and(
          eq(organizations.id, organizationProjects.organizationId),
          isNull(organizations.deletedAt)
        )
      )
      .leftJoin(
        accountProjects,
        and(
          eq(accountProjects.projectId, projectUsers.projectId),
          isNull(accountProjects.deletedAt)
        )
      )
      .leftJoin(userRoles, and(eq(userRoles.userId, userId), isNull(userRoles.deletedAt)))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .leftJoin(
        projectRoles,
        and(
          eq(projectRoles.projectId, projectUsers.projectId),
          eq(projectRoles.roleId, roles.id),
          isNull(projectRoles.deletedAt)
        )
      )
      .where(
        and(
          eq(projectUsers.userId, userId),
          isNull(projectUsers.deletedAt),
          isNull(projects.deletedAt)
        )
      );

    const membershipMap = new Map<string, ProjectUserMembershipRow>();

    for (const row of membershipsData) {
      const existing = membershipMap.get(row.projectId);
      const metadata =
        row.metadata != null && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {};

      if (!existing) {
        membershipMap.set(row.projectId, {
          projectId: row.projectId,
          projectName: row.projectName,
          displayName: row.displayName ?? null,
          pictureUrl: row.pictureUrl ?? null,
          metadata,
          role: row.hasProjectRole && row.roleName ? row.roleName : null,
          joinedAt: row.joinedAt,
          organizationId: row.organizationId ?? null,
          organizationName: row.organizationName ?? null,
          accountId: row.accountId ?? null,
        });
        continue;
      }

      if (!existing.role && row.hasProjectRole && row.roleName) {
        existing.role = row.roleName;
      }
    }

    return Array.from(membershipMap.values());
  }
}
