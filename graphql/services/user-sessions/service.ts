import { randomBytes } from 'crypto';

import { sign, verify, JwtPayload } from 'jsonwebtoken';

import {
  UserSession,
  CreateUserSessionInput,
  Tenant,
  UpdateUserSessionInput,
  GetUserSessionsInput,
  UserSessionPage,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { userSessionAuditLogs } from '@/graphql/repositories/user-sessions/schema';
import {
  JWT_EXPIRATION_MINUTES,
  JWT_SECRET,
  REFRESH_TOKEN_EXPIRATION_DAYS,
} from '@/graphql/resolvers/auth/constants';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, SelectedFields, validateInput, validateOutput } from '../common';

import {
  userSessionSchema,
  createSessionSchema,
  refreshSessionSchema,
  updateUserSessionSchema,
  sessionResultSchema,
  validateAccessTokenSchema,
} from './schemas';

interface CreateSessionResult {
  refreshToken: string;
  accessToken: string;
}

export class UserSessionService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(userSessionAuditLogs, 'userSessionId', user, db);
  }

  private generateRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private getAccessTokenExpirationDate(from: number = Date.now()): Date {
    return new Date(from + JWT_EXPIRATION_MINUTES * 60 * 1000);
  }

  private getRefreshTokenExpirationDate(from: number = Date.now()): Date {
    return new Date(from + REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
  }

  private decodeJwt(jwt: string, ignoreExpiration: boolean = false): JwtPayload {
    const decoded = verify(jwt, JWT_SECRET, { ignoreExpiration });
    if (!decoded) {
      throw new Error('Invalid token');
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
    const scope = decoded.aud as string;

    if (!userId || !scope) {
      throw new Error('Invalid token');
    }

    const [scopeTenant, scopeId] = scope.split(':');

    const session = await this.repositories.userSessionRepository.getLastValidUserSession(
      userId,
      scopeTenant as Tenant,
      scopeId,
      refreshToken
    );

    if (!session) {
      throw new Error('Invalid session');
    }

    return session;
  }

  private async getUserSession(
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
      throw new Error('User session not found');
    }

    return existingUserSessions.userSessions[0];
  }

  public async getUserSessions(
    params: GetUserSessionsInput & SelectedFields<UserSession>,
    transaction?: Transaction
  ): Promise<UserSessionPage> {
    return this.repositories.userSessionRepository.getUserSessions(params, transaction);
  }

  public signSession(session: UserSession): CreateSessionResult {
    const context = 'UserSessionService.signSession';
    const validatedSession = validateInput(userSessionSchema, session, context);
    const { userId, scopeTenant, scopeId } = validatedSession;
    const sub = userId;
    const aud = `${scopeTenant}:${scopeId}`;
    const iat = Math.floor(Date.now() / 1000); // in seconds
    const exp = Math.floor(this.getAccessTokenExpirationDate(Date.now()).getTime() / 1000); // in seconds

    const jwtPayload: JwtPayload = { sub, aud, exp, iat };

    const accessToken = sign(jwtPayload, JWT_SECRET);
    const refreshToken = session.token;

    return validateOutput(sessionResultSchema, { accessToken, refreshToken }, context);
  }

  public async createSession(
    params: Omit<CreateUserSessionInput, 'expiresAt' | 'token' | 'lastUsedAt'>,
    transaction?: Transaction
  ): Promise<CreateSessionResult> {
    const context = 'UserSessionService.createSession';
    const now = Date.now();

    const validatedParams = validateInput(createSessionSchema, params, context);

    const { userId, userAuthenticationMethodId, scopeTenant, scopeId, userAgent, ipAddress } =
      validatedParams;

    const session = await this.repositories.userSessionRepository.createUserSession(
      {
        userId,
        userAuthenticationMethodId,
        scopeTenant,
        scopeId,
        token: this.generateRefreshToken(),
        expiresAt: this.getRefreshTokenExpirationDate(now),
        lastUsedAt: new Date(),
        userAgent,
        ipAddress,
      },
      transaction
    );

    return this.signSession(session);
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
    transaction?: Transaction
  ): Promise<CreateSessionResult | null> {
    const context = 'UserSessionService.refreshSession';
    validateInput(refreshSessionSchema, { accessToken, refreshToken }, context);

    const currentSession = await this.getSessionFromTokens(accessToken, refreshToken, true);

    await this.revokeSession(currentSession.id, transaction);

    return await this.createSession(
      {
        userId: currentSession.userId,
        userAuthenticationMethodId: currentSession.userAuthenticationMethodId,
        scopeTenant: currentSession.scopeTenant,
        scopeId: currentSession.scopeId,
      },
      transaction
    );
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
