import { MILLISECONDS_PER_DAY, MILLISECONDS_PER_MINUTE } from '@grantjs/constants';
import {
  Grant,
  type IAuditLogger,
  type IEventPublisher,
  type IUserSessionRepository,
  type IUserSessionService,
  type SessionSignOptions,
} from '@grantjs/core';
import {
  CreateUserSessionInput,
  GetUserSessionsInput,
  TokenType,
  UpdateUserSessionInput,
  UserSession,
  UserSessionPage,
} from '@grantjs/schema';

import { config } from '@/config';
import { NotFoundError } from '@/lib/errors';
import { generateRandomBytes } from '@/lib/token.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { SelectedFields } from '@/types';

import { validateInput, validateOutput } from './common';
import {
  createSessionSchema,
  sessionResultSchema,
  updateUserSessionSchema,
  userSessionSchema,
} from './user-sessions.schemas';

interface CreateSessionResult {
  refreshToken: string;
  accessToken: string;
}

export class UserSessionService implements IUserSessionService {
  constructor(
    private readonly userSessionRepository: IUserSessionRepository,
    private readonly audit: IAuditLogger,
    private readonly grant: Grant,
    private readonly events: IEventPublisher
  ) {}

  private generateRefreshToken(): string {
    return generateRandomBytes(32).toString('base64url');
  }

  private getAccessTokenExpirationDate(from: number = Date.now()): Date {
    return new Date(from + config.jwt.accessTokenExpirationMinutes * MILLISECONDS_PER_MINUTE);
  }

  private getRefreshTokenExpirationDate(from: number = Date.now()): Date {
    return new Date(from + config.jwt.refreshTokenExpirationDays * MILLISECONDS_PER_DAY);
  }

  public async getUserSession(
    userSessionId: string,
    transaction?: Transaction
  ): Promise<UserSession> {
    const existingUserSessions = await this.userSessionRepository.getUserSessions(
      {
        ids: [userSessionId],
        limit: 1,
      },
      transaction
    );

    if (existingUserSessions.userSessions.length === 0) {
      throw new NotFoundError('UserSession');
    }

    return existingUserSessions.userSessions[0];
  }

  public async getUserSessions(
    params: GetUserSessionsInput & SelectedFields<UserSession>,
    transaction?: Transaction
  ): Promise<UserSessionPage> {
    return this.userSessionRepository.getUserSessions(params, transaction);
  }

  public async signSession(
    session: UserSession,
    isVerified: boolean = true,
    mfaVerified: boolean = false,
    issuerBaseUrl?: string,
    signOptions?: SessionSignOptions
  ): Promise<CreateSessionResult> {
    const context = 'UserSessionService.signSession';
    const validatedSession = validateInput(userSessionSchema, session, context);
    const { userId } = validatedSession;
    const sub = userId;
    const base = (issuerBaseUrl ?? config.app.url).replace(/\/$/, '');
    const aud = base;
    const iss = base;
    const jti = session.id;
    const iat = Math.floor(Date.now() / 1000);
    const exp = Math.floor(this.getAccessTokenExpirationDate(Date.now()).getTime() / 1000);

    const sessionRow = session as unknown as {
      createdAt?: Date | string | null;
      mfaVerifiedAt?: Date | string | null;
    };
    const createdAtMs = sessionRow.createdAt
      ? new Date(sessionRow.createdAt).getTime()
      : Date.now();
    const authTimeSeconds =
      signOptions?.authTimeSeconds ?? Math.max(0, Math.floor(createdAtMs / 1000));

    const mfaAuthTimeSeconds = mfaVerified
      ? sessionRow.mfaVerifiedAt
        ? Math.max(0, Math.floor(new Date(sessionRow.mfaVerifiedAt).getTime() / 1000))
        : Math.floor(Date.now() / 1000)
      : undefined;

    const amr = mfaVerified ? (['pwd', 'otp'] as const) : (['pwd'] as const);
    const acr = mfaVerified ? 'aal2' : 'aal1';

    const jwtPayload = {
      sub,
      aud,
      iss,
      exp,
      iat,
      jti,
      type: TokenType.Session,
      isVerified,
      mfaVerified,
      amr: [...amr],
      acr,
      auth_time: authTimeSeconds,
      ...(mfaAuthTimeSeconds !== undefined ? { mfa_auth_time: mfaAuthTimeSeconds } : {}),
    };

    const accessToken = await this.grant.signSessionToken(jwtPayload);
    const refreshToken = session.token;

    return validateOutput(sessionResultSchema, { accessToken, refreshToken }, context);
  }

