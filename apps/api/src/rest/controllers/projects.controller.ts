import {
  CreateProjectMutationVariables,
  DeleteProjectMutationVariables,
  Project,
  UpdateProjectMutationVariables,
} from '@logusgraphics/grant-schema';
import { Response } from 'express';

import { BaseController } from './base.controller';

import { parseRelations } from '@/lib/field-selection.lib';
import {
  createProjectRequestSchema,
  deleteProjectQuerySchema,
  getProjectsQuerySchema,
  projectParamsSchema,
  updateProjectRequestSchema,
} from '@/rest/schemas';
import {
  TypedRequest,
  TypedRequestBody,
  TypedRequestParams,
  TypedRequestQuery,
} from '@/rest/types';
import { RequestContext } from '@/types';

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

    const requestedFields = parseRelations<Project>(relations);

    try {
      const result = await this.handlers.projects.getProjects({
        page,
        limit,
        search: search || undefined,
        sort: sortField && sortOrder ? { field: sortField, order: sortOrder } : undefined,
        tagIds: tagIds || undefined,
        scope: { id: scopeId, tenant },
        requestedFields: requestedFields || (['id', 'name', 'slug', 'description'] as any),
      });

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

      const project: Project = await this.handlers.projects.createProject(variables);

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

      const project: Project = await this.handlers.projects.updateProject(variables);

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
    const { scopeId, tenant } = req.query;

    try {
      const variables: DeleteProjectMutationVariables = {
        id,
        scope: { id: scopeId, tenant },
      };

      const project: Project = await this.handlers.projects.deleteProject(variables);

      this.ok(res, project);
    } catch (error) {
      this.handleError(res, error, 'Failed to delete project');
    }
  }
}
