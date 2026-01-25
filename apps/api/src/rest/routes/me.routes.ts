import { Response, Router } from 'express';

import { authenticateRestRoute } from '@/lib/authorization';
import { validate } from '@/middleware/validation.middleware';
import { TypedRequest } from '@/rest/types';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

import {
  changeMyPasswordRequestSchema,
  createMyUserAuthenticationMethodRequestSchema,
  deleteMyAccountsBodySchema,
  getMyUserSessionsQuerySchema,
  revokeMyUserSessionParamsSchema,
  uploadMyUserPictureRequestSchema,
} from '../schemas/me.schemas';

export function createMeRouter(context: RequestContext): Router {
  const router = Router();

  router.get('/', authenticateRestRoute, async (req, res) => {
    const me = await context.handlers.me.getMe();
    sendSuccessResponse(res, me);
  });

  router.post('/accounts', authenticateRestRoute, async (req, res) => {
    const result = await context.handlers.me.createMySecondaryAccount();
    sendSuccessResponse(res, result, 201);
  });

  router.delete(
    '/accounts',
    validate({ body: deleteMyAccountsBodySchema }),
    authenticateRestRoute,
    async (req: TypedRequest<{ body: typeof deleteMyAccountsBodySchema }>, res: Response) => {
      const result = await context.handlers.me.deleteMyAccounts({
        hardDelete: req.body.hardDelete ?? false,
      });
      sendSuccessResponse(res, result);
    }
  );

  router.get('/export', authenticateRestRoute, async (req, res) => {
    const { data, filename } = await context.handlers.me.myUserDataExport();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(data);
  });

  router.post(
    '/picture',
    validate({ body: uploadMyUserPictureRequestSchema }),
    authenticateRestRoute,
    async (req: TypedRequest<{ body: typeof uploadMyUserPictureRequestSchema }>, res: Response) => {
      const result = await context.handlers.me.uploadMyUserPicture({
        file: req.body.file,
        filename: req.body.filename,
        contentType: req.body.contentType,
      });
      sendSuccessResponse(res, result, 201);
    }
  );

  router.get('/authentication-methods', authenticateRestRoute, async (req, res) => {
    const methods = await context.handlers.me.myUserAuthenticationMethods();
    sendSuccessResponse(res, methods);
  });

  router.post(
    '/authentication-methods',
    validate({ body: createMyUserAuthenticationMethodRequestSchema }),
    authenticateRestRoute,
    async (
      req: TypedRequest<{
        body: typeof createMyUserAuthenticationMethodRequestSchema;
      }>,
      res: Response
    ) => {
      const result = await context.handlers.me.createMyUserAuthenticationMethod({
        provider: req.body.provider,
        providerId: req.body.providerId,
        providerData: req.body.providerData,
        isVerified: req.body.isVerified,
        isPrimary: req.body.isPrimary,
      });
      sendSuccessResponse(res, result, 201);
    }
  );

  router.post(
    '/change-password',
    validate({ body: changeMyPasswordRequestSchema }),
    authenticateRestRoute,
    async (req: TypedRequest<{ body: typeof changeMyPasswordRequestSchema }>, res: Response) => {
      await context.handlers.me.changeMyPassword({
        currentPassword: req.body.currentPassword,
        newPassword: req.body.newPassword,
      });
      sendSuccessResponse(res, {
        success: true,
        message: 'Password changed successfully',
      });
    }
  );

  router.get(
    '/sessions',
    validate({ query: getMyUserSessionsQuerySchema }),
    authenticateRestRoute,
    async (req: TypedRequest<{ query: typeof getMyUserSessionsQuerySchema }>, res: Response) => {
      const result = await context.handlers.me.myUserSessions({
        audience: req.query.audience,
        page: req.query.page,
        limit: req.query.limit,
      });
      sendSuccessResponse(res, result);
    }
  );

  router.delete(
    '/sessions/:sessionId',
    validate({
      params: revokeMyUserSessionParamsSchema,
    }),
    authenticateRestRoute,
    async (
      req: TypedRequest<{
        params: typeof revokeMyUserSessionParamsSchema;
      }>,
      res: Response
    ) => {
      await context.handlers.me.revokeMyUserSession(req.params.sessionId);
      sendSuccessResponse(res, {
        success: true,
        message: 'Session revoked successfully',
      });
    }
  );

  router.post('/logout', authenticateRestRoute, async (req, res) => {
    await context.handlers.me.logout();
    sendSuccessResponse(res, { message: 'Logged out successfully' });
  });

  return router;
}
