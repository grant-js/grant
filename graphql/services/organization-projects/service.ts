import {
  MutationAddOrganizationProjectArgs,
  MutationRemoveOrganizationProjectArgs,
  OrganizationProject,
  QueryOrganizationProjectsArgs,
} from '@/graphql/generated/types';
import {
  IOrganizationProjectRepository,
  IOrganizationRepository,
  IProjectRepository,
} from '@/graphql/repositories';
import { organizationProjectsAuditLogs } from '@/graphql/repositories/organization-projects/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, createDynamicSingleSchema } from '../common';

import { IOrganizationProjectService } from './interface';
import {
  getOrganizationProjectsParamsSchema,
  addOrganizationProjectParamsSchema,
  removeOrganizationProjectParamsSchema,
  organizationProjectSchema,
} from './schemas';

export class OrganizationProjectService
  extends AuditService
  implements IOrganizationProjectService
{
  constructor(
    private readonly organizationProjectRepository: IOrganizationProjectRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly projectRepository: IProjectRepository,
    user: AuthenticatedUser | null
  ) {
    super(organizationProjectsAuditLogs, 'organizationProjectId', user);
  }

  private async organizationExists(organizationId: string): Promise<void> {
    const organizations = await this.organizationRepository.getOrganizations({
      ids: [organizationId],
      limit: 1,
    });

    if (organizations.organizations.length === 0) {
      throw new Error('Organization not found');
    }
  }

  private async projectExists(projectId: string): Promise<void> {
    const project = await this.projectRepository.getProjectById(projectId);

    if (!project) {
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
      await this.organizationProjectRepository.getOrganizationProjects({
        organizationId,
      });

    return existingOrganizationProjects.some((op) => op.projectId === projectId);
  }

  public async getOrganizationProjects(
    params: Omit<QueryOrganizationProjectsArgs, 'scope'>
  ): Promise<OrganizationProject[]> {
    const validatedParams = validateInput(
      getOrganizationProjectsParamsSchema,
      params,
      'getOrganizationProjects method'
    );

    await this.organizationExists(validatedParams.organizationId);

    const result =
      await this.organizationProjectRepository.getOrganizationProjects(validatedParams);
    return validateOutput(
      createDynamicSingleSchema(organizationProjectSchema).array(),
      result,
      'getOrganizationProjects method'
    );
  }

  public async addOrganizationProject(
    params: MutationAddOrganizationProjectArgs
  ): Promise<OrganizationProject> {
    const validatedParams = validateInput(
      addOrganizationProjectParamsSchema,
      params,
      'addOrganizationProject method'
    );

    const hasProject = await this.organizationHasProject(
      validatedParams.input.organizationId,
      validatedParams.input.projectId
    );

    if (hasProject) {
      throw new Error('Organization already has this project');
    }

    const organizationProject = await this.organizationProjectRepository.addOrganizationProject(
      validatedParams.input.organizationId,
      validatedParams.input.projectId
    );

    const newValues = {
      id: organizationProject.id,
      organizationId: organizationProject.organizationId,
      projectId: organizationProject.projectId,
      createdAt: organizationProject.createdAt,
      updatedAt: organizationProject.updatedAt,
    };

    const metadata = {
      source: 'add_organization_project_mutation',
    };

    await this.logCreate(organizationProject.id, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(organizationProjectSchema),
      organizationProject,
      'addOrganizationProject method'
    );
  }

  public async removeOrganizationProject(
    params: MutationRemoveOrganizationProjectArgs & { hardDelete?: boolean }
  ): Promise<OrganizationProject> {
    const validatedParams = validateInput(
      removeOrganizationProjectParamsSchema,
      params,
      'removeOrganizationProject method'
    );

    const hasProject = await this.organizationHasProject(
      validatedParams.input.organizationId,
      validatedParams.input.projectId
    );

    if (!hasProject) {
      throw new Error('Organization does not have this project');
    }

    const isHardDelete = params.hardDelete === true;

    const organizationProject = isHardDelete
      ? await this.organizationProjectRepository.hardDeleteOrganizationProject(
          validatedParams.input.organizationId,
          validatedParams.input.projectId
        )
      : await this.organizationProjectRepository.softDeleteOrganizationProject(
          validatedParams.input.organizationId,
          validatedParams.input.projectId
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

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_organization_project_mutation',
      };
      await this.logHardDelete(organizationProject.id, oldValues, metadata);
    } else {
      const metadata = {
        source: 'soft_delete_organization_project_mutation',
      };
      await this.logSoftDelete(organizationProject.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(organizationProjectSchema),
      organizationProject,
      'removeOrganizationProject method'
    );
  }
}
