import { eq, and, lt, gte } from 'drizzle-orm';

import { UserSession, SessionScope } from '@/graphql/generated/types';

import { EntityRepository, RelationsConfig } from '../common/EntityRepository';

import { userSessions, UserSessionModel } from './schema';

export class UserSessionRepository extends EntityRepository<UserSessionModel, UserSession> {
  protected table = userSessions;
  protected schemaName = 'users' as const; // TODO: Add userSessions to main schema
  protected searchFields: Array<keyof UserSessionModel> = ['token', 'scope'];
  protected defaultSortField: keyof UserSessionModel = 'createdAt';
  protected relations: RelationsConfig<UserSession> = {};

  // Custom methods specific to sessions
  async findByToken(token: string): Promise<UserSessionModel | null> {
    const result = await this.db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, token))
      .limit(1);

    return result[0] || null;
  }

  async findValidByToken(token: string): Promise<UserSessionModel | null> {
    const now = new Date();
    const result = await this.db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.token, token), gte(userSessions.expiresAt, now)))
      .limit(1);

    return result[0] || null;
  }

  async findByUserId(userId: string): Promise<UserSessionModel[]> {
    return this.db.select().from(userSessions).where(eq(userSessions.userId, userId));
  }

  async findByUserAndScope(
    userId: string,
    scope: SessionScope,
    scopeId: string
  ): Promise<UserSessionModel[]> {
    return this.db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.scope, scope),
          eq(userSessions.scopeId, scopeId)
        )
      );
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.db
      .update(userSessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(userSessions.id, id));
  }

  async deleteByToken(token: string): Promise<void> {
    await this.db.delete(userSessions).where(eq(userSessions.token, token));
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.db.delete(userSessions).where(eq(userSessions.userId, userId));
  }

  async deleteExpiredSessions(): Promise<void> {
    const now = new Date();
    await this.db.delete(userSessions).where(lt(userSessions.expiresAt, now));
  }

  async deleteUserSessionsExceptCurrent(userId: string, currentSessionId: string): Promise<void> {
    await this.db
      .delete(userSessions)
      .where(and(eq(userSessions.userId, userId), eq(userSessions.id, currentSessionId)));
  }
}
