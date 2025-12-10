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
  QueryProjectUsersInput,
  RemoveProjectUserInput,
} from '@logusgraphics/grant-schema';
import { and, eq, isNull } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class ProjectUserRepository extends PivotRepository<ProjectUserModel, ProjectUser> {
  protected table = projectUsers;
  protected uniqueIndexFields: Array<keyof ProjectUserModel> = ['projectId', 'userId'];

  protected toEntity(dbProjectUser: ProjectUserModel): ProjectUser {
    return dbProjectUser;
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
    return this.add(params, transaction);
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
  ): Promise<
    Array<{
      projectId: string;
      projectName: string;
      role: string;
      joinedAt: Date;
    }>
  > {
    const dbInstance = transaction || this.db;

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
