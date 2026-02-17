import { UserAuthenticationEmailProviderAction } from '@grantjs/schema';
import { Response, Router } from 'express';

import { config } from '@/config';
import { t } from '@/i18n';
import { authenticateRestRoute } from '@/lib/authorization';
import { AuthenticationError } from '@/lib/errors';
import { getRefreshTokenFromCookie } from '@/lib/headers.lib';
import { createLogger } from '@/lib/logger';
import { validate, validateBody, validateQuery } from '@/middleware/validation.middleware';
import {
  cliCallbackRequestSchema,
  handleGithubCallbackQuerySchema,
  initiateGithubAuthQuerySchema,
  isAuthorizedRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  requestPasswordResetRequestSchema,
  resendVerificationRequestSchema,
  resetPasswordRequestSchema,
  verifyEmailRequestSchema,
} from '@/rest/schemas';
import { exchangeApiKeyRequestSchema } from '@/rest/schemas/api-keys.schemas';
import { TypedRequest } from '@/rest/types';
import {
  buildAuthRedirectUrl,
  determineErrorCode,
  handleGithubCallbackAuth,
  handleGithubCallbackConnect,
  handleGithubConnectFlow,
  handleGithubOAuthError,
  isCliRedirectUrl,
  validateRedirectUrl,
} from '@/rest/utils/auth';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '@/rest/utils/refresh-cookie';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

const logger = createLogger('AuthRoutes');

