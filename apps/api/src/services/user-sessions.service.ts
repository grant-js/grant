import { MILLISECONDS_PER_DAY, MILLISECONDS_PER_MINUTE } from '@grantjs/constants';
import { GrantAuth } from '@grantjs/core';
import { DbSchema, userSessionAuditLogs } from '@grantjs/database';
import {
  CreateUserSessionInput,
  GetUserSessionsInput,
  TokenType,
  UpdateUserSessionInput,
  UserSession,
  UserSessionPage,
} from '@grantjs/schema';
import jwt from 'jsonwebtoken';

import { config } from '@/config';
import { AuthenticationError, NotFoundError } from '@/lib/errors';
import { generateRandomBytes } from '@/lib/token.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

import { AuditService, SelectedFields, validateInput, validateOutput } from './common';
import {
  createSessionSchema,
  refreshSessionSchema,
  sessionResultSchema,
  updateUserSessionSchema,
  userSessionSchema,
  validateAccessTokenSchema,
} from './user-sessions.schemas';

import type { JwtPayload } from 'jsonwebtoken';

interface CreateSessionResult {
  refreshToken: string;
  accessToken: string;
}

export class UserSessionService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    readonly user: GrantAuth | null,
    readonly db: DbSchema
  ) {
    super(userSessionAuditLogs, 'userSessionId', user, db);
  }

  private generateRefreshToken(): string {
    return generateRandomBytes(32).toString('base64url');
  }

  private getAccessTokenExpirationDate(from: number = Date.now()): Date {
    return new Date(from + config.jwt.accessTokenExpirationMinutes * MILLISECONDS_PER_MINUTE);
  }

  private getRefreshTokenExpirationDate(from: number = Date.now()): Date {
    return new Date(from + config.jwt.refreshTokenExpirationDays * MILLISECONDS_PER_DAY);
  }

  private decodeJwt(token: string, ignoreExpiration: boolean = false): JwtPayload {
    const decoded = jwt.verify(token, config.jwt.secret, { ignoreExpiration });
    if (!decoded) {
      throw new AuthenticationError('Invalid token', 'errors:auth.invalidToken');
    }
    return decoded as JwtPayload;
  }

  private async getSessionFromTokens(
    accessToken: string,
    refreshToken?: string,
    ignoreExpired: boolean = false
  ): Promise<UserSession> {
    const decoded = this.decodeJwt(accessToken, ignoreExpired);

    const userId = decoded.sub;
    const audience = decoded.aud as string;

    if (!userId || !audience) {
      throw new AuthenticationError('Invalid token', 'errors:auth.invalidToken');
    }

    const session = await this.repositories.userSessionRepository.getLastValidUserSession(
      userId,
      audience,
      refreshToken
    );

    if (!session) {
      throw new AuthenticationError('Invalid session', 'errors:auth.invalidSession');
    }

    return session;
  }

  public async getUserSession(
    userSessionId: string,
    transaction?: Transaction
  ): Promise<UserSession> {
    const existingUserSessions = await this.repositories.userSessionRepository.getUserSessions(
      {
        ids: [userSessionId],
        limit: 1,
      },
      transaction
    );

    if (existingUserSessions.userSessions.length === 0) {
      throw new NotFoundError('User session not found', 'errors:auth.sessionNotFound');
    }

    return existingUserSessions.userSessions[0];
  }

  public async getUserSessions(
    params: GetUserSessionsInput & SelectedFields<UserSession>,
    transaction?: Transaction
  ): Promise<UserSessionPage> {
    return this.repositories.userSessionRepository.getUserSessions(params, transaction);
  }

  public async signSession(
    session: UserSession,
    isVerified: boolean = true
  ): Promise<CreateSessionResult> {
    const context = 'UserSessionService.signSession';
    const validatedSession = validateInput(userSessionSchema, session, context);
    const { userId } = validatedSession;
    const sub = userId;
    const aud = config.app.url;
    const iss = config.app.url;
    const jti = session.id;
    const iat = Math.floor(Date.now() / 1000);
    const exp = Math.floor(this.getAccessTokenExpirationDate(Date.now()).getTime() / 1000);

    const jwtPayload: JwtPayload = {
      sub,
      aud,
      iss,
      exp,
      iat,
      jti,
      type: TokenType.Session,
      isVerified,
    };

    const accessToken = jwt.sign(jwtPayload, config.jwt.secret);
    const refreshToken = session.token;

    return validateOutput(sessionResultSchema, { accessToken, refreshToken }, context);
  }

  public async createSession(
    params: Omit<CreateUserSessionInput, 'expiresAt' | 'token' | 'lastUsedAt'> & {
      isVerified?: boolean;
    },
    transaction?: Transaction
  ): Promise<CreateSessionResult> {
    const context = 'UserSessionService.createSession';
    const now = Date.now();

    const validatedParams = validateInput(createSessionSchema, params, context);

    const { userId, userAuthenticationMethodId, userAgent, ipAddress } = validatedParams;

    const audience = config.app.url;

    const session = await this.repositories.userSessionRepository.createUserSession(
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

    return this.signSession(session, params.isVerified ?? true);
  }

  public async validateAccessToken(accessToken: string): Promise<boolean> {
    const context = 'UserSessionService.validateToken';

    validateInput(validateAccessTokenSchema, { accessToken }, context);

    const session = await this.getSessionFromTokens(accessToken);

    if (!session) {
      return false;
    }

    await this.updateUserSession({
      id: session.id,
      lastUsedAt: new Date(),
    });

    return true;
  }

  public async refreshSession(
    accessToken: string,
    refreshToken: string,
    transaction?: Transaction,
    userAgent?: string | null,
    ipAddress?: string | null,
    isVerified?: boolean
  ): Promise<CreateSessionResult | null> {
    const context = 'UserSessionService.refreshSession';
    validateInput(refreshSessionSchema, { accessToken, refreshToken }, context);

    const currentSession = await this.getSessionFromTokens(accessToken, refreshToken, true);

    const newRefreshToken = this.generateRefreshToken();
    const now = Date.now();

    const finalUserAgent = userAgent ?? currentSession.userAgent ?? null;
    const finalIpAddress = ipAddress ?? currentSession.ipAddress ?? null;

    const refreshedSession = await this.repositories.userSessionRepository.refreshUserSession(
      currentSession.id,
      newRefreshToken,
      this.getRefreshTokenExpirationDate(now),
      new Date(),
      finalUserAgent,
      finalIpAddress,
      transaction
    );

    return this.signSession(refreshedSession, isVerified ?? true);
  }

  public async revokeSession(id: string, transaction?: Transaction): Promise<UserSession> {
    const revokedSession = await this.repositories.userSessionRepository.softDeleteUserSession(
      { id },
      transaction
    );
    return revokedSession;
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

  private async updateUserSession(
    params: UpdateUserSessionInput,
    transaction?: Transaction
  ): Promise<UserSession> {
    const context = 'UserSessionService.updateLastUsed';

    const validatedParams = validateInput(updateUserSessionSchema, params, context);

    const { id, lastUsedAt, userAgent, ipAddress } = validatedParams;

    const currentSession = await this.getUserSession(id, transaction);

    const updatedSession = await this.repositories.userSessionRepository.updateUserSession(
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

    await this.logUpdate(updatedSession.id, oldValues, newValues, metadata, transaction);

    return validateOutput(userSessionSchema, updatedSession, context);
  }
}
