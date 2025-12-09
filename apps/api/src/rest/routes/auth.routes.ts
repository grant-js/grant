import { Router } from 'express';

import { validate, validateBody } from '@/middleware/validation.middleware';
import { ApiKeysController } from '@/rest/controllers/api-keys.controller';
import { AuthController } from '@/rest/controllers/auth.controller';
import { OAuthController } from '@/rest/controllers/oauth.controller';
import {
  loginRequestSchema,
  logoutRequestSchema,
  refreshSessionRequestSchema,
  registerRequestSchema,
  requestPasswordResetRequestSchema,
  resendVerificationRequestSchema,
  resetPasswordRequestSchema,
  verifyEmailRequestSchema,
} from '@/rest/schemas';
import { exchangeApiKeyRequestSchema } from '@/rest/schemas/api-keys.schemas';
import { TypedRequest } from '@/rest/types';
import { RequestContext } from '@/types';

export function createAuthRoutes(context: RequestContext) {
  const router = Router();
  const authController = new AuthController(context);
  const oauthController = new OAuthController(context);
  const apiKeysController = new ApiKeysController(context);

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

  router.post('/verify-email', validateBody(verifyEmailRequestSchema), (req, res) =>
    authController.verifyEmail(req as TypedRequest<{ body: typeof verifyEmailRequestSchema }>, res)
  );

  router.post('/resend-verification', validateBody(resendVerificationRequestSchema), (req, res) =>
    authController.resendVerification(
      req as TypedRequest<{ body: typeof resendVerificationRequestSchema }>,
      res
    )
  );

  router.post(
    '/request-password-reset',
    validateBody(requestPasswordResetRequestSchema),
    (req, res) =>
      authController.requestPasswordReset(
        req as TypedRequest<{ body: typeof requestPasswordResetRequestSchema }>,
        res
      )
  );

  router.post('/reset-password', validateBody(resetPasswordRequestSchema), (req, res) =>
    authController.resetPassword(
      req as TypedRequest<{ body: typeof resetPasswordRequestSchema }>,
      res
    )
  );

  router.get('/github', (req, res) =>
    oauthController.initiateGithubAuth(req as TypedRequest<{ query: { redirect?: string } }>, res)
  );

  router.get('/github/callback', (req, res) =>
    oauthController.handleGithubCallback(
      req as TypedRequest<{
        query: { code?: string; state?: string; error?: string; error_description?: string };
      }>,
      res
    )
  );

  router.get('/me', (req, res) => authController.me(req as TypedRequest, res));

  router.post('/token', validate({ body: exchangeApiKeyRequestSchema }), (req, res) =>
    apiKeysController.exchangeApiKey(
      req as TypedRequest<{
        body: typeof exchangeApiKeyRequestSchema;
      }>,
      res
    )
  );

  return router;
}