export function createAuthRoutes(context: RequestContext) {
  const router = Router();

  router.post(
    '/login',
    validateBody(loginRequestSchema),
    async (req: TypedRequest<{ body: typeof loginRequestSchema }>, res: Response) => {
      const { provider, providerId, providerData } = req.body;

      const result = await context.handlers.auth.login(
        {
          input: {
            provider,
            providerId,
            providerData: { ...providerData, action: UserAuthenticationEmailProviderAction.Login },
          },
        },
        context.userAgent,
        context.ipAddress
      );

      setRefreshTokenCookie(res, result.refreshToken);
      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/register',
    validateBody(registerRequestSchema),
    async (req: TypedRequest<{ body: typeof registerRequestSchema }>, res: Response) => {
      const { type, provider, providerId, providerData } = req.body;

      const result = await context.handlers.auth.register(
        {
          type,
          provider,
          providerId,
          providerData,
        },
        context.locale,
        context.userAgent,
        context.ipAddress,
        context.requestLogger
      );

      setRefreshTokenCookie(res, result.refreshToken);
      context.requestLogger.info({
        msg: 'User registered',
        accountId: result.account?.id,
      });
      sendSuccessResponse(res, result, 201);
    }
  );

  router.post('/refresh', async (req: TypedRequest<Record<string, never>>, res: Response) => {
    const refreshTokenFromCookie = getRefreshTokenFromCookie(req);
    if (!refreshTokenFromCookie) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
    try {
      const result = await context.handlers.auth.refreshSession(
        refreshTokenFromCookie,
        context.userAgent,
        context.ipAddress
      );
      setRefreshTokenCookie(res, result.refreshToken);
      sendSuccessResponse(res, { accessToken: result.accessToken });
    } catch (err) {
      clearRefreshTokenCookie(res);
      if (err instanceof AuthenticationError) throw err;
      throw new AuthenticationError('Invalid or expired refresh token');
    }
  });

  router.post(
    '/verify-email',
    validateBody(verifyEmailRequestSchema),
    async (req: TypedRequest<{ body: typeof verifyEmailRequestSchema }>, res: Response) => {
      const { token } = req.body;

      const result = await context.handlers.auth.verifyEmail(token, context.locale);

      context.requestLogger.info({ msg: 'Email verified' });
      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/resend-verification',
    validateBody(resendVerificationRequestSchema),
    async (req: TypedRequest<{ body: typeof resendVerificationRequestSchema }>, res: Response) => {
      const { email } = req.body;

      const result = await context.handlers.auth.resendVerificationEmail(
        email,
        context.locale,
        context.requestLogger
      );

      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/request-password-reset',
    validateBody(requestPasswordResetRequestSchema),
    async (
      req: TypedRequest<{ body: typeof requestPasswordResetRequestSchema }>,
      res: Response
    ) => {
      const { email } = req.body;

      const result = await context.handlers.auth.requestPasswordReset(
        email,
        context.locale,
        context.requestLogger
      );

      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/reset-password',
    validateBody(resetPasswordRequestSchema),
    async (req: TypedRequest<{ body: typeof resetPasswordRequestSchema }>, res: Response) => {
      const { token, newPassword } = req.body;

      const result = await context.handlers.auth.resetPassword(
        token,
        newPassword,
        context.locale,
        context.requestLogger
      );

      sendSuccessResponse(res, result);
    }
  );

  router.get(
    '/github',
    validateQuery(initiateGithubAuthQuerySchema),
    async (req: TypedRequest<{ query: typeof initiateGithubAuthQuerySchema }>, res: Response) => {
      const { redirect, accountType, action } = req.query;

      // For connect flow, require authenticated user
      if (action === UserAuthenticationEmailProviderAction.Connect) {
        if (!context.user) {
          const frontendUrl = config.security.frontendUrl;
          const locale = context.locale || 'en';
          res.redirect(`${frontendUrl}/${locale}/auth/login?error=authenticationRequired`);
          return;
        }

        const authorizationUrl = await handleGithubConnectFlow(
          context,
          redirect,
          context.user.userId
        );
        res.redirect(authorizationUrl);
        return;
      }

      // Validate redirect URL if provided
      if (redirect && !validateRedirectUrl(redirect)) {
        logger.warn({
          msg: 'OAuth initiate - invalid redirect URL',
          redirectUrl: redirect,
          expectedOrigin: new URL(config.security.frontendUrl).origin,
        });
        const result = await context.handlers.oauth.initiateGithubAuth({});
        res.redirect(result.authorizationUrl);
        return;
      }

      const result = await context.handlers.oauth.initiateGithubAuth({
        redirectUrl: redirect,
        accountType,
        action: action || UserAuthenticationEmailProviderAction.Login,
      });

      res.redirect(result.authorizationUrl);
    }
  );

  router.get(
    '/github/callback',
    validateQuery(handleGithubCallbackQuerySchema),
    async (req: TypedRequest<{ query: typeof handleGithubCallbackQuerySchema }>, res: Response) => {
      const { error, error_description, code, state } = req.query;
      const locale = context.locale || 'en';
      const frontendUrl = config.security.frontendUrl;

      // Handle OAuth errors from GitHub
      if (error) {
        // CLI flow: redirect to CLI localhost with error (not same origin as frontend)
        if (state && typeof state === 'string') {
          const storedState = await context.handlers.oauth.getStoredState(state);
          if (storedState?.redirectUrl && isCliRedirectUrl(storedState.redirectUrl, frontendUrl)) {
            const url = new URL(storedState.redirectUrl);
            url.searchParams.set('error', 'oauthError');
            if (error_description) url.searchParams.set('error_description', error_description);
            res.redirect(url.toString());
            return;
          }
        }
        handleGithubOAuthError(res, error, error_description, locale);
        return;
      }

      // Capture CLI redirect URL before handleGithubCallback consumes state (for error redirect in catch)
      let cliRedirectUrl: string | null = null;
      if (state && typeof state === 'string') {
        const storedState = await context.handlers.oauth.getStoredState(state);
        if (storedState?.redirectUrl && isCliRedirectUrl(storedState.redirectUrl, frontendUrl)) {
          cliRedirectUrl = storedState.redirectUrl;
        }
      }

      try {
        const oauthResult = await context.handlers.oauth.handleGithubCallback(code, state);

        // Handle connect flow (linking GitHub to existing authenticated user)
        const handledConnect = await handleGithubCallbackConnect(context, res, oauthResult);
        if (handledConnect) {
          return;
        }

        // Handle authentication flow (login/register)
        const loginResult = await handleGithubCallbackAuth(context, oauthResult);

        const isCli = isCliRedirectUrl(oauthResult.redirectUrl, frontendUrl);

        // CLI flow: redirect to CLI localhost (different origin from frontend) with one-time code
        if (oauthResult.redirectUrl && isCli) {
          const oneTimeCode = await context.handlers.oauth.storeCliCallbackPayload({
            accessToken: loginResult.accessToken,
            refreshToken: loginResult.refreshToken,
            accounts: loginResult.accounts,
          });
          const url = new URL(oauthResult.redirectUrl);
          url.searchParams.set('code', oneTimeCode);
          res.redirect(url.toString());
          return;
        }

        // Browser flow: set refresh token cookie and redirect to nextUrl (e.g. /dashboard).
        const nextUrl = buildAuthRedirectUrl(oauthResult, locale);
        setRefreshTokenCookie(res, loginResult.refreshToken);
        res.redirect(nextUrl);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorCode = determineErrorCode(err);
        logger.error({
          msg: 'Error handling GitHub OAuth callback',
          err,
          errorMessage,
          errorCode,
          redirectToLoginWithError: errorCode,
        });

        if (cliRedirectUrl) {
          const url = new URL(cliRedirectUrl);
          url.searchParams.set('error', errorCode);
          res.redirect(url.toString());
          return;
        }

        res.redirect(`${frontendUrl}/${locale}/auth/login?error=${errorCode}`);
      }
    }
  );

  router.post(
    '/cli-callback',
    validateBody(cliCallbackRequestSchema),
    async (req: TypedRequest<{ body: typeof cliCallbackRequestSchema }>, res: Response) => {
      const { code } = req.body;
      const payload = await context.handlers.oauth.consumeCliCallbackCode(code);
      if (!payload) {
        res.status(400).json({
          success: false,
          error: {
            code: 'invalid_or_expired_code',
            message: t(req, 'errors.auth.invalidOrExpiredCode'),
            translationKey: 'errors.auth.invalidOrExpiredCode',
          },
        });
        return;
      }
      sendSuccessResponse(res, payload);
    }
  );

  router.post(
    '/token',
    validate({ body: exchangeApiKeyRequestSchema }),
    async (req: TypedRequest<{ body: typeof exchangeApiKeyRequestSchema }>, res: Response) => {
      const { clientId, clientSecret, scope } = req.body;

      const result = await context.handlers.apiKeys.exchangeApiKey({
        input: {
          clientId,
          clientSecret,
          scope,
        },
      });

      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/is-authorized',
    authenticateRestRoute,
    validate({ body: isAuthorizedRequestSchema }),
    async (req: TypedRequest<{ body: typeof isAuthorizedRequestSchema }>, res: Response) => {
      const result = await context.handlers.auth.isAuthorized(req.body);
      sendSuccessResponse(res, result);
    }
  );

  return router;
}
