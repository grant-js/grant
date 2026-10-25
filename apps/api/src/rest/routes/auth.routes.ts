import { UserAuthenticationEmailProviderAction } from '@grantjs/schema';
import { Response, Router } from 'express';

import { config, SOCIAL_OAUTH_PROVIDERS } from '@/config';
import type { ProjectOAuthProvider } from '@/config/env.config';
import { t } from '@/i18n';
import { authenticateRestRoute } from '@/lib/authorization';
import { AuthenticationError } from '@/lib/errors';
import { getRefreshTokenFromCookie } from '@/lib/headers.lib';
import { assertEmailProviderForDirectAuth } from '@/lib/oauth-direct-auth.lib';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '@/lib/refresh-cookie.lib';
import { validate, validateBody, validateQuery } from '@/middleware/validation.middleware';
import { requestContext } from '@/rest/request-context';
import {
  cliCallbackRequestSchema,
  handleGithubCallbackQuerySchema,
  initiateGithubAuthQuerySchema,
  isAuthorizedRequestSchema,
  loginRequestSchema,
  projectAppInfoQuerySchema,
  projectAuthorizeQuerySchema,
  projectCallbackQuerySchema,
  projectConsentApproveBodySchema,
  projectConsentDenyBodySchema,
  projectConsentInfoQuerySchema,
  projectEmailRequestSchema,
  projectPasswordMfaSchema,
  projectPasswordResetCompleteSchema,
  projectPasswordResetRequestSchema,
  projectPasswordSignInSchema,
  projectTokenBodySchema,
  refreshSessionRequestSchema,
  registerRequestSchema,
  requestPasswordResetRequestSchema,
  resendVerificationRequestSchema,
  resetPasswordRequestSchema,
  verifyEmailRequestSchema,
  verifyMfaRecoveryCodeRequestSchema,
  verifyMfaRequestSchema,
} from '@/rest/schemas';
import { exchangeApiKeyRequestSchema } from '@/rest/schemas/api-keys.schemas';
import { TypedRequest } from '@/rest/types';
import {
  buildAuthRedirectUrl,
  determineErrorCode,
  handleOAuthCallbackAuth,
  handleOAuthCallbackConnect,
  handleOAuthConnectFlow,
  handleOAuthError,
  isCliRedirectUrl,
  validateRedirectUrl,
} from '@/rest/utils/auth';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

