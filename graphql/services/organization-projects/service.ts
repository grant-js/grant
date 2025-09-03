import {
  AddOrganizationProjectInput,
  OrganizationProject,
  RemoveOrganizationProjectInput,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { organizationProjectsAuditLogs } from '@/graphql/repositories/organization-projects/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from '../common';

import {
  organizationProjectSchema,
  removeOrganizationProjectInputSchema,
  queryOrganizationProjectsArgsSchema,
  addOrganizationProjectInputSchema,
} from './schemas';

export class OrganizationProjectService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(organizationProjectsAuditLogs, 'organizationProjectId', user, db);
  }

  private async organizationExists(organizationId: string): Promise<void> {
    const organizations = await this.repositories.organizationRepository.getOrganizations({
      ids: [organizationId],
      limit: 1,
    });

    if (organizations.organizations.length === 0) {
      throw new Error('Organization not found');
    }
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

  private async organizationHasProject(
    organizationId: string,
    projectId: string
  ): Promise<boolean> {
    await this.organizationExists(organizationId);
    await this.projectExists(projectId);
    const existingOrganizationProjects =
      await this.repositories.organizationProjectRepository.getOrganizationProjects({
        organizationId,
      });

    return existingOrganizationProjects.some((op) => op.projectId === projectId);
  }

  public async getOrganizationProjects(params: {
    organizationId: string;
  }): Promise<OrganizationProject[]> {
    const validationContext = 'OrganizationProjectService.getOrganizationProjects';
    const validatedParams = validateInput(
      queryOrganizationProjectsArgsSchema,
      params,
      validationContext
    );

    const { organizationId } = validatedParams;

    await this.organizationExists(organizationId);

    const result = await this.repositories.organizationProjectRepository.getOrganizationProjects({
      organizationId,
    });

    return validateOutput(
      createDynamicSingleSchema(organizationProjectSchema).array(),
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

    const hasProject = await this.organizationHasProject(organizationId, projectId);

    if (hasProject) {
      throw new Error('Organization already has this project');
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
      throw new Error('Organization does not have this project');
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
