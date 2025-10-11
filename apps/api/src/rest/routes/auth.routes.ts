import { Router } from 'express';

import { validateBody } from '@/middleware/validation.middleware';
import { AuthController } from '@/rest/controllers/auth.controller';
import {
  loginRequestSchema,
  logoutRequestSchema,
  refreshSessionRequestSchema,
  registerRequestSchema,
} from '@/rest/schemas';
import { TypedRequest } from '@/rest/types';
import { RequestContext } from '@/types';

export function createAuthRoutes(context: RequestContext) {
  const router = Router();
  const authController = new AuthController(context);

  router.post('/login', validateBody(loginRequestSchema), (req, res) =>
    authController.login(req as TypedRequest<{ body: typeof loginRequestSchema }>, res)
  );

  router.post('/register', validateBody(registerRequestSchema), (req, res) =>
    authController.register(req as TypedRequest<{ body: typeof registerRequestSchema }>, res)
  );

  router.post('/refresh', validateBody(refreshSessionRequestSchema), (req, res) =>
    authController.refreshSession(
      req as TypedRequest<{ body: typeof refreshSessionRequestSchema }>,
      res
    )
  );

  router.post('/logout', validateBody(logoutRequestSchema), (req, res) =>
    authController.logout(req as TypedRequest<{ body: typeof logoutRequestSchema }>, res)
  );

  return router;
}
