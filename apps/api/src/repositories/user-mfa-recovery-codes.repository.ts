import type {
  IMfaRecoveryCodeStatus,
  IUserMfaRecoveryCodeRecord,
  IUserMfaRecoveryCodeRepository,
} from '@grantjs/core';
import { UserMfaRecoveryCodeModel, userMfaRecoveryCodes } from '@grantjs/database';

import { Transaction } from '@/lib/transaction-manager.lib';

import { EntityRepository, FilterCondition } from './common/EntityRepository';

export class UserMfaRecoveryCodeRepository
  extends EntityRepository<UserMfaRecoveryCodeModel, UserMfaRecoveryCodeModel>
  implements IUserMfaRecoveryCodeRepository
{
  protected table = userMfaRecoveryCodes;
  protected schemaName = 'userMfaRecoveryCodes' as const;
  protected searchFields: Array<keyof UserMfaRecoveryCodeModel> = ['codeHash'];
  protected defaultSortField: keyof UserMfaRecoveryCodeModel = 'createdAt';
  protected relations = {};

  public async listCodes(
    userId: string,
    transaction?: Transaction
  ): Promise<IUserMfaRecoveryCodeRecord[]> {
    const filters: FilterCondition<UserMfaRecoveryCodeModel>[] = [
      { field: 'userId', operator: 'eq', value: userId },
      { field: 'isUsed', operator: 'eq', value: false },
      { field: 'deletedAt', operator: 'isNull', value: undefined },
    ];
    const result = await this.query({ filters, limit: -1, unbounded: true }, transaction);
    return result.items;
  }

  public async getRecoveryCodeStatus(
    userId: string,
    transaction?: Transaction
  ): Promise<IMfaRecoveryCodeStatus> {
    const filters: FilterCondition<UserMfaRecoveryCodeModel>[] = [
      { field: 'userId', operator: 'eq', value: userId },
      { field: 'isUsed', operator: 'eq', value: false },
      { field: 'deletedAt', operator: 'isNull', value: undefined },
    ];
    const result = await this.query({ filters, limit: -1, unbounded: true }, transaction);
    const items = result.items;
    if (items.length === 0) {
      return { activeCount: 0, lastGeneratedAt: null };
    }
    let lastGeneratedAt = items[0]!.createdAt;
    for (const row of items) {
      if (row.createdAt > lastGeneratedAt) {
        lastGeneratedAt = row.createdAt;
      }
    }
    return { activeCount: items.length, lastGeneratedAt };
  }

  public async createCodes(
    userId: string,
    codeHashes: string[],
    userMfaFactorId?: string | null,
    transaction?: Transaction
  ): Promise<IUserMfaRecoveryCodeRecord[]> {
    const created: IUserMfaRecoveryCodeRecord[] = [];
    for (const codeHash of codeHashes) {
      const item = await this.create(
        { userId, userMfaFactorId: userMfaFactorId ?? null, codeHash, isUsed: false },
        transaction
      );
      created.push(item);
    }
    return created;
  }

  public async softDeleteAllCodes(userId: string, transaction?: Transaction): Promise<void> {
    const existing = await this.listCodes(userId, transaction);
    for (const code of existing) {
      await this.softDelete({ id: code.id }, transaction);
    }
  }

  public async markCodeUsed(
    codeId: string,
    transaction?: Transaction
  ): Promise<IUserMfaRecoveryCodeRecord> {
    return this.update({ id: codeId, input: { isUsed: true, usedAt: new Date() } }, transaction);
  }
}