export function createAuthRoutes(fallback?: RequestContext) {
  const router = Router();

  router.post(
    '/login',
    validateBody(loginRequestSchema),
    async (req: TypedRequest<{ body: typeof loginRequestSchema }>, res: Response) => {
      const { provider, providerId, providerData, emailVerificationProof } = req.body;
      assertEmailProviderForDirectAuth(provider);

      const result = await requestContext(req, fallback).handlers.auth.login(
        {
          input: {
            provider,
            providerId,
            providerData: { ...providerData, action: UserAuthenticationEmailProviderAction.Login },
            emailVerificationProof,
          },
        },
        requestContext(req, fallback).userAgent,
        requestContext(req, fallback).ipAddress,
        requestContext(req, fallback).requestBaseUrl
      );

      setRefreshTokenCookie(res, result.refreshToken);
      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/mfa/setup',
    authenticateRestRoute,
    async (req: TypedRequest<Record<string, never>>, res: Response) => {
      const user = requestContext(req, fallback).user;
      const userId = user?.userId;
      if (!userId) {
        throw new AuthenticationError('Unauthorized');
      }
      const me = await requestContext(req, fallback).handlers.me.getMe();
      const accountName = me.email?.trim() || userId;
      const result = await requestContext(req, fallback).handlers.auth.setupMfa(
        userId,
        accountName
      );
      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/mfa/verify',
    authenticateRestRoute,
    validateBody(verifyMfaRequestSchema),
    async (req: TypedRequest<{ body: typeof verifyMfaRequestSchema }>, res: Response) => {
      const user = requestContext(req, fallback).user;
      const userId = user?.userId;
      const sessionId = user?.tokenId;
      if (!userId || !sessionId) {
        throw new AuthenticationError('Unauthorized');
      }
      const result = await requestContext(req, fallback).handlers.auth.verifyMfa(
        userId,
        sessionId,
        req.body.code,
        requestContext(req, fallback).requestBaseUrl
      );
      setRefreshTokenCookie(res, result.refreshToken);
      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/mfa/recovery/verify',
    authenticateRestRoute,
    validateBody(verifyMfaRecoveryCodeRequestSchema),
    async (
      req: TypedRequest<{ body: typeof verifyMfaRecoveryCodeRequestSchema }>,
      res: Response
    ) => {
      const user = requestContext(req, fallback).user;
      const userId = user?.userId;
      const sessionId = user?.tokenId;
      if (!userId || !sessionId) {
        throw new AuthenticationError('Unauthorized');
      }
      const result = await requestContext(req, fallback).handlers.auth.verifyMfaRecoveryCode(
        userId,
        sessionId,
        req.body.code,
        requestContext(req, fallback).requestBaseUrl
      );
      setRefreshTokenCookie(res, result.refreshToken);
      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/register',
    validateBody(registerRequestSchema),
    async (req: TypedRequest<{ body: typeof registerRequestSchema }>, res: Response) => {
      const { type, provider, providerId, providerData, emailVerificationProof } = req.body;
      assertEmailProviderForDirectAuth(provider);

      const result = await requestContext(req, fallback).handlers.auth.register(
        {
          type,
          provider,
          providerId,
          providerData,
          emailVerificationProof,
        },
        requestContext(req, fallback).locale,
        requestContext(req, fallback).userAgent,
        requestContext(req, fallback).ipAddress,
        requestContext(req, fallback).requestLogger,
        requestContext(req, fallback).requestBaseUrl
      );

      setRefreshTokenCookie(res, result.refreshToken);
      requestContext(req, fallback).requestLogger.info({
        msg: 'User registered',
        accountId: result.account?.id,
      });
      sendSuccessResponse(res, result, 201);
    }
  );

  router.post(
    '/refresh',
    validateBody(refreshSessionRequestSchema),
    async (req: TypedRequest<{ body: typeof refreshSessionRequestSchema }>, res: Response) => {
      const refreshTokenFromCookie = getRefreshTokenFromCookie(req);
      const refreshToken = refreshTokenFromCookie ?? req.body.refreshToken;
      if (!refreshToken) {
        throw new AuthenticationError('Invalid or expired refresh token');
      }
      try {
        const result = await requestContext(req, fallback).handlers.auth.refreshSession(
          refreshToken,
          requestContext(req, fallback).userAgent,
          requestContext(req, fallback).ipAddress,
          requestContext(req, fallback).requestBaseUrl
        );
        setRefreshTokenCookie(res, result.refreshToken);
        sendSuccessResponse(res, {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
      } catch (err) {
        clearRefreshTokenCookie(res);
        if (err instanceof AuthenticationError) throw err;
        throw new AuthenticationError('Invalid or expired refresh token');
      }
    }
  );

  router.post(
    '/verify-email',
    validateBody(verifyEmailRequestSchema),
    async (req: TypedRequest<{ body: typeof verifyEmailRequestSchema }>, res: Response) => {
      const { token } = req.body;

      const result = await requestContext(req, fallback).handlers.auth.verifyEmail(
        token,
        requestContext(req, fallback).locale
      );

      requestContext(req, fallback).requestLogger.info({ msg: 'Email verified' });
      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/resend-verification',
    validateBody(resendVerificationRequestSchema),
    async (req: TypedRequest<{ body: typeof resendVerificationRequestSchema }>, res: Response) => {
      const { email } = req.body;

      const result = await requestContext(req, fallback).handlers.auth.resendVerificationEmail(
        email,
        requestContext(req, fallback).locale,
        requestContext(req, fallback).requestLogger
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

      const result = await requestContext(req, fallback).handlers.auth.requestPasswordReset(
        email,
        requestContext(req, fallback).locale,
        requestContext(req, fallback).requestLogger
      );

      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/reset-password',
    validateBody(resetPasswordRequestSchema),
    async (req: TypedRequest<{ body: typeof resetPasswordRequestSchema }>, res: Response) => {
      const { token, newPassword } = req.body;

      const result = await requestContext(req, fallback).handlers.auth.resetPassword(
        token,
        newPassword,
        requestContext(req, fallback).locale,
        requestContext(req, fallback).requestLogger
      );

      sendSuccessResponse(res, result);
    }
  );

  router.get('/providers', async (req: TypedRequest<Record<string, never>>, res: Response) => {
    const [providers, signupPolicy] = await Promise.all([
      requestContext(req, fallback).handlers.oauth.listProviders(),
      requestContext(req, fallback).handlers.auth.getSignupPolicy(),
    ]);
    sendSuccessResponse(res, {
      providers,
      ...signupPolicy,
    });
  });

  for (const socialProvider of SOCIAL_OAUTH_PROVIDERS) {
    router.get(
      `/${socialProvider}`,
      validateQuery(initiateGithubAuthQuerySchema),
      async (req: TypedRequest<{ query: typeof initiateGithubAuthQuerySchema }>, res: Response) => {
        const { redirect, accountType, action } = req.query;

        if (action === UserAuthenticationEmailProviderAction.Connect) {
          let userId = requestContext(req, fallback).user?.userId;

          if (!userId) {
            const refreshToken = getRefreshTokenFromCookie(req);
            if (refreshToken) {
              try {
                const result = await requestContext(req, fallback).handlers.auth.refreshSession(
                  refreshToken,
                  requestContext(req, fallback).userAgent,
                  requestContext(req, fallback).ipAddress,
                  requestContext(req, fallback).requestBaseUrl
                );
                setRefreshTokenCookie(res, result.refreshToken);
                const claims = await requestContext(req, fallback).grant.verifyToken(
                  result.accessToken
                );
                userId = claims.sub;
              } catch {
                // Invalid or expired refresh token
              }
            }
          }

          if (!userId) {
            const frontendUrl = config.security.frontendUrl;
            const locale = requestContext(req, fallback).locale || 'en';
            res.redirect(`${frontendUrl}/${locale}/auth/login?error=authenticationRequired`);
            return;
          }

          const authorizationUrl = await handleOAuthConnectFlow(
            requestContext(req, fallback),
            socialProvider,
            redirect,
            userId
          );
          res.redirect(authorizationUrl);
          return;
        }

        if (redirect && !validateRedirectUrl(redirect)) {
          requestContext(req, fallback).requestLogger.warn({
            msg: 'OAuth initiate - invalid redirect URL',
            provider: socialProvider,
            redirectUrl: redirect,
            expectedOrigin: new URL(config.security.frontendUrl).origin,
          });
          const result = await requestContext(req, fallback).handlers.oauth.initiateAuth(
            socialProvider,
            {}
          );
          res.redirect(result.authorizationUrl);
          return;
        }

        const result = await requestContext(req, fallback).handlers.oauth.initiateAuth(
          socialProvider,
          {
            redirectUrl: redirect,
            accountType,
            action: action || UserAuthenticationEmailProviderAction.Login,
          }
        );

        res.redirect(result.authorizationUrl);
      }
    );

    router.get(
      `/${socialProvider}/callback`,
      validateQuery(handleGithubCallbackQuerySchema),
      async (
        req: TypedRequest<{ query: typeof handleGithubCallbackQuerySchema }>,
        res: Response
      ) => {
        const { error, error_description, code, state } = req.query;
        const locale = requestContext(req, fallback).locale || 'en';
        const frontendUrl = config.security.frontendUrl;

        if (error) {
          if (state && typeof state === 'string') {
            const storedState = await requestContext(req, fallback).handlers.oauth.getStoredState(
              state
            );
            if (
              storedState?.redirectUrl &&
              isCliRedirectUrl(storedState.redirectUrl, frontendUrl)
            ) {
              const url = new URL(storedState.redirectUrl);
              url.searchParams.set('error', 'oauthError');
              if (error_description) url.searchParams.set('error_description', error_description);
              res.redirect(url.toString());
              return;
            }
          }
          handleOAuthError(
            requestContext(req, fallback).requestLogger,
            res,
            error,
            error_description,
            locale,
            socialProvider
          );
          return;
        }

        let cliRedirectUrl: string | null = null;
        if (state && typeof state === 'string') {
          const storedState = await requestContext(req, fallback).handlers.oauth.getStoredState(
            state
          );
          if (storedState?.redirectUrl && isCliRedirectUrl(storedState.redirectUrl, frontendUrl)) {
            cliRedirectUrl = storedState.redirectUrl;
          }
        }

        try {
          const oauthResult = await requestContext(req, fallback).handlers.oauth.handleCallback(
            socialProvider,
            code,
            state
          );

          const handledConnect = await handleOAuthCallbackConnect(
            requestContext(req, fallback),
            res,
            oauthResult
          );
          if (handledConnect) {
            return;
          }

          const loginResult = await handleOAuthCallbackAuth(
            requestContext(req, fallback),
            oauthResult
          );

          const isCli = isCliRedirectUrl(oauthResult.redirectUrl, frontendUrl);

          if (oauthResult.redirectUrl && isCli) {
            const oneTimeCode = await requestContext(
              req,
              fallback
            ).handlers.oauth.storeCliCallbackPayload(
              {
                accessToken: loginResult.accessToken,
                refreshToken: loginResult.refreshToken,
                accounts: loginResult.accounts,
              },
              requestContext(req, fallback).requestLogger
            );
            const url = new URL(oauthResult.redirectUrl);
            url.searchParams.set('code', oneTimeCode);
            res.redirect(url.toString());
            return;
          }

          setRefreshTokenCookie(res, loginResult.refreshToken);

          if (loginResult.requiresMfaStepUp) {
            const returnTo = buildAuthRedirectUrl(oauthResult, locale);
            res.redirect(
              `${frontendUrl}/${locale}/auth/mfa?mode=challenge&returnTo=${encodeURIComponent(returnTo)}`
            );
          } else {
            res.redirect(buildAuthRedirectUrl(oauthResult, locale));
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          const errorCode = determineErrorCode(err);
          requestContext(req, fallback).requestLogger.error({
            msg: 'Error handling OAuth callback',
            provider: socialProvider,
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
  }

  router.post(
    '/cli-callback',
    validateBody(cliCallbackRequestSchema),
    async (req: TypedRequest<{ body: typeof cliCallbackRequestSchema }>, res: Response) => {
      const { code } = req.body;
      const payload = await requestContext(req, fallback).handlers.oauth.consumeCliCallbackCode(
        code,
        requestContext(req, fallback).requestLogger
      );
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

      const result = await requestContext(req, fallback).handlers.apiKeys.exchangeApiKey(
        {
          input: {
            clientId,
            clientSecret,
            scope,
          },
        },
        requestContext(req, fallback).requestBaseUrl
      );

      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/is-authorized',
    authenticateRestRoute,
    validate({ body: isAuthorizedRequestSchema }),
    async (req: TypedRequest<{ body: typeof isAuthorizedRequestSchema }>, res: Response) => {
      const result = await requestContext(req, fallback).handlers.auth.isAuthorized(req.body);
      sendSuccessResponse(res, result);
    }
  );

  // Project OAuth (tenant app flow): authorize entry and callback
  router.get(
    '/project/authorize',
    validateQuery(projectAuthorizeQuerySchema),
    // codeql[js/missing-rate-limiting]: AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS + global rateLimitMiddleware in create-app; CodeQL cannot see app-level middleware from this route factory.
    async (req: TypedRequest<{ query: typeof projectAuthorizeQuerySchema }>, res: Response) => {
      const {
        client_id,
        redirect_uri,
        state,
        provider,
        scope,
        locale,
        response_type,
        code_challenge,
        code_challenge_method,
      } = req.query;
      const result = await requestContext(
        req,
        fallback
      ).handlers.projectOAuth.initiateProjectAuthorize(
        client_id,
        redirect_uri,
        state,
        provider as ProjectOAuthProvider,
        scope,
        locale,
        {
          responseType: response_type,
          codeChallenge: code_challenge,
          codeChallengeMethod: code_challenge_method,
        }
      );
      res.redirect(result.authorizationUrl);
    }
  );

  router.post(
    '/project/email/request',
    validateBody(projectEmailRequestSchema),
    // codeql[js/missing-rate-limiting]: AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS + global rateLimitMiddleware in create-app; CodeQL cannot see app-level middleware from this route factory.
    async (req: TypedRequest<{ body: typeof projectEmailRequestSchema }>, res: Response) => {
      const { client_id, redirect_uri, state, email, client_state, scope, locale } = req.body;
      await requestContext(req, fallback).handlers.projectOAuth.requestProjectEmailMagicLink(
        client_id,
        redirect_uri,
        state,
        email,
        client_state,
        scope,
        locale,
        requestContext(req, fallback).requestBaseUrl
      );
      res.status(202).send();
    }
  );

  router.post(
    '/project/password',
    validateBody(projectPasswordSignInSchema),
    // codeql[js/missing-rate-limiting]: AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS + global rateLimitMiddleware in create-app; CodeQL cannot see app-level middleware from this route factory.
    async (req: TypedRequest<{ body: typeof projectPasswordSignInSchema }>, res: Response) => {
      const { client_id, redirect_uri, state, email, password, locale } = req.body;
      const result = await requestContext(
        req,
        fallback
      ).handlers.projectOAuth.signInWithProjectPassword({
        clientId: client_id,
        redirectUri: redirect_uri,
        stateId: state,
        email,
        password,
        locale,
      });
      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/project/password/mfa',
    validateBody(projectPasswordMfaSchema),
    // codeql[js/missing-rate-limiting]: AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS + global rateLimitMiddleware in create-app; CodeQL cannot see app-level middleware from this route factory.
    async (req: TypedRequest<{ body: typeof projectPasswordMfaSchema }>, res: Response) => {
      const { mfa_token, code, method } = req.body;
      const { redirectUrl } = await requestContext(
        req,
        fallback
      ).handlers.projectOAuth.verifyProjectPasswordMfa({
        mfaToken: mfa_token,
        code,
        method,
      });
      sendSuccessResponse(res, { status: 'authenticated', redirectUrl });
    }
  );

  router.post(
    '/project/password/forgot',
    validateBody(projectPasswordResetRequestSchema),
    // codeql[js/missing-rate-limiting]: AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS + global rateLimitMiddleware in create-app; CodeQL cannot see app-level middleware from this route factory. The per-address limit is in ProjectPasswordResetService.
    async (
      req: TypedRequest<{ body: typeof projectPasswordResetRequestSchema }>,
      res: Response
    ) => {
      const { client_id, redirect_uri, email, state, locale } = req.body;
      await requestContext(req, fallback).handlers.projectPasswordReset.requestReset({
        clientId: client_id,
        redirectUri: redirect_uri,
        email,
        stateId: state,
        locale: locale ?? requestContext(req, fallback).locale,
      });
      // One body for every address: it does not say whether a member exists or an email went out.
      sendSuccessResponse(res, { status: 'reset_requested' });
    }
  );

  router.post(
    '/project/password/reset',
    validateBody(projectPasswordResetCompleteSchema),
    // codeql[js/missing-rate-limiting]: AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS + global rateLimitMiddleware in create-app; CodeQL cannot see app-level middleware from this route factory.
    async (
      req: TypedRequest<{ body: typeof projectPasswordResetCompleteSchema }>,
      res: Response
    ) => {
      const { client_id, redirect_uri, token, password } = req.body;
      await requestContext(req, fallback).handlers.projectPasswordReset.completeReset({
        clientId: client_id,
        redirectUri: redirect_uri,
        token,
        password,
      });
      sendSuccessResponse(res, { status: 'password_reset' });
    }
  );

  router.get(
    '/project/callback',
    validateQuery(projectCallbackQuerySchema),
    async (req: TypedRequest<{ query: typeof projectCallbackQuerySchema }>, res: Response) => {
      const { code, token, state } = req.query;
      try {
        const result =
          code != null && code !== ''
            ? await requestContext(req, fallback).handlers.projectOAuth.handleProjectCallback(
                code,
                state
              )
            : await requestContext(
                req,
                fallback
              ).handlers.projectOAuth.handleProjectCallbackEmailFlow(token!, state);
        if ('consentUrl' in result) {
          res.redirect(result.consentUrl);
          return;
        }
        throw new AuthenticationError('Consent required');
      } catch (err) {
        const errorCode = determineErrorCode(err);
        const frontendUrl = config.security.frontendUrl;
        const {
          code: _code,
          token: _token,
          state,
          client_id: queryClientId,
          redirect_uri: queryRedirectUri,
        } = req.query as {
          code?: string;
          token?: string;
          state?: string;
          client_id?: string;
          redirect_uri?: string;
        };
        let entryParams: {
          clientId: string;
          redirectUri: string;
          state: string;
          locale?: string;
        } | null = null;
        if (queryClientId && queryRedirectUri) {
          entryParams = {
            clientId: queryClientId,
            redirectUri: queryRedirectUri,
            state: state ?? '',
          };
        } else if (state) {
          entryParams = await requestContext(
            req,
            fallback
          ).handlers.projectOAuth.getProjectEntryParamsFromState(state);
        }
        const locale =
          entryParams?.locale &&
          (config.i18n.supportedLocales as readonly string[]).includes(entryParams.locale)
            ? (entryParams.locale as 'en' | 'de')
            : config.i18n.defaultLocale;
        if (entryParams) {
          const entryUrl = new URL(`${frontendUrl}/${locale}/auth/project`);
          entryUrl.searchParams.set('client_id', entryParams.clientId);
          entryUrl.searchParams.set('redirect_uri', entryParams.redirectUri);
          entryUrl.searchParams.set('state', entryParams.state);
          entryUrl.searchParams.set('error', errorCode);
          res.redirect(entryUrl.toString());
        } else {
          res.redirect(
            `${frontendUrl}/${locale}/auth/login?error=${encodeURIComponent(errorCode)}`
          );
        }
      }
    }
  );

  router.get(
    '/project/app-info',
    validateQuery(projectAppInfoQuerySchema),
    async (req: TypedRequest<{ query: typeof projectAppInfoQuerySchema }>, res: Response) => {
      const { client_id, scope, redirect_uri } = req.query;
      const info = await requestContext(
        req,
        fallback
      ).handlers.projectOAuth.getProjectAppPublicInfo(client_id, scope, redirect_uri);
      sendSuccessResponse(res, info);
    }
  );

  router.get(
    '/project/consent-info',
    validateQuery(projectConsentInfoQuerySchema),
    // codeql[js/missing-rate-limiting]: AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS + global rateLimitMiddleware in create-app; CodeQL cannot see app-level middleware from this route factory.
    async (req: TypedRequest<{ query: typeof projectConsentInfoQuerySchema }>, res: Response) => {
      const { consent_token } = req.query;
      const info = await requestContext(req, fallback).handlers.projectOAuth.getProjectConsentInfo(
        consent_token,
        requestContext(req, fallback).requestLogger
      );
      sendSuccessResponse(res, info);
    }
  );

  router.post(
    '/project/consent/approve',
    validateBody(projectConsentApproveBodySchema),
    // codeql[js/missing-rate-limiting]: AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS + global rateLimitMiddleware in create-app; CodeQL cannot see app-level middleware from this route factory.
    async (req: TypedRequest<{ body: typeof projectConsentApproveBodySchema }>, res: Response) => {
      const { consent_token } = req.body;
      const { redirectUrl } = await requestContext(
        req,
        fallback
      ).handlers.projectOAuth.handleProjectConsentApprove(consent_token);
      sendSuccessResponse(res, { redirectUrl });
    }
  );

  router.post(
    '/project/token',
    validate({ body: projectTokenBodySchema }),
    // codeql[js/missing-rate-limiting]: AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS + global rateLimitMiddleware in create-app; CodeQL cannot see app-level middleware from this route factory.
    async (req: TypedRequest<{ body: typeof projectTokenBodySchema }>, res: Response) => {
      const result = await requestContext(req, fallback).handlers.projectOAuth.handleProjectToken({
        grantType: req.body.grant_type,
        clientId: req.body.client_id,
        redirectUri: req.body.redirect_uri,
        code: req.body.code,
        codeVerifier: req.body.code_verifier,
        refreshToken: req.body.refresh_token,
        clientSecret: req.body.client_secret,
        userAgent: requestContext(req, fallback).userAgent,
        ipAddress: requestContext(req, fallback).ipAddress,
      });
      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/project/consent/deny',
    validateBody(projectConsentDenyBodySchema),
    // codeql[js/missing-rate-limiting]: AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS + global rateLimitMiddleware in create-app; CodeQL cannot see app-level middleware from this route factory.
    async (req: TypedRequest<{ body: typeof projectConsentDenyBodySchema }>, res: Response) => {
      const { consent_token } = req.body;
      const { redirectUrl } = await requestContext(
        req,
        fallback
      ).handlers.projectOAuth.handleProjectConsentDeny(consent_token);
      sendSuccessResponse(res, { redirectUrl });
    }
  );

  return router;
}
