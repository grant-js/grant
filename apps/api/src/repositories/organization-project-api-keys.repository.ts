import type {
  AddOrganizationProjectApiKeyParams,
  IOrganizationProjectApiKeyRepository,
  OrganizationProjectApiKeyRow,
} from '@grantjs/core';
import { OrganizationProjectApiKeyModel, organizationProjectApiKeys } from '@grantjs/database';
import { QueryOrganizationProjectApiKeysInput } from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class OrganizationProjectApiKeyRepository
  extends PivotRepository<OrganizationProjectApiKeyModel, OrganizationProjectApiKeyRow>
  implements IOrganizationProjectApiKeyRepository
{
  protected table = organizationProjectApiKeys;
  protected uniqueIndexFields: Array<keyof OrganizationProjectApiKeyModel> = [
    'organizationId',
    'projectId',
    'apiKeyId',
  ];

  protected toEntity(dbPivot: OrganizationProjectApiKeyModel): OrganizationProjectApiKeyRow {
    return dbPivot;
  }

  public async getOrganizationProjectApiKeys(
    params: QueryOrganizationProjectApiKeysInput,
    transaction?: Transaction
  ): Promise<OrganizationProjectApiKeyRow[]> {
    return this.query(params, transaction);
  }

  public async addOrganizationProjectApiKey(
    params: AddOrganizationProjectApiKeyParams,
    transaction?: Transaction
  ): Promise<OrganizationProjectApiKeyRow> {
    return this.add(params, transaction);
  }

  public async clearRole(
    params: { apiKeyId: string; organizationId: string; projectId: string },
    transaction?: Transaction
  ): Promise<OrganizationProjectApiKeyRow> {
    return this.update(params, { organizationRoleId: null, updatedAt: new Date() }, transaction);
  }

  public async getByApiKeyAndOrganizationAndProject(
    apiKeyId: string,
    organizationId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<OrganizationProjectApiKeyRow | null> {
    const rows = await this.getOrganizationProjectApiKeys(
      { apiKeyId, organizationId, projectId },
      transaction
    );
    return rows[0] ?? null;
  }
}
