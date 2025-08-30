import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import {
  QueryProjectRolesArgs,
  MutationAddProjectRoleArgs,
  MutationRemoveProjectRoleArgs,
  ProjectRole,
} from '@/graphql/generated/types';
import { Repositories } from '@/graphql/repositories';
import { projectRoleAuditLogs } from '@/graphql/repositories/project-roles/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, createDynamicSingleSchema } from '../common';

import { IProjectRoleService } from './interface';
import {
  getProjectRolesParamsSchema,
  addProjectRoleParamsSchema,
  removeProjectRoleParamsSchema,
  projectRoleSchema,
} from './schemas';

export class ProjectRoleService extends AuditService implements IProjectRoleService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    private readonly db: PostgresJsDatabase
  ) {
    super(projectRoleAuditLogs, 'projectRoleId', user);
  }

  private async projectExists(projectId: string): Promise<void> {
    const projects = await this.repositories.projectRepository.getProjects({
      ids: [projectId],
      limit: 1,
    });

    if (projects.projects.length === 0) {
      throw new Error('Project not found');
    }
  }

  private async roleExists(roleId: string): Promise<void> {
    const roles = await this.repositories.roleRepository.getRoles({
      ids: [roleId],
      limit: 1,
    });

    if (roles.roles.length === 0) {
      throw new Error('Role not found');
    }
  }

  private async projectHasRole(projectId: string, roleId: string): Promise<boolean> {
    await this.projectExists(projectId);
    await this.roleExists(roleId);
    const existingProjectRoles = await this.repositories.projectRoleRepository.getProjectRoles({
      projectId,
    });

    return existingProjectRoles.some((pr) => pr.roleId === roleId);
  }

  public async getProjectRoles(params: QueryProjectRolesArgs): Promise<ProjectRole[]> {
    const validatedParams = validateInput(
      getProjectRolesParamsSchema,
      params,
      'getProjectRoles method'
    );

    await this.projectExists(validatedParams.projectId);

    const result = await this.repositories.projectRoleRepository.getProjectRoles(validatedParams);
    return validateOutput(
      createDynamicSingleSchema(projectRoleSchema).array(),
      result,
      'getProjectRoles method'
    );
  }

  public async addProjectRole(params: MutationAddProjectRoleArgs): Promise<ProjectRole> {
    const validatedParams = validateInput(
      addProjectRoleParamsSchema,
      params,
      'addProjectRole method'
    );

    const hasRole = await this.projectHasRole(
      validatedParams.input.projectId,
      validatedParams.input.roleId
    );

    if (hasRole) {
      throw new Error('Project already has this role');
    }

    const projectRole =
      await this.repositories.projectRoleRepository.addProjectRole(validatedParams);

    const newValues = {
      id: projectRole.id,
      projectId: projectRole.projectId,
      roleId: projectRole.roleId,
      createdAt: projectRole.createdAt,
      updatedAt: projectRole.updatedAt,
    };

    const metadata = {
      source: 'add_project_role_mutation',
    };

    await this.logCreate(projectRole.id, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(projectRoleSchema),
      projectRole,
      'addProjectRole method'
    );
  }

  public async removeProjectRole(
    params: MutationRemoveProjectRoleArgs & { hardDelete?: boolean }
  ): Promise<ProjectRole> {
    const validatedParams = validateInput(
      removeProjectRoleParamsSchema,
      params,
      'deleteProjectRole method'
    );

    const hasRole = await this.projectHasRole(
      validatedParams.input.projectId,
      validatedParams.input.roleId
    );

    if (!hasRole) {
      throw new Error('Project does not have this role');
    }

    const isHardDelete = params.hardDelete === true;

    const projectRole = isHardDelete
      ? await this.repositories.projectRoleRepository.hardDeleteProjectRole(validatedParams)
      : await this.repositories.projectRoleRepository.softDeleteProjectRole(validatedParams);

    const oldValues = {
      id: projectRole.id,
      projectId: projectRole.projectId,
      roleId: projectRole.roleId,
      createdAt: projectRole.createdAt,
      updatedAt: projectRole.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: projectRole.deletedAt,
    };

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_project_role_mutation',
      };
      await this.logHardDelete(projectRole.id, oldValues, metadata);
    } else {
      const metadata = {
        source: 'soft_delete_project_role_mutation',
      };
      await this.logSoftDelete(projectRole.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(projectRoleSchema),
      projectRole,
      'deleteProjectRole method'
    );
  }
}
