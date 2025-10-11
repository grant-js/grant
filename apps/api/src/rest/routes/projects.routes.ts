import { Router } from 'express';

import { ProjectsController } from '../controllers/projects.controller';

import { validate } from '@/middleware/validation.middleware';
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

export function createProjectsRouter(context: RequestContext): Router {
  const router = Router();
  const projectsController = new ProjectsController(context);

  router.get('/', validate({ query: getProjectsQuerySchema }), (req, res) =>
    projectsController.getProjects(
      req as TypedRequest<TypedRequestQuery<typeof getProjectsQuerySchema>>,
      res
    )
  );

  router.post('/', validate({ body: createProjectRequestSchema }), (req, res) =>
    projectsController.createProject(
      req as TypedRequest<TypedRequestBody<typeof createProjectRequestSchema>>,
      res
    )
  );

  router.patch(
    '/:id',
    validate({ params: projectParamsSchema, body: updateProjectRequestSchema }),
    (req, res) =>
      projectsController.updateProject(
        req as TypedRequest<
          TypedRequestBody<typeof updateProjectRequestSchema> &
            TypedRequestParams<typeof projectParamsSchema>
        >,
        res
      )
  );

  router.delete(
    '/:id',
    validate({ params: projectParamsSchema, query: deleteProjectQuerySchema }),
    (req, res) =>
      projectsController.deleteProject(
        req as TypedRequest<
          TypedRequestParams<typeof projectParamsSchema> &
            TypedRequestQuery<typeof deleteProjectQuerySchema>
        >,
        res
      )
  );

  return router;
}
