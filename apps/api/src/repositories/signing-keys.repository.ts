import { signingKeys, type NewSigningKeyModel, type SigningKeyModel } from '@grantjs/database';
import { SigningKey, SortOrder } from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import {
  EntityRepository,
  type Filter,
  type FilterCondition,
  type RelationsConfig,
} from '@/repositories/common';

import type { ISigningKeyRepository } from '@grantjs/core';

export interface SigningKeyPublic {
  kid: string;
  publicKeyPem: string;
}

export class SigningKeyRepository
  extends EntityRepository<SigningKeyModel, SigningKey>
  implements ISigningKeyRepository
{
  protected table = signingKeys;
  protected schemaName = 'signingKeys' as const;
  protected searchFields: Array<keyof SigningKeyModel> = ['kid'];
  protected defaultSortField: keyof SigningKeyModel = 'createdAt';
  protected relations: RelationsConfig<SigningKey> = {};

  protected get softDeletes(): boolean {
    return false;
  }

  private scopeFilters(scopeTenant: string, scopeId: string): FilterCondition<SigningKeyModel>[] {
    return [
      { field: 'scopeTenant', operator: 'eq', value: scopeTenant },
      { field: 'scopeId', operator: 'eq', value: scopeId },
    ];
  }

  private activeFilter(): FilterCondition<SigningKeyModel> {
    return { field: 'active', operator: 'eq', value: true };
  }

  async getByScope(
    scopeTenant: string,
    scopeId: string,
    transaction?: Transaction
  ): Promise<SigningKeyModel | null> {
    const filters: Filter<SigningKeyModel> = [
      ...this.scopeFilters(scopeTenant, scopeId),
      this.activeFilter(),
    ];
    const result = await this.query({ filters, limit: 1 }, transaction);
    return (result.items[0] as SigningKeyModel) ?? null;
  }

  async getPublicKeyPemByKid(kid: string, transaction?: Transaction): Promise<string | null> {
    const result = await this.query(
      { filters: [{ field: 'kid', operator: 'eq', value: kid }], limit: 1 },
      transaction
    );
    const row = result.items[0] as SigningKeyModel | undefined;
    return row?.publicKeyPem ?? null;
  }

  async getActivePublicKeys(transaction?: Transaction): Promise<SigningKeyPublic[]> {
    const result = await this.query({ filters: this.activeFilter(), limit: -1 }, transaction);
    return result.items.map((row) => ({
      kid: row.kid,
      publicKeyPem: row.publicKeyPem ?? '',
    }));
  }

  async getPublicKeysForJwks(
    retentionCutoff: Date,
    transaction?: Transaction
  ): Promise<SigningKeyPublic[]> {
    const filters: Filter<SigningKeyModel> = {
      logic: 'OR',
      conditions: [
        this.activeFilter(),
        { field: 'rotatedAt', operator: 'gte', value: retentionCutoff },
      ],
    };
    const result = await this.query({ filters, limit: -1 }, transaction);
    return result.items.map((row) => ({
      kid: row.kid,
      publicKeyPem: row.publicKeyPem ?? '',
    }));
  }

  async getPublicKeysForJwksByScope(
    scopeTenant: string,
    scopeId: string,
    retentionCutoff: Date,
    transaction?: Transaction
  ): Promise<SigningKeyPublic[]> {
    const filters: Filter<SigningKeyModel> = [
      ...this.scopeFilters(scopeTenant, scopeId),
      {
        logic: 'OR',
        conditions: [
          this.activeFilter(),
          { field: 'rotatedAt', operator: 'gte', value: retentionCutoff },
        ],
      },
    ];
    const result = await this.query({ filters, limit: -1 }, transaction);
    return result.items.map((row) => ({
      kid: row.kid,
      publicKeyPem: row.publicKeyPem ?? '',
    }));
  }

  async listByScope(
    scopeTenant: string,
    scopeId: string,
    options?: { limit?: number },
    transaction?: Transaction
  ): Promise<SigningKey[]> {
    const limit = options?.limit ?? 20;
    const result = await this.query(
      {
        filters: this.scopeFilters(scopeTenant, scopeId),
        sort: { field: 'createdAt', order: SortOrder.Desc },
        limit,
      },
      transaction
    );
    return result.items;
  }

  async createSigningKey(
    data: NewSigningKeyModel,
    transaction?: Transaction
  ): Promise<SigningKeyModel> {
    const row = await this.create(data, transaction);
    return row as SigningKeyModel;
  }

  async updateSigningKey(
    id: string,
    input: { active?: boolean; rotatedAt?: Date | null },
    transaction?: Transaction
  ): Promise<SigningKey> {
    return this.update({ id, input }, transaction);
  }
}