  public async createSession(
    params: Omit<CreateUserSessionInput, 'expiresAt' | 'token' | 'lastUsedAt'> & {
      isVerified?: boolean;
    },
    transaction?: Transaction,
    issuerBaseUrl?: string
  ): Promise<CreateSessionResult> {
    const context = 'UserSessionService.createSession';
    const now = Date.now();

    const validatedParams = validateInput(createSessionSchema, params, context);

    const { userId, userAuthenticationMethodId, userAgent, ipAddress } = validatedParams;

    const base = (issuerBaseUrl ?? config.app.url).replace(/\/$/, '');
    const audience = base;

    const session = await this.userSessionRepository.createUserSession(
      {
        userId,
        userAuthenticationMethodId,
        audience,
        token: this.generateRefreshToken(),
        expiresAt: this.getRefreshTokenExpirationDate(now),
        lastUsedAt: new Date(),
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
      },
      transaction
    );

    return this.signSession(
      session,
      params.isVerified ?? true,
      Boolean((session as unknown as { mfaVerifiedAt?: Date | null }).mfaVerifiedAt),
      issuerBaseUrl
    );
  }

  /**
   * Refresh session using only the refresh token (e.g. from HttpOnly cookie).
   * Used by the web app when no access token is available or for cookie-based refresh.
   */
  public async refreshSessionByRefreshToken(
    refreshToken: string,
    transaction?: Transaction,
    userAgent?: string | null,
    ipAddress?: string | null,
    isVerified?: boolean,
    mfaVerified?: boolean,
    issuerBaseUrl?: string
  ): Promise<CreateSessionResult | null> {
    const session = await this.userSessionRepository.getSessionByRefreshToken(
      refreshToken,
      transaction
    );

    if (!session) {
      return null;
    }

    const newRefreshToken = this.generateRefreshToken();
    const now = Date.now();
    const finalUserAgent = userAgent ?? session.userAgent ?? null;
    const finalIpAddress = ipAddress ?? session.ipAddress ?? null;

    const refreshedSession = await this.userSessionRepository.refreshUserSession(
      session.id,
      newRefreshToken,
      this.getRefreshTokenExpirationDate(now),
      new Date(),
      finalUserAgent,
      finalIpAddress,
      transaction
    );

    return this.signSession(
      refreshedSession,
      isVerified ??
        (refreshedSession as unknown as { emailVerified?: boolean }).emailVerified ??
        true,
      mfaVerified ??
        Boolean((refreshedSession as unknown as { mfaVerifiedAt?: Date | null }).mfaVerifiedAt),
      issuerBaseUrl
    );
  }

  public async revokeSession(id: string, transaction?: Transaction): Promise<UserSession> {
    const revokedSession = await this.userSessionRepository.softDeleteUserSession(
      { id },
      transaction
    );
    await this.events.publish(
      {
        type: 'user.session_revoked',
        subjectUserId: revokedSession.userId,
        aggregate: { kind: 'userSession', id: revokedSession.id },
        data: {
          before: {
            id: revokedSession.id,
            userId: revokedSession.userId,
          },
        },
      },
      transaction
    );
    return revokedSession;
  }

  /**
   * Revoke the session identified by the refresh token (e.g. from cookie).
   * Used by POST /api/auth/logout when no access token is available.
   */
  public async revokeSessionByRefreshToken(
    refreshToken: string,
    transaction?: Transaction
  ): Promise<boolean> {
    const session = await this.userSessionRepository.getSessionByRefreshToken(
      refreshToken,
      transaction
    );
    if (!session) return false;
    await this.revokeSession(session.id, transaction);
    return true;
  }

  public async refreshSessionLastUsed(
    sessionId: string,
    transaction?: Transaction
  ): Promise<UserSession> {
    return this.updateUserSession(
      {
        id: sessionId,
        lastUsedAt: new Date(),
      },
      transaction
    );
  }

  public async markMfaVerified(sessionId: string, transaction?: Transaction): Promise<UserSession> {
    return this.userSessionRepository.updateUserSession(
      { id: sessionId, mfaVerifiedAt: new Date() } as unknown as UpdateUserSessionInput,
      transaction
    );
  }

  private async updateUserSession(
    params: UpdateUserSessionInput,
    transaction?: Transaction
  ): Promise<UserSession> {
    const context = 'UserSessionService.updateLastUsed';

    const validatedParams = validateInput(updateUserSessionSchema, params, context);

    const { id, lastUsedAt, userAgent, ipAddress } = validatedParams;

    const currentSession = await this.getUserSession(id, transaction);

    const updatedSession = await this.userSessionRepository.updateUserSession(
      { id, lastUsedAt, userAgent, ipAddress },
      transaction
    );

    const oldValues = {
      ...currentSession,
    };

    const newValues = {
      ...updatedSession,
    };

    const metadata = {
      context,
    };

    await this.audit.logUpdate(updatedSession.id, oldValues, newValues, metadata, transaction);

    return validateOutput(userSessionSchema, updatedSession, context);
  }
}
