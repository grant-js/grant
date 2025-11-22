import { Response } from 'express';

import { BaseController } from '@/rest/controllers/base.controller';
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
import { TypedRequest } from '@/rest/types';
import { RequestContext } from '@/types';

/**
 * Authentication controller
 * Handles user authentication and session management
 */
export class AuthController extends BaseController {
  constructor(context: RequestContext) {
    super(context);
  }

  /**
   * Login endpoint
   * POST /api/auth/login
   * Body is validated by loginRequestSchema middleware
   */
  async login(req: TypedRequest<{ body: typeof loginRequestSchema }>, res: Response) {
    const { body } = req;
    const { provider, providerId, providerData } = body;

    const result = await this.handlers.accounts.login(
      {
        input: {
          provider,
          providerId,
          providerData,
        },
      },
      this.origin,
      this.context.userAgent,
      this.context.ipAddress
    );

    this.success(res, result);
  }

  /**
   * Register endpoint
   * POST /api/auth/register
   * Body is validated by registerRequestSchema middleware
   * Returns CreateAccountResult with account, accessToken, and refreshToken
   */
  async register(req: TypedRequest<{ body: typeof registerRequestSchema }>, res: Response) {
    const { body } = req;
    const { name, username, type, provider, providerId, providerData } = body;

    const result = await this.handlers.accounts.createAccount(
      {
        name,
        username,
        type,
        provider,
        providerId,
        providerData,
      },
      this.origin,
      this.context.locale,
      this.context.userAgent,
      this.context.ipAddress
    );

    this.success(res, result, 201);
  }

  /**
   * Refresh session endpoint
   * POST /api/auth/refresh
   * Body is validated by refreshSessionRequestSchema middleware
   */
  async refreshSession(
    req: TypedRequest<{ body: typeof refreshSessionRequestSchema }>,
    res: Response
  ) {
    const { accessToken, refreshToken } = req.body;

    const result = await this.handlers.accounts.refreshSession({
      accessToken,
      refreshToken,
    });

    this.success(res, result);
  }

  /**
   * Logout endpoint
   * POST /api/auth/logout
   * Body is validated by logoutRequestSchema middleware
   */
  async logout(req: TypedRequest<{ body: typeof logoutRequestSchema }>, res: Response) {
    this.success(res, { message: 'Logged out successfully' });
  }

  /**
   * Verify email endpoint
   * POST /api/auth/verify-email
   * Body is validated by verifyEmailRequestSchema middleware
   */
  async verifyEmail(req: TypedRequest<{ body: typeof verifyEmailRequestSchema }>, res: Response) {
    const { token } = req.body;

    const result = await this.handlers.accounts.verifyEmail(token, this.context.locale);

    this.success(res, result);
  }

  /**
   * Resend verification email endpoint
   * POST /api/auth/resend-verification
   * Body is validated by resendVerificationRequestSchema middleware
   */
  async resendVerification(
    req: TypedRequest<{ body: typeof resendVerificationRequestSchema }>,
    res: Response
  ) {
    const { email } = req.body;

    const result = await this.handlers.accounts.resendVerificationEmail(email, this.context.locale);

    this.success(res, result);
  }

  /**
   * Request password reset endpoint
   * POST /api/auth/request-password-reset
   * Body is validated by requestPasswordResetRequestSchema middleware
   */
  async requestPasswordReset(
    req: TypedRequest<{ body: typeof requestPasswordResetRequestSchema }>,
    res: Response
  ) {
    const { email } = req.body;

    const result = await this.handlers.accounts.requestPasswordReset(email, this.context.locale);

    this.success(res, result);
  }

  /**
   * Reset password endpoint
   * POST /api/auth/reset-password
   * Body is validated by resetPasswordRequestSchema middleware
   */
  async resetPassword(
    req: TypedRequest<{ body: typeof resetPasswordRequestSchema }>,
    res: Response
  ) {
    const { token, newPassword } = req.body;

    const result = await this.handlers.accounts.resetPassword(
      token,
      newPassword,
      this.context.locale
    );

    this.success(res, result);
  }
}
