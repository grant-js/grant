import type { IUserMfaFactorRecord, IUserMfaFactorRepository } from '@grantjs/core';
import { UserMfaFactorModel, userMfaFactors } from '@grantjs/database';

import { NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';

import { BaseUpdateArgs, EntityRepository, FilterCondition } from './common/EntityRepository';

export class UserMfaFactorRepository
  extends EntityRepository<UserMfaFactorModel, UserMfaFactorModel>
  implements IUserMfaFactorRepository
{
  protected table = userMfaFactors;
  protected schemaName = 'userMfaFactors' as const;
  protected searchFields: Array<keyof UserMfaFactorModel> = ['type'];
  protected defaultSortField: keyof UserMfaFactorModel = 'createdAt';
  protected relations = {};

  public async listFactors(
    userId: string,
    transaction?: Transaction
  ): Promise<IUserMfaFactorRecord[]> {
    const filters: FilterCondition<UserMfaFactorModel>[] = [
      { field: 'userId', operator: 'eq', value: userId },
    ];
    const result = await this.query({ filters, limit: -1, unbounded: true }, transaction);
    return result.items;
  }

  public async getPrimaryFactor(
    userId: string,
    transaction?: Transaction
  ): Promise<IUserMfaFactorRecord | null> {
    const filters: FilterCondition<UserMfaFactorModel>[] = [
      { field: 'userId', operator: 'eq', value: userId },
      { field: 'isPrimary', operator: 'eq', value: true },
    ];
    const result = await this.query({ filters, limit: 1 }, transaction);
    return result.items[0] ?? null;
  }

  public async upsertPrimaryFactor(
    params: {
      userId: string;
      type: string;
      encryptedSecret: string;
      secretIv: string;
      secretTag: string;
      isEnabled: boolean;
    },
    transaction?: Transaction
  ): Promise<IUserMfaFactorRecord> {
    const existing = await this.getPrimaryFactor(params.userId, transaction);
    if (!existing) {
      return this.create(
        {
          ...params,
          isPrimary: true,
        },
        transaction
      );
    }
    const updateArgs: BaseUpdateArgs = {
      id: existing.id,
      input: {
        type: params.type,
        encryptedSecret: params.encryptedSecret,
        secretIv: params.secretIv,
        secretTag: params.secretTag,
        isEnabled: params.isEnabled,
      },
    };
    return this.update(updateArgs, transaction);
  }

  public async enableFactor(
    factorId: string,
    transaction?: Transaction
  ): Promise<IUserMfaFactorRecord> {
    return this.update(
      {
        id: factorId,
        input: { isEnabled: true },
      },
      transaction
    );
  }

  public async touchFactorLastUsed(
    factorId: string,
    transaction?: Transaction
  ): Promise<IUserMfaFactorRecord> {
    return this.update(
      {
        id: factorId,
        input: { lastUsedAt: new Date() },
      },
      transaction
    );
  }

  public async setPrimaryFactor(
    factorId: string,
    userId: string,
    transaction?: Transaction
  ): Promise<IUserMfaFactorRecord> {
    const factors = await this.listFactors(userId, transaction);
    for (const factor of factors) {
      await this.update(
        {
          id: factor.id,
          input: { isPrimary: factor.id === factorId },
        },
        transaction
      );
    }
    const updated = await this.query({ ids: [factorId], limit: 1 }, transaction);
    return updated.items[0] as IUserMfaFactorRecord;
  }

  public async removeFactor(
    factorId: string,
    userId: string,
    transaction?: Transaction
  ): Promise<IUserMfaFactorRecord> {
    const current = await this.query({ ids: [factorId], limit: 1 }, transaction);
    const factor = current.items[0] as IUserMfaFactorRecord | undefined;
    if (!factor || factor.userId !== userId) {
      throw new NotFoundError('MFA factor', factorId);
    }
    return this.softDelete({ id: factorId }, transaction);
  }
}
