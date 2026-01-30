import { OrganizationProjectApiKeyModel, organizationProjectApiKeys } from '@grantjs/database';
import {
  AddOrganizationProjectApiKeyInput,
  OrganizationProjectApiKey,
  QueryOrganizationProjectApiKeysInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';

import { PivotRepository } from './common/PivotRepository';

export class OrganizationProjectApiKeyRepository extends PivotRepository<
  OrganizationProjectApiKeyModel,
  OrganizationProjectApiKey
> {
  protected table = organizationProjectApiKeys;
  protected uniqueIndexFields: Array<keyof OrganizationProjectApiKeyModel> = [
    'organizationId',
    'projectId',
    'apiKeyId',
  ];

  protected toEntity(dbPivot: OrganizationProjectApiKeyModel): OrganizationProjectApiKey {
    return dbPivot;
  }

  public async getOrganizationProjectApiKeys(
    params: QueryOrganizationProjectApiKeysInput,
    transaction?: Transaction
  ): Promise<OrganizationProjectApiKey[]> {
    return this.query(params, transaction);
  }

  public async addOrganizationProjectApiKey(
    params: AddOrganizationProjectApiKeyInput,
    transaction?: Transaction
  ): Promise<OrganizationProjectApiKey> {
    return this.add(params, transaction);
  }

  public async getByApiKeyAndOrganizationAndProject(
    apiKeyId: string,
    organizationId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<OrganizationProjectApiKey | null> {
    const rows = await this.getOrganizationProjectApiKeys(
      { apiKeyId, organizationId, projectId },
      transaction
    );
    return rows[0] ?? null;
  }
}
