import {
  ProjectRole,
  RemoveProjectRoleInput,
  AddProjectRoleInput,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { projectRoleAuditLogs } from '@/graphql/repositories/project-roles/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from '../common';

import {
  getProjectRolesParamsSchema,
  projectRoleSchema,
  addProjectRoleInputSchema,
  removeProjectRoleInputSchema,
} from './schemas';

export class ProjectRoleService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(projectRoleAuditLogs, 'projectRoleId', user, db);
  }

  private async projectExists(projectId: string, transaction?: Transaction): Promise<void> {
    const projects = await this.repositories.projectRepository.getProjects(
      { ids: [projectId], limit: 1 },
      transaction
    );

    if (projects.projects.length === 0) {
      throw new Error('Project not found');
    }
  }

  private async roleExists(roleId: string, transaction?: Transaction): Promise<void> {
    const roles = await this.repositories.roleRepository.getRoles(
      { ids: [roleId], limit: 1 },
      transaction
    );

    if (roles.roles.length === 0) {
      throw new Error('Role not found');
    }
  }

  private async projectHasRole(
    projectId: string,
    roleId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectExists(projectId, transaction);
    await this.roleExists(roleId, transaction);
    const existingProjectRoles = await this.repositories.projectRoleRepository.getProjectRoles(
      { projectId },
      transaction
    );

    return existingProjectRoles.some((pr) => pr.roleId === roleId);
  }

  public async getProjectRoles(
    params: { projectId: string },
    transaction?: Transaction
  ): Promise<ProjectRole[]> {
    const context = 'ProjectRoleService.getProjectRoles';
    const validatedParams = validateInput(getProjectRolesParamsSchema, params, context);

    await this.projectExists(validatedParams.projectId, transaction);

    const result = await this.repositories.projectRoleRepository.getProjectRoles(
      validatedParams,
      transaction
    );
    return validateOutput(createDynamicSingleSchema(projectRoleSchema).array(), result, context);
  }

  public async addProjectRole(
    params: AddProjectRoleInput,
    transaction?: Transaction
  ): Promise<ProjectRole> {
    const context = 'ProjectRoleService.addProjectRole';
    const validatedParams = validateInput(addProjectRoleInputSchema, params, context);
    const { projectId, roleId } = validatedParams;

    const hasRole = await this.projectHasRole(projectId, roleId, transaction);

    if (hasRole) {
      throw new Error('Project already has this role');
    }

    const projectRole = await this.repositories.projectRoleRepository.addProjectRole(
      { projectId, roleId },
      transaction
    );

    const newValues = {
      id: projectRole.id,
      projectId: projectRole.projectId,
      roleId: projectRole.roleId,
      createdAt: projectRole.createdAt,
      updatedAt: projectRole.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(projectRole.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(projectRoleSchema), projectRole, context);
  }

  public async removeProjectRole(
    params: RemoveProjectRoleInput & DeleteParams,
    transaction?: Transaction
  ): Promise<ProjectRole> {
    const context = 'ProjectRoleService.removeProjectRole';
    const validatedParams = validateInput(removeProjectRoleInputSchema, params, context);

    const { projectId, roleId, hardDelete } = validatedParams;

    const hasRole = await this.projectHasRole(projectId, roleId, transaction);

    if (!hasRole) {
      throw new Error('Project does not have this role');
    }

    const isHardDelete = hardDelete === true;

    const projectRole = isHardDelete
      ? await this.repositories.projectRoleRepository.hardDeleteProjectRole(
          { projectId, roleId },
          transaction
        )
      : await this.repositories.projectRoleRepository.softDeleteProjectRole(
          { projectId, roleId },
          transaction
        );

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

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(projectRole.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(projectRole.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(projectRoleSchema), projectRole, context);
  }
}
