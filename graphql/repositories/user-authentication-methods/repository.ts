import { eq, and, isNull } from 'drizzle-orm';

import { UserAuthenticationMethod } from '@/graphql/generated/types';

import { EntityRepository, RelationsConfig } from '../common/EntityRepository';
import { users } from '../users/schema';

import { userAuthenticationMethods, UserAuthenticationMethodModel } from './schema';

export class UserAuthenticationMethodRepository extends EntityRepository<
  UserAuthenticationMethodModel,
  UserAuthenticationMethod
> {
  protected table = userAuthenticationMethods;
  protected schemaName = 'userAuthenticationMethods' as const;
  protected searchFields: Array<keyof UserAuthenticationMethodModel> = ['provider', 'providerId'];
  protected defaultSortField: keyof UserAuthenticationMethodModel = 'createdAt';
  protected relations: RelationsConfig<UserAuthenticationMethod> = {
    user: {
      field: 'user',
      table: users,
      extract: (v: Array<UserAuthenticationMethod>) =>
        v.map(({ user }: UserAuthenticationMethod) => user),
    },
  };

  // Custom methods specific to authentication methods
  async findByProvider(
    provider: string,
    providerId: string
  ): Promise<UserAuthenticationMethodModel | null> {
    const result = await this.db
      .select()
      .from(userAuthenticationMethods)
      .where(
        and(
          eq(userAuthenticationMethods.provider, provider),
          eq(userAuthenticationMethods.providerId, providerId),
          isNull(userAuthenticationMethods.deletedAt)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  async findByUserId(userId: string): Promise<UserAuthenticationMethodModel[]> {
    return this.db
      .select()
      .from(userAuthenticationMethods)
      .where(
        and(
          eq(userAuthenticationMethods.userId, userId),
          isNull(userAuthenticationMethods.deletedAt)
        )
      );
  }

  async findPrimaryByUserId(userId: string): Promise<UserAuthenticationMethodModel | null> {
    const result = await this.db
      .select()
      .from(userAuthenticationMethods)
      .where(
        and(
          eq(userAuthenticationMethods.userId, userId),
          eq(userAuthenticationMethods.isPrimary, true),
          isNull(userAuthenticationMethods.deletedAt)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  async setPrimary(id: string, userId: string): Promise<void> {
    // First, unset all primary methods for this user
    await this.db
      .update(userAuthenticationMethods)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(
        and(
          eq(userAuthenticationMethods.userId, userId),
          isNull(userAuthenticationMethods.deletedAt)
        )
      );

    // Then set the specified method as primary
    await this.db
      .update(userAuthenticationMethods)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(userAuthenticationMethods.id, id));
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.db
      .update(userAuthenticationMethods)
      .set({ lastUsedAt: new Date(), updatedAt: new Date() })
      .where(eq(userAuthenticationMethods.id, id));
  }

  async verify(id: string): Promise<void> {
    await this.db
      .update(userAuthenticationMethods)
      .set({
        isVerified: true,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userAuthenticationMethods.id, id));
  }
}
