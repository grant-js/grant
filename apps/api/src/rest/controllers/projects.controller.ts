import { Response } from 'express';

import {
  CreateProjectMutationVariables,
  DeleteProjectMutationVariables,
  Project,
  ProjectWithRelations,
  QueryProjectsArgs,
  UpdateProjectMutationVariables,
} from '@logusgraphics/grant-schema';

import { parseRelations } from '@/lib/field-selection.lib';
import {
  createProjectRequestSchema,
  deleteProjectQuerySchema,
  getProjectsQuerySchema,
  projectParamsSchema,
  updateProjectRequestSchema,
} from '@/rest/schemas';
import {
  RequestContext,
  TypedRequest,
  TypedRequestBody,
  TypedRequestParams,
  TypedRequestQuery,
} from '@/types';

import { BaseController } from './base.controller';

export class ProjectsController extends BaseController {
  constructor(context: RequestContext) {
    super(context);
  }

  async getProjects(
    req: TypedRequest<TypedRequestQuery<typeof getProjectsQuerySchema>>,
    res: Response
  ): Promise<void> {
    const { page, limit, search, sortField, sortOrder, tagIds, scopeId, tenant, relations } =
      req.query;

    const requestedFields = parseRelations<ProjectWithRelations>(relations);

    try {
      const args: QueryProjectsArgs = {
        pagination: { page, limit },
        search: search || undefined,
        sortBy: sortField || undefined,
        sortOrder: sortOrder || undefined,
        tagIds: tagIds || undefined,
        scope: { scopeId, tenant },
      };

      const result = await this.handlers.projects.getProjects(
        args,
        requestedFields || (['id', 'name', 'slug', 'description'] as any)
      );

      this.ok(res, result);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch projects');
    }
  }

  async createProject(
    req: TypedRequest<TypedRequestBody<typeof createProjectRequestSchema>>,
    res: Response
  ): Promise<void> {
    try {
      const variables: CreateProjectMutationVariables = {
        input: req.body,
      };

      const project: Project = await this.handlers.projects.createProject(variables, [
        'id',
        'name',
        'slug',
        'description',
      ] as any);

      this.created(res, project);
    } catch (error) {
      this.handleError(res, error, 'Failed to create project');
    }
  }

  async updateProject(
    req: TypedRequest<
      TypedRequestBody<typeof updateProjectRequestSchema> &
        TypedRequestParams<typeof projectParamsSchema>
    >,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    try {
      const variables: UpdateProjectMutationVariables = {
        id,
        input: req.body,
      };

      const project: Project = await this.handlers.projects.updateProject(variables, [
        'id',
        'name',
        'slug',
        'description',
      ] as any);

      this.ok(res, project);
    } catch (error) {
      this.handleError(res, error, 'Failed to update project');
    }
  }

  async deleteProject(
    req: TypedRequest<
      TypedRequestParams<typeof projectParamsSchema> &
        TypedRequestQuery<typeof deleteProjectQuerySchema>
    >,
    res: Response
  ): Promise<void> {
    const { id } = req.params;
    const { scopeId, tenant, hardDelete } = req.query;

    try {
      const variables: DeleteProjectMutationVariables = {
        id,
        scope: { scopeId, tenant },
        hardDelete: hardDelete || false,
      };

      const project: Project = await this.handlers.projects.deleteProject(variables, [
        'id',
        'name',
        'slug',
      ] as any);

      this.ok(res, project);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete project');
    }
  }
}
