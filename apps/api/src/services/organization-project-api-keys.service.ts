import type {
  IAuditLogger,
  IOrganizationProjectApiKeyRepository,
  IOrganizationProjectApiKeyService,
  IOrganizationProjectRepository,
  IOrganizationRoleRepository,
  OrganizationProjectApiKeyRow,
} from '@grantjs/core';

import { BadRequestError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addOrganizationProjectApiKeyParamsSchema,
  getOrganizationProjectApiKeysParamsSchema,
  organizationProjectApiKeySchema,
} from './organization-project-api-keys.schemas';

export class OrganizationProjectApiKeyService implements IOrganizationProjectApiKeyService {
  constructor(
    private readonly organizationProjectRepository: IOrganizationProjectRepository,
    private readonly organizationRoleRepository: IOrganizationRoleRepository,
    private readonly organizationProjectApiKeyRepository: IOrganizationProjectApiKeyRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async ensureOrganizationProjectExists(
    organizationId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<void> {
    const organizationProjects = await this.organizationProjectRepository.getOrganizationProjects(
      { organizationId },
      transaction
    );
    const organizationProject = organizationProjects.find((op) => op.projectId === projectId);
    if (!organizationProject) {
      throw new NotFoundError('OrganizationProject');
    }
  }

  private async ensureOrganizationHasRole(
    organizationId: string,
    roleId: string,
    transaction?: Transaction
  ): Promise<void> {
    const organizationRoles = await this.organizationRoleRepository.getOrganizationRoles(
      { organizationId },
      transaction
    );
    if (!organizationRoles.some((or) => or.roleId === roleId)) {
      throw new BadRequestError('Role is not assigned to this organization');
    }
  }

  public async getOrganizationProjectApiKeys(
    params: { organizationId?: string; projectId?: string; apiKeyId?: string },
    transaction?: Transaction
  ): Promise<OrganizationProjectApiKeyRow[]> {
    const context = 'OrganizationProjectApiKeyService.getOrganizationProjectApiKeys';
    const validated = validateInput(getOrganizationProjectApiKeysParamsSchema, params, context);
    const result = await this.organizationProjectApiKeyRepository.getOrganizationProjectApiKeys(
      validated,
      transaction
    );
    return validateOutput(
      createDynamicSingleSchema(organizationProjectApiKeySchema).array(),
      result,
      context
    );
  }

  public async addOrganizationProjectApiKey(
    params: {
      organizationId: string;
      projectId: string;
      apiKeyId: string;
      organizationRoleId: string | null;
    },
    transaction?: Transaction
  ): Promise<OrganizationProjectApiKeyRow> {
    const context = 'OrganizationProjectApiKeyService.addOrganizationProjectApiKey';
    const validated = validateInput(addOrganizationProjectApiKeyParamsSchema, params, context);
    const { organizationId, projectId, organizationRoleId } = validated;

    await this.ensureOrganizationProjectExists(organizationId, projectId, transaction);
    if (organizationRoleId) {
      await this.ensureOrganizationHasRole(organizationId, organizationRoleId, transaction);
    }

    const pivot = await this.organizationProjectApiKeyRepository.addOrganizationProjectApiKey(
      validated,
      transaction
    );

    const newValues = {
      organizationId,
      projectId,
      apiKeyId: validated.apiKeyId,
      organizationRoleId,
    };
    const metadata = { context };
    await this.audit.logCreate(pivot.id, newValues, metadata, transaction);

    return validateOutput(
      createDynamicSingleSchema(organizationProjectApiKeySchema),
      pivot,
      context
    );
  }

  public async clearOrganizationProjectApiKeyRole(
    params: { apiKeyId: string; organizationId: string; projectId: string },
    transaction?: Transaction
  ): Promise<OrganizationProjectApiKeyRow> {
    const context = 'OrganizationProjectApiKeyService.clearOrganizationProjectApiKeyRole';
    const { apiKeyId, organizationId, projectId } = params;
    const current =
      await this.organizationProjectApiKeyRepository.getByApiKeyAndOrganizationAndProject(
        apiKeyId,
        organizationId,
        projectId,
        transaction
      );
    if (current === null) {
      throw new NotFoundError('ApiKey', apiKeyId);
    }
    if (current.organizationRoleId === null) {
      return current;
    }

    const cleared = await this.organizationProjectApiKeyRepository.clearRole(params, transaction);
    await this.audit.logUpdate(
      current.id,
      { organizationRoleId: current.organizationRoleId },
      { organizationRoleId: null },
      { context },
      transaction
    );
    return validateOutput(
      createDynamicSingleSchema(organizationProjectApiKeySchema),
      cleared,
      context
    );
  }

  public async getByApiKeyAndOrganizationAndProject(
    apiKeyId: string,
    organizationId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<OrganizationProjectApiKeyRow | null> {
    const context = 'OrganizationProjectApiKeyService.getByApiKeyAndOrganizationAndProject';
    const result =
      await this.organizationProjectApiKeyRepository.getByApiKeyAndOrganizationAndProject(
        apiKeyId,
        organizationId,
        projectId,
        transaction
      );
    if (result === null) {
      return null;
    }
    return validateOutput(
      createDynamicSingleSchema(organizationProjectApiKeySchema),
      result,
      context
    );
  }
}
