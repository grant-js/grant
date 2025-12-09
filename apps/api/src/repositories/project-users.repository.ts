import {
  ProjectUserModel,
  projectRoles,
  projectUsers,
  projects,
  roles,
  userRoles,
} from '@logusgraphics/grant-database';
import {
  AddProjectUserInput,
  ProjectUser,
  RemoveProjectUserInput,
} from '@logusgraphics/grant-schema';
import { and, eq, isNull } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';
import {
  BasePivotAddArgs,
  BasePivotQueryArgs,
  BasePivotRemoveArgs,
  PivotRepository,
} from '@/repositories/common';

export class ProjectUserRepository extends PivotRepository<ProjectUserModel, ProjectUser> {
  protected table = projectUsers;
  protected parentIdField: keyof ProjectUserModel = 'projectId';
  protected relatedIdField: keyof ProjectUserModel = 'userId';

  protected toEntity(dbProjectUser: ProjectUserModel): ProjectUser {
    return {
      id: dbProjectUser.id,
      projectId: dbProjectUser.projectId,
      userId: dbProjectUser.userId,
      createdAt: dbProjectUser.createdAt,
      updatedAt: dbProjectUser.updatedAt,
      deletedAt: dbProjectUser.deletedAt,
    };
  }

  public async getProjectUsers(
    params: { projectId?: string; userId?: string },
    transaction?: Transaction
  ): Promise<ProjectUser[]> {
    const baseParams: BasePivotQueryArgs = {
      parentId: params.projectId,
      relatedId: params.userId,
    };

    return this.query(baseParams, transaction);
  }

  public async addProjectUser(
    params: AddProjectUserInput,
    transaction?: Transaction
  ): Promise<ProjectUser> {
    const baseParams: BasePivotAddArgs = {
      parentId: params.projectId,
      relatedId: params.userId,
    };

    const projectUser = await this.add(baseParams, transaction);

    return projectUser;
  }

  public async softDeleteProjectUser(
    params: RemoveProjectUserInput,
    transaction?: Transaction
  ): Promise<ProjectUser> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.projectId,
      relatedId: params.userId,
    };

    const projectUser = await this.softDelete(baseParams, transaction);

    return projectUser;
  }

  public async hardDeleteProjectUser(
    params: RemoveProjectUserInput,
    transaction?: Transaction
  ): Promise<ProjectUser> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.projectId,
      relatedId: params.userId,
    };

    const projectUser = await this.hardDelete(baseParams, transaction);

    return projectUser;
  }

  /**
   * Get user's project memberships with roles
   * Returns projects the user belongs to along with their role in each project
   */
  public async getUserProjectMemberships(
    userId: string,
    transaction?: Transaction
  ): Promise<
    Array<{
      projectId: string;
      projectName: string;
      role: string;
      joinedAt: Date;
    }>
  > {
    const dbInstance = transaction || this.db;

    // Get project details and user's role in each project
    const membershipsData = await dbInstance
      .select({
        projectId: projects.id,
        projectName: projects.name,
        roleName: roles.name,
        joinedAt: projectUsers.createdAt,
      })
      .from(projectUsers)
      .innerJoin(projects, eq(projectUsers.projectId, projects.id))
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

    // Filter to only include memberships where user has a role in the project
    // and group by project (taking first role if multiple)
    const membershipMap = new Map<
      string,
      { projectId: string; projectName: string; role: string; joinedAt: Date }
    >();

    for (const membership of membershipsData) {
      const roleName = membership.roleName;
      if (roleName && !membershipMap.has(membership.projectId)) {
        membershipMap.set(membership.projectId, {
          projectId: membership.projectId,
          projectName: membership.projectName,
          role: roleName,
          joinedAt: membership.joinedAt,
        });
      }
    }

    return Array.from(membershipMap.values());
  }
}
