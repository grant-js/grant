import {
  QueryProjectsArgs,
  MutationCreateProjectArgs,
  MutationUpdateProjectArgs,
  MutationDeleteProjectArgs,
  Project,
  ProjectPage,
} from '@/graphql/generated/types';
import { IProjectRepository } from '@/graphql/repositories/projects/interface';
import { projectAuditLogs } from '@/graphql/repositories/projects/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
} from '../common';

import { IProjectService } from './interface';
import {
  getProjectsParamsSchema,
  createProjectParamsSchema,
  updateProjectParamsSchema,
  deleteProjectParamsSchema,
  projectSchema,
} from './schemas';

export class ProjectService extends AuditService implements IProjectService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    user: AuthenticatedUser | null
  ) {
    super(projectAuditLogs, 'projectId', user);
  }

  private async getProject(projectId: string): Promise<Project> {
    const project = await this.projectRepository.getProjects({
      ids: [projectId],
      limit: 1,
    });

    if (project.projects.length === 0) {
      throw new Error('Project not found');
    }

    return project.projects[0];
  }

  public async getProjects(
    params: Omit<QueryProjectsArgs, 'scope'> & { requestedFields?: string[] }
  ): Promise<ProjectPage> {
    const validatedParams = validateInput(getProjectsParamsSchema, params, 'getProjects method');
    const result = await this.projectRepository.getProjects(validatedParams as any);

    // Transform repository result to standard format for validation
    const transformedResult = {
      items: result.projects,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };

    const validatedResult = validateOutput(
      createDynamicPaginatedSchema(projectSchema, params.requestedFields),
      transformedResult,
      'getProjects method'
    ) as any;

    return {
      projects: validatedResult.items,
      totalCount: validatedResult.totalCount,
      hasNextPage: validatedResult.hasNextPage,
    };
  }

  public async createProject(params: MutationCreateProjectArgs): Promise<Project> {
    const validatedParams = validateInput(
      createProjectParamsSchema,
      params,
      'createProject method'
    );
    const project = await this.projectRepository.createProject(validatedParams);

    const newValues = {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    const metadata = {
      source: 'create_project_mutation',
    };

    await this.logCreate(project.id, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(projectSchema),
      project,
      'createProject method'
    );
  }

  public async updateProject(params: MutationUpdateProjectArgs): Promise<Project> {
    const validatedParams = validateInput(
      updateProjectParamsSchema,
      params,
      'updateProject method'
    );

    const oldProject = await this.getProject(validatedParams.id);
    const updatedProject = await this.projectRepository.updateProject(validatedParams);

    const oldValues = {
      id: oldProject.id,
      name: oldProject.name,
      slug: oldProject.slug,
      description: oldProject.description,
      createdAt: oldProject.createdAt,
      updatedAt: oldProject.updatedAt,
    };

    const newValues = {
      id: updatedProject.id,
      name: updatedProject.name,
      slug: updatedProject.slug,
      description: updatedProject.description,
      createdAt: updatedProject.createdAt,
      updatedAt: updatedProject.updatedAt,
    };

    const metadata = {
      source: 'update_project_mutation',
    };

    await this.logUpdate(updatedProject.id, oldValues, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(projectSchema),
      updatedProject,
      'updateProject method'
    );
  }

  public async deleteProject(
    params: MutationDeleteProjectArgs & { hardDelete?: boolean }
  ): Promise<Project> {
    const validatedParams = validateInput(
      deleteProjectParamsSchema,
      params,
      'deleteProject method'
    );

    const oldProject = await this.getProject(validatedParams.id);
    const isHardDelete = params.hardDelete === true;

    const deletedProject = isHardDelete
      ? await this.projectRepository.hardDeleteProject(validatedParams)
      : await this.projectRepository.softDeleteProject(validatedParams);

    const oldValues = {
      id: oldProject.id,
      name: oldProject.name,
      slug: oldProject.slug,
      description: oldProject.description,
      createdAt: oldProject.createdAt,
      updatedAt: oldProject.updatedAt,
    };

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_project_mutation',
      };
      await this.logHardDelete(deletedProject.id, oldValues, metadata);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedProject.deletedAt,
      };

      const metadata = {
        source: 'soft_delete_project_mutation',
      };
      await this.logSoftDelete(deletedProject.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(projectSchema),
      deletedProject,
      'deleteProject method'
    );
  }
}
