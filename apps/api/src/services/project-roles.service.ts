import { ProjectRole, RemoveProjectRoleInput, AddProjectRoleInput } from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { validateInput, validateOutput, createDynamicSingleSchema } from './common';
import {
  getProjectRolesParamsSchema,
  projectRoleSchema,
  addProjectRoleInputSchema,
  removeProjectRoleInputSchema,
} from './project-roles.schemas';

import type {
  IAuditLogger,
  IProjectRepository,
  IProjectRoleRepository,
  IProjectRoleService,
  IRoleRepository,
} from '@grantjs/core';

export class ProjectRoleService implements IProjectRoleService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly roleRepository: IRoleRepository,
    private readonly projectRoleRepository: IProjectRoleRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async projectExists(projectId: string, transaction?: Transaction): Promise<void> {
    const projects = await this.projectRepository.getProjects(
      { ids: [projectId], limit: 1 },
      transaction
    );

    if (projects.projects.length === 0) {
      throw new NotFoundError('Project');
    }
  }

  private async roleExists(roleId: string, transaction?: Transaction): Promise<void> {
    const roles = await this.roleRepository.getRoles({ ids: [roleId], limit: 1 }, transaction);

    if (roles.roles.length === 0) {
      throw new NotFoundError('Role');
    }
  }

  private async projectHasRole(
    projectId: string,
    roleId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectExists(projectId, transaction);
    await this.roleExists(roleId, transaction);
    const existingProjectRoles = await this.projectRoleRepository.getProjectRoles(
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

    const result = await this.projectRoleRepository.getProjectRoles(validatedParams, transaction);
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
      throw new ConflictError('Project already has this role', 'ProjectRole', 'roleId');
    }

    const projectRole = await this.projectRoleRepository.addProjectRole(
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

    await this.audit.logCreate(projectRole.id, newValues, metadata, transaction);

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
      throw new NotFoundError('Role');
    }

    const isHardDelete = hardDelete === true;

    const projectRole = isHardDelete
      ? await this.projectRoleRepository.hardDeleteProjectRole({ projectId, roleId }, transaction)
      : await this.projectRoleRepository.softDeleteProjectRole({ projectId, roleId }, transaction);

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
      await this.audit.logHardDelete(projectRole.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(projectRole.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(projectRoleSchema), projectRole, context);
  }
}
