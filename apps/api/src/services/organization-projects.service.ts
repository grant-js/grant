import { DbSchema } from '@logusgraphics/grant-database';
import { organizationProjectsAuditLogs } from '@logusgraphics/grant-database';
import {
  AddOrganizationProjectInput,
  OrganizationProject,
  RemoveOrganizationProjectInput,
} from '@logusgraphics/grant-schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';
import { AuthenticatedUser } from '@/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from './common';
import {
  organizationProjectSchema,
  removeOrganizationProjectInputSchema,
  queryOrganizationProjectsArgsSchema,
  addOrganizationProjectInputSchema,
  queryOrganizationProjectArgsSchema,
} from './organization-projects.schemas';

export class OrganizationProjectService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(organizationProjectsAuditLogs, 'organizationProjectId', user, db);
  }

  private async organizationExists(
    organizationId: string,
    transaction?: Transaction
  ): Promise<void> {
    const organizations = await this.repositories.organizationRepository.getOrganizations(
      {
        ids: [organizationId],
        limit: 1,
      },
      transaction
    );

    if (organizations.organizations.length === 0) {
      throw new NotFoundError('Organization not found', 'errors:notFound.organization');
    }
  }

  private async projectExists(projectId: string, transaction?: Transaction): Promise<void> {
    const projects = await this.repositories.projectRepository.getProjects(
      {
        ids: [projectId],
        limit: 1,
      },
      transaction
    );

    if (projects.projects.length === 0) {
      throw new NotFoundError('Project not found', 'errors:notFound.project');
    }
  }

  private async organizationHasProject(
    organizationId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.organizationExists(organizationId, transaction);
    await this.projectExists(projectId, transaction);
    const existingOrganizationProjects =
      await this.repositories.organizationProjectRepository.getOrganizationProjects(
        { organizationId },
        transaction
      );
    return existingOrganizationProjects.some((op) => op.projectId === projectId);
  }

  public async getOrganizationProjects(
    params: { organizationId: string },
    transaction?: Transaction
  ): Promise<OrganizationProject[]> {
    const validationContext = 'OrganizationProjectService.getOrganizationProjects';
    const validatedParams = validateInput(
      queryOrganizationProjectsArgsSchema,
      params,
      validationContext
    );

    const { organizationId } = validatedParams;

    await this.organizationExists(organizationId, transaction);

    const result = await this.repositories.organizationProjectRepository.getOrganizationProjects(
      { organizationId },
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(organizationProjectSchema).array(),
      result,
      validationContext
    );
  }

  public async getOrganizationProject(
    params: { projectId: string },
    transaction?: Transaction
  ): Promise<OrganizationProject> {
    const validationContext = 'OrganizationProjectService.getOrganizationProject';
    const validatedParams = validateInput(
      queryOrganizationProjectArgsSchema,
      params,
      validationContext
    );
    const { projectId } = validatedParams;

    await this.projectExists(projectId, transaction);

    const result = await this.repositories.organizationProjectRepository.getOrganizationProject(
      { projectId },
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(organizationProjectSchema),
      result,
      validationContext
    );
  }

  public async addOrganizationProject(
    params: AddOrganizationProjectInput,
    transaction?: Transaction
  ): Promise<OrganizationProject> {
    const context = 'OrganizationProjectService.addOrganizationProject';
    const validatedParams = validateInput(addOrganizationProjectInputSchema, params, context);

    const { organizationId, projectId } = validatedParams;
    const hasProject = await this.organizationHasProject(organizationId, projectId, transaction);

    if (hasProject) {
      throw new ConflictError(
        'Organization already has this project',
        'errors:conflict.duplicateEntry',
        { resource: 'OrganizationProject', field: 'projectId' }
      );
    }

    const organizationProject =
      await this.repositories.organizationProjectRepository.addOrganizationProject(
        { organizationId, projectId },
        transaction
      );

    const newValues = {
      id: organizationProject.id,
      organizationId: organizationProject.organizationId,
      projectId: organizationProject.projectId,
      createdAt: organizationProject.createdAt,
      updatedAt: organizationProject.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(organizationProject.id, newValues, metadata, transaction);

    return validateOutput(
      createDynamicSingleSchema(organizationProjectSchema),
      organizationProject,
      context
    );
  }

  public async removeOrganizationProject(
    params: RemoveOrganizationProjectInput & DeleteParams,
    transaction?: Transaction
  ): Promise<OrganizationProject> {
    const context = 'OrganizationProjectService.removeOrganizationProject';
    const validatedParams = validateInput(removeOrganizationProjectInputSchema, params, context);

    const { organizationId, projectId, hardDelete } = validatedParams;

    const hasProject = await this.organizationHasProject(organizationId, projectId);

    if (!hasProject) {
      throw new NotFoundError('Organization does not have this project', 'errors:notFound.project');
    }

    const isHardDelete = hardDelete === true;

    const organizationProject = isHardDelete
      ? await this.repositories.organizationProjectRepository.hardDeleteOrganizationProject(
          organizationId,
          projectId,
          transaction
        )
      : await this.repositories.organizationProjectRepository.softDeleteOrganizationProject(
          organizationId,
          projectId,
          transaction
        );

    const oldValues = {
      id: organizationProject.id,
      organizationId: organizationProject.organizationId,
      projectId: organizationProject.projectId,
      createdAt: organizationProject.createdAt,
      updatedAt: organizationProject.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: organizationProject.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(organizationProject.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(organizationProject.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(
      createDynamicSingleSchema(organizationProjectSchema),
      organizationProject,
      context
    );
  }
}
